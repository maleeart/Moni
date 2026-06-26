import { NextRequest, NextResponse } from "next/server"
import { getSession, userPath } from "@/lib/auth"
import { getFile, putFile } from "@/lib/github"
import { Transaction, UserData } from "@/lib/types"
import { randomUUID } from "crypto"

async function getUserData(email: string): Promise<{ data: UserData; sha?: string }> {
  const path = userPath(email)
  const file = await getFile(path)
  if (!file) return { data: { transactions: [], budgets: {} } }
  return { data: file.content as UserData, sha: file.sha }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const month = searchParams.get("month") // "2026-06"

  const { data } = await getUserData(session.email)
  let txs = data.transactions
  if (month) txs = txs.filter((t) => t.date.startsWith(month))
  txs = txs.sort((a, b) => b.date.localeCompare(a.date))

  return NextResponse.json({ transactions: txs, budgets: data.budgets })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const path = userPath(session.email)
  const { data, sha } = await getUserData(session.email)

  const tx: Transaction = {
    id: randomUUID(),
    date: body.date,
    type: body.type,
    category: body.category,
    label: body.label,
    amount: Number(body.amount),
    note: body.note || "",
  }
  data.transactions.push(tx)
  await putFile(path, data, sha)
  return NextResponse.json({ ok: true, transaction: tx })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  const path = userPath(session.email)
  const { data, sha } = await getUserData(session.email)

  data.transactions = data.transactions.filter((t) => t.id !== id)
  await putFile(path, data, sha)
  return NextResponse.json({ ok: true })
}
