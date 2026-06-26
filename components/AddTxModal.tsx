"use client"
import { useState } from "react"
import { CATEGORY_META, Category } from "@/lib/types"

interface Props {
  onClose: () => void
  onSaved: () => void
}

const INCOME_CATS: Category[] = ["salary", "income_other"]
const EXPENSE_CATS: Category[] = ["fixed", "variable", "invest", "saving"]

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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl p-6 pb-10 flex flex-col gap-4"
        style={{ background: "#FFFFFF" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: "#BAE6FD" }} />
        <h2 className="font-semibold text-lg" style={{ color: "#0C1A2E" }}>เพิ่มรายการ</h2>

        {/* Income / Expense toggle */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: "#BAE6FD" }}>
          {(["income", "expense"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setCategory(t === "income" ? "salary" : "variable") }}
              className="flex-1 py-2 text-sm font-medium transition-colors"
              style={{
                background: type === t ? (t === "income" ? "#10B981" : "#F43F5E") : "transparent",
                color: type === t ? "white" : "#888",
              }}
            >
              {t === "income" ? "💰 รายรับ" : "💸 รายจ่าย"}
            </button>
          ))}
        </div>

        {/* Category */}
        <div className="grid grid-cols-2 gap-2">
          {cats.map((c) => {
            const m = CATEGORY_META[c]
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all"
                style={{
                  background: category === c ? m.color + "30" : "#0F0E17",
                  border: `1px solid ${category === c ? m.color : "#2A2840"}`,
                  color: category === c ? m.color : "#888",
                }}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            )
          })}
        </div>

        {/* Inputs */}
        <input
          className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
          style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}
          placeholder="ชื่อรายการ เช่น ค่าน้ำ, เงินเดือน"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <input
          className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
          style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}
          placeholder="จำนวนเงิน (บาท)"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
          style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
          style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}
          placeholder="หมายเหตุ (ไม่บังคับ)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          disabled={loading || !label || !amount}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: "#0EA5E9" }}
        >
          {loading ? "กำลังบันทึก..." : "บันทึก"}
        </button>
      </div>
    </div>
  )
}
