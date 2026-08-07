import { NextResponse } from "next/server";
import { pusherServer } from "@/lib/pusher-server";

// Read-only diagnostic: reports whether server-side Pusher env vars are
// present, whether the client/server key+cluster pairs actually match
// (a common source of "everything looks configured but nothing
// arrives" — two different Pusher apps/clusters on each side), and
// whether an actual trigger() call succeeds against Pusher's API. No
// secrets are exposed — PUSHER_SECRET/PUSHER_APP_ID are boolean-only;
// KEY/CLUSTER are not sensitive in Pusher's model (the "key" is the
// public app key, safe client-side by design).
export async function GET() {
  const serverKey = process.env.PUSHER_KEY ?? null;
  const serverCluster = process.env.PUSHER_CLUSTER ?? null;
  const clientKey = process.env.NEXT_PUBLIC_PUSHER_KEY ?? null;
  const clientCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? null;

  const envCheck = {
    PUSHER_APP_ID_set: Boolean(process.env.PUSHER_APP_ID),
    PUSHER_SECRET_set: Boolean(process.env.PUSHER_SECRET),
    PUSHER_KEY: serverKey,
    PUSHER_CLUSTER: serverCluster,
    NEXT_PUBLIC_PUSHER_KEY: clientKey,
    NEXT_PUBLIC_PUSHER_CLUSTER: clientCluster,
    keysMatch: serverKey !== null && serverKey === clientKey,
    clustersMatch: serverCluster !== null && serverCluster === clientCluster,
  };

  if (!pusherServer) {
    return NextResponse.json({ serverConfigured: false, envCheck });
  }

  try {
    await pusherServer.trigger("diag-channel", "diag-event", { ts: Date.now() });
    return NextResponse.json({ serverConfigured: true, triggerOk: true, envCheck });
  } catch (err) {
    return NextResponse.json({
      serverConfigured: true,
      triggerOk: false,
      error: err instanceof Error ? err.message : String(err),
      envCheck,
    });
  }
}
