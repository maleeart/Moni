import { NextResponse } from "next/server"
import { getSession, userPath } from "@/lib/auth"
import { getFile, putFile } from "@/lib/github"
import { UserData } from "@/lib/types"

// One-time migration: tax + provident_fund + fixed(from slip) → slip_deduction
export async function POST() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const path = userPath(session.email)
  const file = await getFile(path)
  if (!file) return NextResponse.json({ error: "No data" }, { status: 404 })

  const data = file.content as UserData
  let migrated = 0

  data.transactions = data.transactions.map(tx => {
    const isSlipFixed = tx.category === "fixed" && tx.note?.includes("imported from")
    if (
      (tx.category as string) === "tax" ||
      (tx.category as string) === "provident_fund" ||
      isSlipFixed
    ) {
      migrated++
      return { ...tx, category: "slip_deduction" as const }
    }
    return tx
  })

  await putFile(path, data, file.sha)
  return NextResponse.json({ ok: true, migrated })
}
