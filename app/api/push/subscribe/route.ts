import { NextRequest, NextResponse } from "next/server"
import { getSession, userPath } from "@/lib/auth"
import { getFile, putFile } from "@/lib/github"
import { UserData } from "@/lib/types"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const sub = await req.json()
  const path = userPath(session.email)
  const file = await getFile(path)
  const data: UserData = file?.content ?? { transactions: [], budgets: {} }
  ;(data as UserData & { pushSub?: object }).pushSub = sub
  await putFile(path, data, file?.sha)
  return NextResponse.json({ ok: true })
}
