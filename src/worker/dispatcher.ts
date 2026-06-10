let wakeWorker: (() => void) | undefined;

export function configureDispatcher(wake: () => void): void {
  wakeWorker = wake;
}

export function wakeDispatcher(): void {
  wakeWorker?.();
}
