import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { updateUserData } from "@/lib/github"
import { Transaction } from "@/lib/types"
import { randomUUID } from "crypto"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { month } = await req.json() // "YYYY-MM"
  if (!month) return NextResponse.json({ error: "month required" }, { status: 400 })

  let added = 0
  let already = false

  await updateUserData(session.email, (data) => {
    const applied = data.recurringApplied ?? []
    if (applied.includes(month)) {
      already = true
      return
    }

    const bills = (data.recurring ?? []).filter(b => b.active)
    if (!bills.length) {
      data.recurringApplied = [...applied, month]
      return
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
    added = newTxs.length
  })

  if (already) return NextResponse.json({ added: 0, already: true })
  return NextResponse.json({ added })
}
