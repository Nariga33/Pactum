import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";

const CHANNEL_NAME_PATTERN = /^private-channel-(.+)$/;

// Authorizes a browser's subscription to a channel's private Pusher
// channel: only members of that Channel (and only within their own
// tenant) may subscribe.
export async function POST(request: NextRequest) {
  if (!pusherServer) {
    return NextResponse.json({ error: "Realtime not configured" }, { status: 503 });
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const socketId = String(formData.get("socket_id") ?? "");
  const channelName = String(formData.get("channel_name") ?? "");

  const match = CHANNEL_NAME_PATTERN.exec(channelName);
  if (!socketId || !match) {
    return NextResponse.json({ error: "Invalid channel" }, { status: 403 });
  }
  const channelId = match[1];

  const membership = await prisma.channelMember.findUnique({
    where: { userId_channelId: { userId: session.user.id, channelId } },
    include: { channel: true },
  });

  if (!membership || membership.channel.organizationId !== session.user.organizationId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authResponse = pusherServer.authorizeChannel(socketId, channelName);
  return NextResponse.json(authResponse);
}
