import { EventEmitter } from 'events';
import { config } from '../config';
import {
  getDelivery,
  claimPendingDeliveries,
  reapStaleInProgressDeliveries,
  updateDeliveryExhausted,
  updateDeliveryFailed,
  updateDeliveryForRetry,
  updateDeliverySuccess
} from '../models/delivery';
import { createAttempt } from '../models/deliveryAttempt';
import { getEvent } from '../models/event';
import { getSubscription } from '../models/subscription';
import type { Delivery } from '../types';
import { buildSignatureHeader } from '../signing/hmac';
import { getNextAttemptAt, isRetryableStatus } from './retry';

export class DeliveryWorker {
  private emitter = new EventEmitter();
  private running = false;
  private loopPromise: Promise<void> | null = null;
  private inFlight = 0;
  private activeControllers = new Set<AbortController>();

  start(): void {
    if (this.running) return;
    this.running = true;
    this.loopPromise = this.loop();
  }

  wake(): void {
    this.emitter.emit('wake');
  }

  async stop(): Promise<void> {
    this.running = false;
    this.wake();

    const stoppedCleanly = await this.waitForLoop(10_000);
    if (!stoppedCleanly) {
      for (const controller of this.activeControllers) {
        controller.abort();
      }
      await this.loopPromise;
    }
  }

  private async waitForLoop(timeoutMs: number): Promise<boolean> {
    if (!this.loopPromise) return true;

    let timeout: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timeout = setTimeout(() => resolve('timeout'), timeoutMs);
    });

    const result = await Promise.race([this.loopPromise.then(() => 'stopped' as const), timeoutPromise]);
    if (timeout) clearTimeout(timeout);
    return result === 'stopped';
  }

  private async loop(): Promise<void> {
    while (this.running) {
      reapStaleInProgressDeliveries(config.worker.inProgressTimeoutSeconds);
      const deliveries = claimPendingDeliveries(config.worker.batchSize);
      if (deliveries.length === 0) {
        await this.sleepOrWake(config.worker.pollIntervalMs);
        continue;
      }

      await this.processWithLimit(deliveries, config.worker.concurrency);
    }
  }

  private async sleepOrWake(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.emitter.off('wake', onWake);
        resolve();
      };
      const onWake = () => done();
      const timer = setTimeout(done, ms);
      this.emitter.once('wake', onWake);
    });
  }

  private async processWithLimit(deliveries: Delivery[], limit: number): Promise<void> {
    let index = 0;
    const workers = Array.from({ length: Math.min(limit, deliveries.length) }, async () => {
      while (index < deliveries.length) {
        const delivery = deliveries[index++];
        await this.processDelivery(delivery);
      }
    });
    await Promise.allSettled(workers);
  }

  async processDelivery(claimedDelivery: Delivery): Promise<void> {
    this.inFlight += 1;
    let responseStatus: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;
    let permanentFailure = false;
    const started = Date.now();

    const current = getDelivery(claimedDelivery.id) ?? claimedDelivery;
    const attemptNumber = current.attemptCount + 1;

    try {
      const event = getEvent(current.eventId);
      const subscription = getSubscription(current.subscriptionId);

      if (!event || !subscription || !subscription.active) {
        errorMessage = !event ? 'Event missing' : !subscription ? 'Subscription missing' : 'Subscription deactivated';
        permanentFailure = true;
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const body = JSON.stringify({
        id: event.id,
        eventType: event.eventType,
        payload: event.payload,
        timestamp
      });

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-ID': event.id,
        'X-Webhook-Timestamp': String(timestamp)
      };
      if (subscription.secret) {
        headers['X-Webhook-Signature'] = buildSignatureHeader(body, timestamp, subscription.secret);
      }

      const controller = new AbortController();
      this.activeControllers.add(controller);
      const timeout = setTimeout(() => controller.abort(), config.delivery.timeoutMs);
      try {
        const response = await fetch(subscription.url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal
        });
        responseStatus = response.status;
        responseBody = (await response.text()).slice(0, 1024);
      } finally {
        clearTimeout(timeout);
        this.activeControllers.delete(controller);
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      createAttempt({
        deliveryId: current.id,
        attemptNumber,
        responseStatus,
        responseBody,
        errorMessage,
        durationMs: Date.now() - started
      });

      this.updateDeliveryAfterAttempt(current, attemptNumber, responseStatus, errorMessage, permanentFailure);
      this.inFlight -= 1;
    }
  }

  private updateDeliveryAfterAttempt(
    delivery: Delivery,
    attemptNumber: number,
    statusCode: number | null,
    errorMessage: string | null,
    permanentFailure: boolean
  ): void {
    if (permanentFailure) {
      updateDeliveryFailed(delivery.id, attemptNumber);
      return;
    }

    if (statusCode !== null && statusCode >= 200 && statusCode < 300) {
      updateDeliverySuccess(delivery.id);
      return;
    }

    const retryable = errorMessage !== null || isRetryableStatus(statusCode);
    if (!retryable) {
      updateDeliveryFailed(delivery.id, attemptNumber);
      return;
    }

    if (attemptNumber >= delivery.maxAttempts) {
      updateDeliveryExhausted(delivery.id, attemptNumber);
      return;
    }

    updateDeliveryForRetry(delivery.id, attemptNumber, getNextAttemptAt(attemptNumber));
  }
}
