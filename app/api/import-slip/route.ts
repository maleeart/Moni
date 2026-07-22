import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { getUserData } from "@/lib/github"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

interface SlipItem { label: string; amount: number; type: "income" | "expense"; category: string; date: string }

const PROMPT = `อ่านใบจ่ายเงินเดือนนี้ทั้งใบ แล้วแตกเป็น JSON array ตาม format ด้านล่าง ตอบเฉพาะ JSON array เท่านั้น

ให้ดึงข้อมูล 2 ส่วน:
1. คอลัมน์ "รายการเงินได้" (ฝั่งขวา) — income ทุกรายการ
2. คอลัมน์ "รายการหักเงิน" (ฝั่งซ้าย) — expense ทุกรายการที่มีจำนวนเงิน

format แต่ละรายการ:
{"label":"ชื่อรายการ","amount":ตัวเลขไม่มีcomma,"type":"income"หรือ"expense","category":"...","date":"YYYY-MM-DD"}

กฎการอ่าน label (สำคัญที่สุด — ห้ามผิด):
- คัดลอกข้อความ "ตามที่พิมพ์อยู่จริง" ทีละตัวอักษร รวมจุด เว้นวรรค ตัวเลข และวงเล็บ
- ห้ามขยายตัวย่อ ห้ามแปล ห้ามแก้คำสะกด ห้ามเดาคำที่คุ้นเคย
  เช่น เห็น "สอ.ครูฯ" ให้ตอบ "สอ.ครูฯ" ไม่ใช่ "สหกรณ์ออมทรัพย์ครู"
- ห้ามรวมหลายบรรทัดเป็นรายการเดียว และห้ามแตกรายการเดียวเป็นหลายบรรทัด
- อ่าน label จากบรรทัดเดียวกับจำนวนเงินเสมอ อย่าหยิบ label จากบรรทัดข้างเคียง
- ถ้าตัวอักษรบางตัวอ่านไม่ออก ให้ใส่เท่าที่เห็นจริง ห้ามเติมคำเอง
- amount = ตัวเลขบนบรรทัดนั้นเท่านั้น ไม่ใช่ยอดสะสม/ยอดคงเหลือ
- ข้ามบรรทัดที่เป็นยอดรวม (รวมเงินได้, รวมรายการหัก, เงินสุทธิ, ยอดยกมา)

date = วันที่ 1 ของเดือนในสลิป (แปลง พ.ศ.→ค.ศ. ลบ 543)

category mapping (income):
- เงินเดือน/ค่าจ้าง → salary
- ค่าล่วงเวลา → ot
- รายได้อื่น → income_other

category mapping (expense / รายการหัก):
- ทุกรายการในคอลัมน์หักเงิน → slip_deduction
  (ภาษี, กองทุน, ฌาปนกิจ, สร., สอ., เงินกู้, ทุกอย่างที่หักจากสลิป)`

// Structured Outputs — constrains supporting models to valid JSON at decode time,
// instead of hoping the model obeys "answer with only JSON" in prose.
const SLIP_SCHEMA = {
  type: "json_schema",
  json_schema: {
    name: "slip_items",
    strict: true,
    schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              amount: { type: "number" },
              type: { type: "string", enum: ["income", "expense"] },
              category: { type: "string" },
              date: { type: "string" },
            },
            required: ["label", "amount", "type", "category", "date"],
            additionalProperties: false,
          },
        },
      },
      required: ["items"],
      additionalProperties: false,
    },
  },
}

function extractItems(text: string): unknown[] | null {
  try {
    const parsed = JSON.parse(text)
    const items = Array.isArray(parsed) ? parsed : parsed.items
    if (Array.isArray(items)) return items
  } catch { /* fall through to loose extraction below */ }

  // Fallback for models that ignore response_format and wrap JSON in prose/fences.
  const cleaned = text.replace(/```(?:json)?\n?/g, "").trim()
  const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    const items = Array.isArray(parsed) ? parsed : parsed.items
    return Array.isArray(items) ? items : null
  } catch {
    return null
  }
}

async function callSlipModel(base64: string, mimeType: string, useSchema: boolean) {
  const body: Record<string, unknown> = {
    model: process.env.SLIP_MODEL || "google/gemma-4-26b-a4b-it:free",
    temperature: 0,   // OCR must not be sampled — same slip, same answer
    messages: [{
      role: "user",
      content: [
        { type: "text", text: PROMPT },
        { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
      ],
    }],
  }
  if (useSchema) body.response_format = SLIP_SCHEMA

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  const json = await res.json()
  const text: string = json.choices?.[0]?.message?.content ?? ""
  if (json.error) return { items: null, text }

  return { items: extractItems(text), text }
}

function levenshtein(a: string, b: string): number {
  if (!a.length) return b.length
  if (!b.length) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1])
    }
    prev = cur
  }
  return prev[b.length]
}

// ponytail: fixed 30%-of-length edit-distance ceiling for "same recurring line item, OCR
// misread it slightly" — tighten/loosen this ratio if real slips start producing bad snaps
function closestKnownLabel(label: string, known: Set<string>): string {
  if (known.has(label)) return label
  let best: string | null = null
  let bestDist = Infinity
  for (const candidate of known) {
    const d = levenshtein(label, candidate)
    if (d < bestDist) { bestDist = d; best = candidate }
  }
  if (!best) return label
  const threshold = Math.max(1, Math.floor(Math.max(label.length, best.length) * 0.3))
  return bestDist <= threshold ? best : label
}

// Payslip line items repeat almost verbatim every month. Snap each freshly-OCR'd label to the
// closest label the user already saved under the same income/expense side, so a one-off
// misread ("สอ.ครฯ") gets corrected to what it actually was last time ("สอ.ครูฯ") instead of
// creating a new near-duplicate label. Matched by type only (not category) — users re-file
// slip deductions into more specific categories (credit_card, saving, ...) after import, so
// restricting to the slip_deduction category alone would miss most of their real history.
async function reconcileLabels(items: SlipItem[], email: string): Promise<SlipItem[]> {
  const { data } = await getUserData(email)
  const incomeLabels = new Set<string>()
  const expenseLabels = new Set<string>()
  for (const t of data.transactions) {
    (t.type === "income" ? incomeLabels : expenseLabels).add(t.label)
  }
  if (!incomeLabels.size && !expenseLabels.size) return items // first slip ever — nothing to compare against

  return items.map(item => ({
    ...item,
    label: closestKnownLabel(item.label, item.type === "income" ? incomeLabels : expenseLabels),
  }))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const form = await req.formData()
  const file = form.get("file") as File
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const base64 = Buffer.from(bytes).toString("base64")
  const mimeType = file.type || "image/jpeg"

  let result = await callSlipModel(base64, mimeType, true)
  // ponytail: one retry without response_format, for providers that reject/ignore it — covers
  // both a rejected schema request and a one-off flaky parse, no backoff loop needed for this volume
  if (!result.items) result = await callSlipModel(base64, mimeType, false)

  if (!result.items) return NextResponse.json({ error: "parse_failed", raw: result.text }, { status: 422 })

  const items = await reconcileLabels(result.items as SlipItem[], session.email)
  return NextResponse.json({ items })
}
