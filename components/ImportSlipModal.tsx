"use client"
import { useRef, useState } from "react"
import { CATEGORY_META, getCategoryMeta, Category } from "@/lib/types"

interface SlipItem {
  label: string; amount: number; type: "income" | "expense"
  category: string; date: string; checked: boolean
}

const C = { bg: "#EFF6FF", card: "#FFFFFF", border: "#93C5FD", text: "#1E293B", sub: "#334155", accent: "#1D6EBF", accentLight: "#DBEAFE" }

export default function ImportSlipModal({ onClose, onSaved }: { onClose: () => void; onSaved: (month?: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<SlipItem[]>([])
  const [editIdx, setEditIdx] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleFile(file: File) {
    setLoading(true); setError(""); setItems([])
    const form = new FormData()
    form.append("file", file)
    const r = await fetch("/api/import-slip", { method: "POST", body: form })
    const d = await r.json()
    if (!r.ok) { setError(d.error ?? "เกิดข้อผิดพลาด"); setLoading(false); return }
    setItems(d.items.map((i: Omit<SlipItem, "checked">) => ({ ...i, checked: true })))
    setLoading(false)
  }

  async function handleSave() {
    setSaving(true)
    const selected = items.filter(i => i.checked)
    await fetch("/api/transactions", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(selected.map(i => ({ date: i.date, type: i.type, category: i.category, label: i.label, amount: i.amount }))),
    })
    setSaving(false)
    onSaved(selected[0]?.date?.slice(0, 7))
    onClose()
  }

  function fmt(n: number) { return n.toLocaleString("th-TH") }

  function patch(i: number, p: Partial<SlipItem>) {
    setItems(prev => prev.map((x, j) => j === i ? { ...x, ...p } : x))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl flex flex-col shadow-xl"
        style={{ background: C.card, maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-3">
          <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: C.border }} />
          <h2 className="font-semibold text-lg" style={{ color: C.text }}>นำเข้าสลิปเงินเดือน</h2>
        </div>

        <div className="overflow-y-auto px-6 pb-6 flex flex-col gap-4 flex-1">
          {items.length === 0 && !loading && (
            <button onClick={() => inputRef.current?.click()}
              className="w-full rounded-2xl p-8 flex flex-col items-center gap-3 border-2 border-dashed"
              style={{ borderColor: C.border }}>
              <span className="text-4xl">📄</span>
              <span className="text-sm" style={{ color: C.sub }}>แตะเพื่อเลือกรูปสลิปเงินเดือน</span>
              <span className="text-xs" style={{ color: C.accent }}>JPG, PNG, PDF</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />

          {loading && (
            <div className="text-center py-8">
              <p className="text-sm" style={{ color: C.sub }}>กำลังอ่านสลิป...</p>
            </div>
          )}

          {error && <p className="text-sm text-center" style={{ color: "#DC2626" }}>{error}</p>}

          {items.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-xs" style={{ color: C.sub }}>พบ {items.length} รายการ — ตรวจ/แก้แล้วเลือกบันทึก</p>
                <button onClick={() => inputRef.current?.click()} className="text-xs" style={{ color: C.accent }}>เปลี่ยนรูป</button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const meta = getCategoryMeta(item.category)
                  const inputStyle = { background: C.card, border: `1px solid ${C.border}`, color: C.text }

                  if (editIdx === i) return (
                    <div key={i} className="rounded-2xl px-4 py-3 flex flex-col gap-2"
                      style={{ background: C.accentLight, border: `1px solid ${C.border}` }}>
                      <input autoFocus className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                        placeholder="ชื่อรายการ" value={item.label}
                        onChange={e => patch(i, { label: e.target.value })} />
                      <div className="flex gap-2">
                        <input type="number" inputMode="decimal" className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm outline-none"
                          style={inputStyle} placeholder="จำนวนเงิน" value={item.amount}
                          onChange={e => patch(i, { amount: parseFloat(e.target.value) || 0 })} />
                        <select className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                          value={item.category}
                          onChange={e => {
                            const c = e.target.value as Category
                            patch(i, { category: c, type: CATEGORY_META[c].type })
                          }}>
                          {(Object.keys(CATEGORY_META) as Category[]).map(c => (
                            <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>
                          ))}
                        </select>
                      </div>
                      <input type="date" className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle}
                        value={item.date} onChange={e => patch(i, { date: e.target.value })} />
                      <button onClick={() => setEditIdx(null)} className="self-end text-xs font-semibold px-3 py-1.5 rounded-full"
                        style={{ background: C.accent, color: "#fff" }}>เสร็จ</button>
                    </div>
                  )

                  return (
                    <div key={i} className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition-opacity"
                      style={{ background: item.checked ? C.accentLight : C.bg, opacity: item.checked ? 1 : 0.5,
                        border: `1px solid ${item.checked ? C.border : "transparent"}` }}>
                      <button onClick={() => patch(i, { checked: !item.checked })}
                        className="flex items-center gap-3 flex-1 min-w-0" aria-label="เลือกรายการ">
                        <span className="text-lg">{meta.emoji}</span>
                        <div className="flex-1 text-left min-w-0">
                          <p className="text-sm truncate font-medium" style={{ color: C.text }}>{item.label}</p>
                          <p className="text-xs" style={{ color: C.sub }}>{meta.label}</p>
                        </div>
                        <span className="text-sm font-semibold" style={{ color: item.type === "income" ? "#059669" : "#DC2626" }}>
                          {item.type === "income" ? "+" : "−"}฿{fmt(item.amount)}
                        </span>
                        <span className="text-lg" style={{ color: item.checked ? C.accent : C.border }}>
                          {item.checked ? "✓" : "○"}
                        </span>
                      </button>
                      <button onClick={() => setEditIdx(i)} className="text-sm" aria-label="แก้ไขรายการ"
                        style={{ color: C.accent }}>✎</button>
                    </div>
                  )
                })}
              </div>

              <button onClick={handleSave} disabled={saving || items.filter(i => i.checked).length === 0}
                className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40"
                style={{ background: C.accent }}>
                {saving ? "กำลังบันทึก..." : `บันทึก ${items.filter(i => i.checked).length} รายการ`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
