import { NextRequest, NextResponse } from "next/server"
import { getSession, userPath } from "@/lib/auth"
import { getFile, putFile } from "@/lib/github"
import { UserData, Goal } from "@/lib/types"
import { randomUUID } from "crypto"

async function getUserData(email: string) {
  const path = userPath(email)
  const file = await getFile(path)
  if (!file) return { data: { transactions: [], budgets: {}, goals: [], recurring: [] } as UserData, sha: undefined }
  return { data: file.content as UserData, sha: file.sha }
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data } = await getUserData(session.email)
  return NextResponse.json({ goals: data.goals ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { data, sha } = await getUserData(session.email)
  if (!data.goals) data.goals = []

  if (body.id) {
    // update
    data.goals = data.goals.map(g => g.id === body.id ? { ...g, ...body } : g)
  } else {
    // create
    const goal: Goal = { id: randomUUID(), name: body.name, target: Number(body.target),
      current: Number(body.current ?? 0), status: body.status ?? "active", emoji: body.emoji ?? "🎯" }
    data.goals.push(goal)
  }
  await putFile(userPath(session.email), data, sha)
  return NextResponse.json({ ok: true, goals: data.goals })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const { data, sha } = await getUserData(session.email)
  data.goals = (data.goals ?? []).filter(g => g.id !== id)
  await putFile(userPath(session.email), data, sha)
  return NextResponse.json({ ok: true })
}
