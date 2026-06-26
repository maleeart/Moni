import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

const PROMPT = `จากใบจ่ายเงินเดือนนี้ แตกรายการเป็น JSON array ตาม format นี้เท่านั้น ไม่มีข้อความอื่น:
[
  {
    "label": "ชื่อรายการ",
    "amount": ตัวเลข (ไม่มี comma),
    "type": "income" หรือ "expense",
    "category": หนึ่งใน ["salary","ot","income_other","tax","provident_fund","fixed"],
    "date": "YYYY-MM-DD" (วันที่ 1 ของเดือนในสลิป แปลง พ.ศ.→ค.ศ. โดยลบ 543)
  }
]

mapping category:
- เงินเดือน/ค่าจ้าง → salary (income)
- ค่าล่วงเวลา → ot (income)
- รายได้อื่นๆ → income_other (income)
- ภาษีหัก ณ ที่จ่าย → tax (expense)
- กองทุนสำรองเลี้ยงชีพ → provident_fund (expense)
- ฌาปนกิจ / สร. / สอ. / เงินกู้ / หักอื่นๆ → fixed (expense)`

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
      model: "google/gemma-4-31b-it:free",
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
