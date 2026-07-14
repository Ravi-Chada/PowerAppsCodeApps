import { useEffect, useState } from 'react';

/**
 * Offline-mode handling for technician status updates (Suggested Extension #2).
 *
 * Technicians often lose connectivity in the field (basements, rural sites).
 * Rather than failing their status updates, the app buffers them in
 * localStorage and replays them automatically once connectivity returns.
 *
 * The queue is intentionally tiny and dependency-free so it works on any
 * device the code app runs on.
 */

const QUEUE_KEY = 'fsd.offlineQueue';

export interface QueuedUpdate {
  /** Stable client id so the same queued action is never applied twice. */
  id: string;
  ticketId: string;
  ticketTitle: string;
  status: number;
  technicianName?: string;
  notes?: string;
  /** ISO timestamp the technician performed the action (for accurate logs). */
  occurredOn: string;
}

function read(): QueuedUpdate[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedUpdate[]) : [];
  } catch {
    return [];
  }
}

function write(queue: QueuedUpdate[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore persistence failures (private mode / sandbox).
  }
}

export function getQueue(): QueuedUpdate[] {
  return read();
}

export function enqueueUpdate(update: Omit<QueuedUpdate, 'id' | 'occurredOn'>): QueuedUpdate {
  const item: QueuedUpdate = {
    ...update,
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    occurredOn: new Date().toISOString(),
  };
  write([...read(), item]);
  return item;
}

/**
 * Replays every queued update via `apply`. Items that succeed are removed;
 * items that fail stay queued for the next attempt. Returns the number of
 * updates successfully flushed.
 */
export async function flushQueue(
  apply: (update: QueuedUpdate) => Promise<void>,
): Promise<number> {
  const queue = read();
  if (queue.length === 0) return 0;
  const remaining: QueuedUpdate[] = [];
  let flushed = 0;
  for (const item of queue) {
    try {
      await apply(item);
      flushed++;
    } catch {
      remaining.push(item);
    }
  }
  write(remaining);
  return flushed;
}

/** Reactively tracks browser connectivity via the online/offline events. */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return online;
}
