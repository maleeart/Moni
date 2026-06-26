import { NextRequest, NextResponse } from "next/server"
import { getSession, userPath } from "@/lib/auth"
import { getFile, putFile } from "@/lib/github"
import { UserData, Transaction } from "@/lib/types"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { month } = await req.json() // "YYYY-MM"
  if (!month) return NextResponse.json({ error: "month required" }, { status: 400 })

  const path = userPath(session.email)
  const file = await getFile(path)
  if (!file) return NextResponse.json({ added: 0 })

  const data = file.content as UserData
  const applied = data.recurringApplied ?? []

  if (applied.includes(month)) return NextResponse.json({ added: 0, already: true })

  const bills = (data.recurring ?? []).filter(b => b.active)
  if (!bills.length) {
    data.recurringApplied = [...applied, month]
    await putFile(path, data, file.sha)
    return NextResponse.json({ added: 0 })
  }

  const [y, m] = month.split("-")
  const newTxs: Transaction[] = bills.map(bill => ({
    id: randomUUID(),
    date: `${y}-${m}-${String(bill.dayOfMonth).padStart(2, "0")}`,
    type: "expense",
    category: bill.category,
    label: bill.label,
    amount: bill.amount,
    note: "auto (recurring)",
  }))

  data.transactions.push(...newTxs)
  data.recurringApplied = [...applied, month]
  await putFile(path, data, file.sha)

  return NextResponse.json({ added: newTxs.length })
}
