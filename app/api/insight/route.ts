import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  return NextResponse.json({
    insight: "ระบบสรุปสถานะการเงินถูกเปลี่ยนเป็นระบบอัตโนมัติบนหน้าแดชบอร์ดเรียบร้อยแล้ว ไม่มีการใช้งาน Token",
  })
}
