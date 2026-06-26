"use client"
import { useRef, useState } from "react"
import { CATEGORY_META } from "@/lib/types"

interface SlipItem {
  label: string
  amount: number
  type: "income" | "expense"
  category: string
  date: string
  checked: boolean
}

export default function ImportSlipModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<SlipItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleFile(file: File) {
    setLoading(true)
    setError("")
    setItems([])
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
    await Promise.all(selected.map(i =>
      fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: i.date, type: i.type, category: i.category, label: i.label, amount: i.amount }),
      })
    ))
    setSaving(false)
    onSaved()
    onClose()
  }

  function fmt(n: number) { return n.toLocaleString("th-TH") }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl flex flex-col" style={{ background: "#1A1828", maxHeight: "90vh" }} onClick={e => e.stopPropagation()}>
        <div className="p-6 pb-3">
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4" />
          <h2 className="text-white font-semibold text-lg">นำเข้าสลิปเงินเดือน</h2>
        </div>

        <div className="overflow-y-auto px-6 pb-6 flex flex-col gap-4 flex-1">
          {/* Upload zone */}
          {items.length === 0 && !loading && (
            <button
              onClick={() => inputRef.current?.click()}
              className="w-full rounded-2xl p-8 flex flex-col items-center gap-3 border-2 border-dashed transition-colors"
              style={{ borderColor: "#2A2840" }}
            >
              <span className="text-4xl">📄</span>
              <span className="text-white/50 text-sm">แตะเพื่อเลือกรูปสลิปเงินเดือน</span>
              <span className="text-white/30 text-xs">JPG, PNG, PDF</span>
            </button>
          )}
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }} />

          {loading && (
            <div className="text-center py-8">
              <p className="text-white/50 text-sm">กำลังอ่านสลิป...</p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          {/* Preview items */}
          {items.length > 0 && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-white/50 text-xs">พบ {items.length} รายการ — เลือกที่ต้องการบันทึก</p>
                <button onClick={() => inputRef.current?.click()} className="text-purple-400 text-xs">เปลี่ยนรูป</button>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => {
                  const meta = CATEGORY_META[item.category as keyof typeof CATEGORY_META]
                  return (
                    <button key={i} onClick={() => setItems(prev => prev.map((x, j) => j === i ? { ...x, checked: !x.checked } : x))}
                      className="w-full flex items-center gap-3 rounded-2xl px-4 py-3 transition-opacity"
                      style={{ background: "#0F0E17", opacity: item.checked ? 1 : 0.4 }}>
                      <span className="text-lg">{meta?.emoji ?? "•"}</span>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-white text-sm truncate">{item.label}</p>
                        <p className="text-white/30 text-xs">{meta?.label ?? item.category}</p>
                      </div>
                      <span className={`text-sm font-semibold ${item.type === "income" ? "text-green-400" : "text-red-400"}`}>
                        {item.type === "income" ? "+" : "−"}฿{fmt(item.amount)}
                      </span>
                      <span className="text-white/40 text-lg ml-1">{item.checked ? "✓" : "○"}</span>
                    </button>
                  )
                })}
              </div>

              <button onClick={handleSave} disabled={saving || items.filter(i => i.checked).length === 0}
                className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg,#6C63FF,#A78BFA)" }}>
                {saving ? "กำลังบันทึก..." : `บันทึก ${items.filter(i => i.checked).length} รายการ`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
