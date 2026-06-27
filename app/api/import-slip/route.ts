import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

const PROMPT = `อ่านใบจ่ายเงินเดือนนี้ทั้งใบ แล้วแตกเป็น JSON array ตาม format ด้านล่าง ตอบเฉพาะ JSON array เท่านั้น

ให้ดึงข้อมูล 2 ส่วน:
1. คอลัมน์ "รายการเงินได้" (ฝั่งขวา) — income ทุกรายการ
2. คอลัมน์ "รายการหักเงิน" (ฝั่งซ้าย) — expense ทุกรายการที่มีจำนวนเงิน

format แต่ละรายการ:
{"label":"ชื่อรายการ","amount":ตัวเลขไม่มีcomma,"type":"income"หรือ"expense","category":"...","date":"YYYY-MM-DD"}

date = วันที่ 1 ของเดือนในสลิป (แปลง พ.ศ.→ค.ศ. ลบ 543)

category mapping (income):
- เงินเดือน/ค่าจ้าง → salary
- ค่าล่วงเวลา → ot
- รายได้อื่น → income_other

category mapping (expense / รายการหัก):
- ทุกรายการในคอลัมน์หักเงิน → slip_deduction
  (ภาษี, กองทุน, ฌาปนกิจ, สร., สอ., เงินกู้, ทุกอย่างที่หักจากสลิป)`

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString("base64")
  const mimeType = file.type || "image/jpeg"

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemma-4-26b-a4b-it:free",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
        ],
      }],
    }),
  })

  const json = await res.json()
  console.log("openrouter_raw:", JSON.stringify(json).slice(0, 500))
  const text: string = json.choices?.[0]?.message?.content ?? ""

  const cleaned = text.replace(/```(?:json)?\n?/g, "").trim()
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) return NextResponse.json({ error: "parse_failed", raw: text }, { status: 422 })

  try {
    return NextResponse.json({ items: JSON.parse(match[0]) })
  } catch {
    return NextResponse.json({ error: "parse_failed", raw: text }, { status: 422 })
  }
}
