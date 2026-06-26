import { NextRequest, NextResponse } from "next/server"
import { getSession, userPath } from "@/lib/auth"
import { getFile } from "@/lib/github"
import webpush from "web-push"

webpush.setVapidDetails(
  "mailto:tuangphetch@gmail.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { title, body } = await req.json()
  const file = await getFile(userPath(session.email))
  const sub = (file?.content as Record<string, unknown>)?.pushSub
  if (!sub) return NextResponse.json({ error: "no subscription" }, { status: 404 })

  await webpush.sendNotification(sub as webpush.PushSubscription, JSON.stringify({ title, body }))
  return NextResponse.json({ ok: true })
}
