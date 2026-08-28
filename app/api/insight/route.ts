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

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "missing_api_key", insight: "Missing OPENROUTER_API_KEY environment variable" }, { status: 400 })
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.SLIP_MODEL || "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
    }),
  })

  const json = await res.json()
  if (json.error) {
    const isRateLimit = json.error.code === 429
    const errorMsg = typeof json.error === "object" && json.error
      ? (json.error.message || JSON.stringify(json.error))
      : String(json.error)
    return NextResponse.json(
      { error: isRateLimit ? "rate_limit" : "api_error", insight: `OpenRouter Error: ${errorMsg}` },
      { status: isRateLimit ? 429 : 500 }
    )
  }
  const text = json.choices?.[0]?.message?.content ?? ""
  return NextResponse.json({ insight: text })
}
