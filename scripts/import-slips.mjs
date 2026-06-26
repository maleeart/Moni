/**
 * import-slips.mjs
 * อ่านสลิป EGAT ทุกใบด้วย AI Vision → merge เข้า GitHub data
 *
 * รัน: node scripts/import-slips.mjs
 * ต้องใส่ env:
 *   OPENROUTER_API_KEY=...
 *   GITHUB_TOKEN=...
 *   GITHUB_REPO=maleeart/Moni   (default)
 *   SLIP_DIR="C:/Users/lenovo/Desktop/EGAT Slip"
 */

import fs from "fs"
import path from "path"
import { createHash, randomUUID } from "crypto"
import { createRequire } from "module"
const require = createRequire(import.meta.url)
const pdfParse = require("pdf-parse")

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO = process.env.GITHUB_REPO || "maleeart/Moni"
const SLIP_DIR = process.env.SLIP_DIR || "C:/Users/lenovo/Desktop/EGAT Slip"
const EMAIL = "tuangphetch@gmail.com"

if (!OPENROUTER_API_KEY || !GITHUB_TOKEN) {
  console.error("❌ ต้องใส่ OPENROUTER_API_KEY และ GITHUB_TOKEN")
  process.exit(1)
}

// user data path = sha256(email).slice(0,16)
const userHash = createHash("sha256").update(EMAIL).digest("hex").slice(0, 16)
const DATA_PATH = `data/${userHash}.json`
console.log(`👤 User: ${EMAIL} → ${DATA_PATH}`)

// --- GitHub helpers ---
async function ghGet(path) {
  const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json" }
  })
  if (r.status === 404) return null
  const j = await r.json()
  return { content: JSON.parse(Buffer.from(j.content, "base64").toString()), sha: j.sha }
}

async function ghPut(path, data, sha) {
  const content = Buffer.from(JSON.stringify(data, null, 2)).toString("base64")
  const r = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ message: `seed: import EGAT slips`, content, ...(sha ? { sha } : {}) })
  })
  return r.ok
}

// --- AI Vision ---
const PROMPT = `อ่านใบจ่ายเงินเดือนนี้ทั้งใบ แล้วแตกเป็น JSON array ตาม format ด้านล่าง ตอบเฉพาะ JSON array เท่านั้น

ให้ดึงข้อมูล 2 ส่วน:
1. คอลัมน์ "รายการเงินได้" — income ทุกรายการ
2. คอลัมน์ "รายการหักเงิน" — expense ทุกรายการที่มีจำนวนเงิน

format แต่ละรายการ:
{"label":"ชื่อรายการ","amount":ตัวเลขไม่มีcomma,"type":"income"หรือ"expense","category":"...","date":"YYYY-MM-DD"}

date = วันที่ 1 ของเดือนในสลิป (แปลง พ.ศ.→ค.ศ. ลบ 543)

category mapping:
- เงินเดือน/ค่าจ้าง → salary
- ค่าล่วงเวลา → ot
- รายได้อื่น → income_other
- ภาษีหัก ณ ที่จ่าย → tax
- กองทุนสำรองเลี้ยงชีพ → provident_fund
- ฌาปนกิจ / สร. / สอ. / เงินกู้ / อื่นๆ → fixed`

async function callAI(userContent) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemma-4-26b-a4b-it:free",
      messages: [{ role: "user", content: userContent }]
    })
  })
  const j = await res.json()
  const text = j.choices?.[0]?.message?.content ?? ""
  const cleaned = text.replace(/```(?:json)?\n?/g, "").trim()
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) throw new Error(`parse_failed: ${text.slice(0, 200)}`)
  return JSON.parse(match[0])
}

async function parseSlip(filePath) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === ".pdf") {
    const bytes = fs.readFileSync(filePath)
    const data = await pdfParse(bytes)
    return callAI([{ type: "text", text: PROMPT + "\n\nข้อความจากสลิป:\n" + data.text }])
  }
  const bytes = fs.readFileSync(filePath)
  const base64 = bytes.toString("base64")
  const mime = ext === ".png" ? "image/png" : "image/jpeg"
  return callAI([
    { type: "text", text: PROMPT },
    { type: "image_url", image_url: { url: `data:${mime};base64,${base64}` } }
  ])
}

// --- Main ---
const slipFiles = fs.readdirSync(SLIP_DIR)
  .filter(f => /\.(jpg|jpeg|png|pdf)$/i.test(f))
  .filter(f => !f.includes("_unlocked") ? !fs.existsSync(path.join(SLIP_DIR, f.replace(/\.pdf$/i, "_unlocked.pdf"))) : true)
  .sort()

console.log(`📂 พบ ${slipFiles.length} สลิป\n`)

// โหลด existing data
let existing = await ghGet(DATA_PATH)
let userData = existing?.content ?? { transactions: [], budgets: {}, goals: [], recurring: [] }
let sha = existing?.sha

// สร้าง set ของ existing keys เพื่อ dedup (date+label+amount)
function txKey(t) { return `${t.date}|${t.label}|${t.amount}` }
const existingKeys = new Set(userData.transactions.map(txKey))

let totalAdded = 0

for (const file of slipFiles) {
  const filePath = path.join(SLIP_DIR, file)
  process.stdout.write(`📄 ${file} ... `)
  try {
    const items = await parseSlip(filePath)
    let added = 0
    for (const item of items) {
      const tx = {
        id: randomUUID(),
        date: item.date,
        type: item.type,
        category: item.category,
        label: item.label,
        amount: Number(item.amount),
        note: `imported from ${file}`,
      }
      const k = txKey(tx)
      if (!existingKeys.has(k)) {
        userData.transactions.push(tx)
        existingKeys.add(k)
        added++
        totalAdded++
      }
    }
    console.log(`✅ +${added} รายการ (จากทั้งหมด ${items.length})`)
  } catch (e) {
    console.log(`❌ ${e.message}`)
  }
  // rate limit — รอ 2 วิระหว่างใบ
  await new Promise(r => setTimeout(r, 2000))
}

// บันทึกลง GitHub
console.log(`\n💾 บันทึก ${totalAdded} รายการใหม่ลง GitHub...`)
const ok = await ghPut(DATA_PATH, userData, sha)
console.log(ok ? `✅ เสร็จ! รวม ${userData.transactions.length} transactions` : "❌ บันทึกไม่สำเร็จ")
