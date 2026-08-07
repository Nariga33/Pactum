"use client";

import PusherClient from "pusher-js";

let client: PusherClient | null | undefined;

// Lazily creates a single browser Pusher connection. Returns null when
// NEXT_PUBLIC_PUSHER_KEY isn't configured, so callers can skip
// subscribing instead of crashing.
export function getPusherClient(): PusherClient | null {
  if (client !== undefined) return client;

  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

  client =
    key && cluster
      ? new PusherClient(key, {
          cluster,
          authEndpoint: "/api/pusher/auth",
        })
      : null;

  return client;
}
