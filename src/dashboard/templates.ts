import type { DeliveryWithAttempts, EventRecord, EventWithSummary, Subscription } from '../types';
import { styles } from './styles';

function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

function badge(status: string): string {
  return `<span class="badge ${escapeHtml(status)}">${escapeHtml(status)}</span>`;
}

export function layout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)} - Webhook Dashboard</title>
  <style>${styles}</style>
</head>
<body>
  <nav><a href="/">Subscriptions</a><a href="/events">Events</a></nav>
  <main>${content}</main>
</body>
</html>`;
}

export function subscriptionsPage(subscriptions: Subscription[]): string {
  const rows = subscriptions
    .map(
      (subscription) => `<tr>
        <td class="mono" title="${escapeHtml(subscription.id)}">${shortId(subscription.id)}</td>
        <td class="mono">${escapeHtml(subscription.url)}</td>
        <td>${subscription.eventTypes.map(escapeHtml).join(', ')}</td>
        <td>${subscription.active ? badge('success') : badge('inactive')}</td>
        <td>${escapeHtml(subscription.createdAt)}</td>
        <td>
          <form class="inline" method="post" action="/dashboard/subscriptions/${escapeHtml(subscription.id)}/delete">
            <button class="danger" type="submit">Delete</button>
          </form>
        </td>
      </tr>`
    )
    .join('');

  return layout(
    'Subscriptions',
    `<h1>Subscriptions</h1>
    <section class="panel">
      <form method="post" action="/dashboard/subscriptions">
        <div class="grid">
          <label>Webhook URL<input name="url" required placeholder="http://localhost:4000/webhook"></label>
          <label>Secret<input name="secret" placeholder="optional"></label>
          <label>Event Types<input name="eventTypes" required placeholder="order.created, user.*"></label>
          <button type="submit">Create</button>
        </div>
      </form>
    </section>
    <table>
      <thead><tr><th>ID</th><th>URL</th><th>Event Types</th><th>Status</th><th>Created</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="muted">No subscriptions yet.</td></tr>'}</tbody>
    </table>`
  );
}

export function eventsPage(events: EventWithSummary[], filter = ''): string {
  const rows = events
    .map((event) => {
      const s = event.deliverySummary;
      return `<tr>
        <td><a class="mono" href="/events/${escapeHtml(event.id)}" title="${escapeHtml(event.id)}">${shortId(event.id)}</a></td>
        <td>${escapeHtml(event.eventType)}</td>
        <td>${escapeHtml(event.receivedAt)}</td>
        <td class="summary"><span>success ${s.success}</span><span>pending ${s.pending + s.in_progress}</span><span>failed ${s.failed}</span><span>exhausted ${s.exhausted}</span></td>
      </tr>`;
    })
    .join('');

  return layout(
    'Events',
    `<h1>Events</h1>
    <section class="panel">
      <form method="get" action="/events">
        <div class="grid">
          <label>Event Type<input name="eventType" value="${escapeHtml(filter)}" placeholder="order.created"></label>
          <button type="submit">Filter</button>
          <a class="button secondary" href="/events">Clear</a>
        </div>
      </form>
    </section>
    <table>
      <thead><tr><th>ID</th><th>Event Type</th><th>Received</th><th>Deliveries</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="4" class="muted">No events yet.</td></tr>'}</tbody>
    </table>`
  );
}

export function eventDetailPage(event: EventRecord, deliveries: DeliveryWithAttempts[]): string {
  const rows = deliveries
    .map((delivery) => {
      const attempts = delivery.attempts
        .map(
          (attempt) => `<div class="muted">
            #${attempt.attemptNumber} at ${escapeHtml(attempt.attemptedAt)}
            status=${escapeHtml(attempt.responseStatus ?? 'network')}
            duration=${escapeHtml(attempt.durationMs ?? '-')}ms
            ${attempt.errorMessage ? `error=${escapeHtml(attempt.errorMessage)}` : ''}
          </div>`
        )
        .join('');
      const canRetry = delivery.status === 'failed' || delivery.status === 'exhausted';
      return `<tr>
        <td class="mono">${escapeHtml(delivery.subscriptionUrl)}</td>
        <td>${badge(delivery.status)}</td>
        <td>${delivery.attemptCount}/${delivery.maxAttempts}</td>
        <td>${escapeHtml(delivery.createdAt)}</td>
        <td>${attempts || '<span class="muted">No attempts yet</span>'}</td>
        <td>
          ${
            canRetry
              ? `<form class="inline" method="post" action="/dashboard/deliveries/${escapeHtml(delivery.id)}/retry"><button type="submit">Retry</button></form>`
              : ''
          }
        </td>
      </tr>`;
    })
    .join('');

  return layout(
    event.eventType,
    `<h1>${escapeHtml(event.eventType)}</h1>
    <section class="panel">
      <div><strong>ID:</strong> <span class="mono">${escapeHtml(event.id)}</span></div>
      <div><strong>Received:</strong> ${escapeHtml(event.receivedAt)}</div>
    </section>
    <h2>Payload</h2>
    <pre>${escapeHtml(JSON.stringify(event.payload, null, 2))}</pre>
    <h2>Deliveries</h2>
    <table>
      <thead><tr><th>Subscription URL</th><th>Status</th><th>Attempts</th><th>Created</th><th>Attempt Log</th><th></th></tr></thead>
      <tbody>${rows || '<tr><td colspan="6" class="muted">No matching subscriptions.</td></tr>'}</tbody>
    </table>`
  );
}
