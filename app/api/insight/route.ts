import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { month, totalIncome, totalExpense, balance, categories } = await req.json()

  const catText = categories.map((c: { label: string; amount: number }) =>
    `${c.label}: ฿${c.amount.toLocaleString()}`).join(", ")

  const prompt = `ข้อมูลการเงินเดือน ${month}:
รายรับ ฿${totalIncome.toLocaleString()} | รายจ่าย ฿${totalExpense.toLocaleString()} | คงเหลือ ฿${balance.toLocaleString()}
หมวดรายจ่าย: ${catText}

สรุปสั้นๆ 1-2 ประโยคภาษาไทย เน้นจุดที่น่าสังเกตหรือแนะนำ ห้ามใช้ bullet point`

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemma-4-26b-a4b-it:free",
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const json = await res.json()
  if (json.error?.code === 429) {
    return NextResponse.json({ error: "rate_limit", insight: "" }, { status: 429 })
  }
  const text = json.choices?.[0]?.message?.content ?? ""
  return NextResponse.json({ insight: text })
}
