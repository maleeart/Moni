"use client"
import { useState } from "react"
import { CATEGORY_META, getCategoryMeta, Category } from "@/lib/types"

interface Props {
  onClose: () => void
  onSaved: () => void
}

const INCOME_CATS: Category[] = ["salary", "ot", "income_other"]
const EXPENSE_CATS: Category[] = ["slip_deduction", "credit_card", "fixed", "variable", "invest", "saving"]

const C = { bg: "#EFF6FF", card: "#FFFFFF", border: "#93C5FD", text: "#1E293B", sub: "#334155", accent: "#1D6EBF", accentLight: "#DBEAFE" }

export default function AddTxModal({ onClose, onSaved }: Props) {
  const today = new Date().toISOString().slice(0, 10)
  const [type, setType] = useState<"income" | "expense">("expense")
  const [category, setCategory] = useState<Category>("variable")
  const [label, setLabel] = useState("")
  const [amount, setAmount] = useState("")
  const [date, setDate] = useState(today)
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(false)

  const cats = type === "income" ? INCOME_CATS : EXPENSE_CATS

  async function handleSubmit() {
    if (!label || !amount || !date) return
    setLoading(true)
    await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, category, label, amount: parseFloat(amount), date, note }),
    })
    setLoading(false)
    onSaved()
    onClose()
  }

  const inputStyle = { background: C.bg, border: `1px solid ${C.border}`, color: C.text }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 flex flex-col gap-4 shadow-xl"
        style={{ background: C.card }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: C.border }} />
        <h2 className="font-semibold text-lg" style={{ color: C.text }}>เพิ่มรายการ</h2>

        {/* Income / Expense toggle */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: C.border }}>
          {(["income", "expense"] as const).map((t) => (
            <button key={t}
              onClick={() => { setType(t); setCategory(t === "income" ? "salary" : "variable") }}
              className="flex-1 py-2 text-sm font-medium transition-colors"
              style={{
                background: type === t ? (t === "income" ? "#059669" : "#DC2626") : "transparent",
                color: type === t ? "#FFFFFF" : C.sub,
              }}>
              {t === "income" ? "💰 รายรับ" : "💸 รายจ่าย"}
            </button>
          ))}
        </div>

        {/* Category */}
        <div className="grid grid-cols-2 gap-2">
          {cats.map((c) => {
            const m = getCategoryMeta(c)
            const selected = category === c
            return (
              <button key={c} onClick={() => setCategory(c)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                style={{
                  background: selected ? m.color + "22" : C.bg,
                  border: `1.5px solid ${selected ? m.color : C.border}`,
                  color: selected ? m.color : C.sub,
                  fontWeight: selected ? 600 : 400,
                }}>
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>

        <input className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}
          placeholder="ชื่อรายการ เช่น ค่าน้ำ, เงินเดือน"
          value={label} onChange={(e) => setLabel(e.target.value)} />
        <input className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}
          placeholder="จำนวนเงิน (บาท)" type="number"
          value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}
          type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={inputStyle}
          placeholder="หมายเหตุ (ไม่บังคับ)"
          value={note} onChange={(e) => setNote(e.target.value)} />

        <button onClick={handleSubmit} disabled={loading || !label || !amount}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: C.accent }}>
          {loading ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </div>
  )
}
