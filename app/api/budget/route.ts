import { NextRequest, NextResponse } from "next/server"
import { getSession, userPath } from "@/lib/auth"
import { getFile, putFile } from "@/lib/github"
import { UserData, MonthBudget } from "@/lib/types"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { month, budget }: { month: string; budget: MonthBudget } = await req.json()
  const path = userPath(session.email)
  const file = await getFile(path)
  const data: UserData = file ? (file.content as UserData) : { transactions: [], budgets: {} }
  const sha = file?.sha

  data.budgets[month] = budget
  await putFile(path, data, sha)
  return NextResponse.json({ ok: true })
}
