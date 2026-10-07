"use client";

import { useEffect, useState } from "react";

// A single shared minute clock for every event row. Rather than each row owning
// its own timer, all subscribers share one `setInterval` and one current-value
// string. The value is a naive LOCAL wall-clock minute "YYYY-MM-DDTHH:mm" built
// from local getters (NOT toISOString) so it compares directly against the
// itinerary's local displayed times.

type Subscriber = (now: string | null) => void;

const subscribers = new Set<Subscriber>();
let current: string | null = null;
let interval: ReturnType<typeof setInterval> | null = null;

function computeNow(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` +
    `T${p(d.getHours())}:${p(d.getMinutes())}`
  );
}

function tick() {
  current = computeNow();
  for (const sub of subscribers) sub(current);
}

function subscribe(sub: Subscriber): () => void {
  subscribers.add(sub);
  // Start the shared timer on the first subscriber.
  if (interval === null) {
    interval = setInterval(tick, 30000);
  }
  // Hand the new subscriber the current minute immediately so the highlight can
  // appear right after mount, without a direct setState in the effect body.
  current = computeNow();
  sub(current);
  return () => {
    subscribers.delete(sub);
    // Clear the shared timer when the last subscriber leaves.
    if (subscribers.size === 0 && interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  };
}

// Returns the current local minute as "YYYY-MM-DDTHH:mm", or `null` on the
// first (server + initial client) render to avoid an SSR/hydration mismatch —
// the highlight only appears after mount.
export function useNowMinute(): string | null {
  const [now, setNow] = useState<string | null>(null);

  useEffect(() => {
    // Subscribing delivers the current minute immediately (via the callback)
    // and on every shared tick thereafter; cleanup unsubscribes.
    const unsubscribe = subscribe(setNow);
    return unsubscribe;
  }, []);

  return now;
}
