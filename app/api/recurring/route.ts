import { NextRequest, NextResponse } from "next/server"
import { getSession, userPath } from "@/lib/auth"
import { getFile, putFile } from "@/lib/github"
import { UserData, RecurringBill } from "@/lib/types"
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
  return NextResponse.json({ recurring: data.recurring ?? [] })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await req.json()
  const { data, sha } = await getUserData(session.email)
  if (!data.recurring) data.recurring = []

  if (body.id) {
    data.recurring = data.recurring.map(r => r.id === body.id ? { ...r, ...body } : r)
  } else {
    const bill: RecurringBill = { id: randomUUID(), label: body.label, amount: Number(body.amount),
      category: body.category, dayOfMonth: Number(body.dayOfMonth ?? 1), active: true }
    data.recurring.push(bill)
  }
  await putFile(userPath(session.email), data, sha)
  return NextResponse.json({ ok: true, recurring: data.recurring })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const { data, sha } = await getUserData(session.email)
  data.recurring = (data.recurring ?? []).filter(r => r.id !== id)
  await putFile(userPath(session.email), data, sha)
  return NextResponse.json({ ok: true })
}
