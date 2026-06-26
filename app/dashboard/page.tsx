"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { Transaction, CATEGORY_META, MonthBudget } from "@/lib/types"
import AddTxModal from "@/components/AddTxModal"
import ImportSlipModal from "@/components/ImportSlipModal"

interface UserInfo { name: string; picture: string; email: string }

const C = {
  bg: "#F7F6FF",
  card: "#FFFFFF",
  border: "#EAE8FF",
  text: "#1A1828",
  sub: "#9895B0",
  accent: "#6C63FF",
  accentLight: "#EDE9FF",
  green: "#10B981",
  red: "#F43F5E",
  purple: "#A78BFA",
}

function fmt(n: number) { return n.toLocaleString("th-TH", { minimumFractionDigits: 0 }) }
function getMonthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` }
const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Record<string, MonthBudget>>({})
  const [month, setMonth] = useState(getMonthKey(new Date()))
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [budgetInput, setBudgetInput] = useState({ salary: "", savingGoal: "", investGoal: "" })
  const monthPickerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(d => {
      if (!d.user) window.location.href = "/"
      else setUser(d.user)
    })
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/transactions?month=${month}`)
    const d = await r.json()
    setTxs(d.transactions || [])
    setBudgets(d.budgets || {})
    setLoading(false)
  }, [month])

  useEffect(() => { loadData() }, [loadData])

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" })
    window.location.href = "/"
  }

  async function deleteTx(id: string) {
    setDeleting(id)
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" })
    await loadData()
    setDeleting(null)
  }

  async function saveBudget() {
    await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, budget: {
        salary: parseFloat(budgetInput.salary) || 0,
        savingGoal: parseFloat(budgetInput.savingGoal) || 0,
        investGoal: parseFloat(budgetInput.investGoal) || 0,
      }}),
    })
    setShowBudgetForm(false)
    loadData()
  }

  const totalIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const totalExpense = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense
  const budget = budgets[month]

  function prevMonth() { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); setMonth(getMonthKey(d)) }
  function nextMonth() { const d = new Date(month + "-01"); d.setMonth(d.getMonth() + 1); setMonth(getMonthKey(d)) }

  const [y, m2] = month.split("-")
  const monthLabel = `${MONTHS_TH[parseInt(m2) - 1]} ${parseInt(y) + 543}`

  const grouped: Record<string, Transaction[]> = {}
  txs.forEach(t => { if (!grouped[t.date]) grouped[t.date] = []; grouped[t.date].push(t) })

  return (
    <div className="min-h-screen pb-32" style={{ background: C.bg, fontFamily: "'Helvetica Neue',Arial,sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-4">
        <div className="flex items-center gap-2">
          <Image src="/Moni.png" alt="Moni" width={34} height={34} />
          <span className="font-bold text-lg tracking-widest" style={{ color: C.accent }}>MONI</span>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
            <button onClick={logout} className="text-xs transition-colors" style={{ color: C.sub }}>ออก</button>
          </div>
        )}
      </div>

      {/* Month picker */}
      <div className="flex items-center justify-center gap-4 py-2 px-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: C.accentLight, color: C.accent }}>‹</button>
        <button onClick={() => monthPickerRef.current?.showPicker?.()} className="flex items-center gap-1 px-4 py-1.5 rounded-full font-semibold text-sm" style={{ background: C.accentLight, color: C.accent }}>
          📅 {monthLabel}
        </button>
        <button onClick={nextMonth} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors" style={{ background: C.accentLight, color: C.accent }}>›</button>
        <input ref={monthPickerRef} type="month" value={month} onChange={e => setMonth(e.target.value)}
          className="absolute opacity-0 pointer-events-none w-0 h-0" />
      </div>

      {/* Summary cards */}
      <div className="px-4 grid grid-cols-3 gap-3 mt-3 mb-4">
        {[
          { label: "รายรับ", val: totalIncome, color: C.green },
          { label: "รายจ่าย", val: totalExpense, color: C.red },
          { label: "คงเหลือ", val: balance, color: balance >= 0 ? C.accent : C.red },
        ].map(c => (
          <div key={c.label} className="rounded-2xl p-4 shadow-sm" style={{ background: C.card, border: `1px solid ${C.border}` }}>
            <p className="text-xs mb-1" style={{ color: C.sub }}>{c.label}</p>
            <p className="font-bold text-sm" style={{ color: c.color }}>{fmt(c.val)}</p>
          </div>
        ))}
      </div>

      {/* Budget bar */}
      {budget ? (
        <div className="mx-4 rounded-2xl p-4 mb-4 shadow-sm" style={{ background: C.card, border: `1px solid ${C.border}` }}>
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm font-medium" style={{ color: C.text }}>งบประมาณเดือนนี้</p>
            <button onClick={() => { setShowBudgetForm(true); setBudgetInput({ salary: String(budget.salary), savingGoal: String(budget.savingGoal), investGoal: String(budget.investGoal) }) }}
              className="text-xs font-medium" style={{ color: C.accent }}>แก้ไข</button>
          </div>
          <div className="space-y-2">
            {[
              { label: "เงินเดือน", val: budget.salary, color: C.green },
              { label: "เป้าออม", val: budget.savingGoal, color: C.purple },
              { label: "เป้าลงทุน", val: budget.investGoal, color: C.accent },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm">
                <span style={{ color: C.sub }}>{item.label}</span>
                <span style={{ color: item.color }} className="font-medium">฿{fmt(item.val)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setShowBudgetForm(true)}
          className="mx-4 w-[calc(100%-2rem)] rounded-2xl p-4 mb-4 text-sm border border-dashed flex items-center justify-center gap-2 transition-colors"
          style={{ borderColor: C.border, color: C.sub }}>
          + ตั้งเป้าหมายเดือนนี้
        </button>
      )}

      {/* Transaction list */}
      <div className="px-4">
        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: C.sub }}>กำลังโหลด...</div>
        ) : txs.length === 0 ? (
          <div className="text-center py-12" style={{ color: C.sub }}>
            <p className="text-3xl mb-2">💸</p>
            <p className="text-sm">ยังไม่มีรายการ</p>
            <p className="text-xs mt-1" style={{ color: C.border }}>กด + เพื่อเพิ่มรายการแรก</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-4">
              <p className="text-xs mb-2 font-medium" style={{ color: C.sub }}>
                {new Date(date + "T12:00:00").toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <div className="space-y-2">
                {items.map(tx => {
                  const meta = CATEGORY_META[tx.category]
                  return (
                    <div key={tx.id} className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                      <span className="text-xl">{meta.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: C.text }}>{tx.label}</p>
                        <p className="text-xs" style={{ color: C.sub }}>{meta.label}</p>
                      </div>
                      <span className="font-semibold text-sm" style={{ color: tx.type === "income" ? C.green : C.red }}>
                        {tx.type === "income" ? "+" : "−"}฿{fmt(tx.amount)}
                      </span>
                      <button onClick={() => deleteTx(tx.id)} disabled={deleting === tx.id}
                        className="text-lg ml-1 transition-colors disabled:opacity-30"
                        style={{ color: C.border }}
                        onMouseEnter={e => (e.currentTarget.style.color = C.red)}
                        onMouseLeave={e => (e.currentTarget.style.color = C.border)}
                      >×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FABs */}
      <button onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white shadow-lg"
        style={{ background: `linear-gradient(135deg,${C.accent},${C.purple})` }}>+</button>
      <button onClick={() => setShowImport(true)}
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center text-xl shadow-md"
        style={{ background: C.card, border: `1px solid ${C.border}`, color: C.accent }}>📄</button>

      {showModal && <AddTxModal onClose={() => setShowModal(false)} onSaved={loadData} />}
      {showImport && <ImportSlipModal onClose={() => setShowImport(false)} onSaved={loadData} />}

      {/* Budget form modal */}
      {showBudgetForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(15,14,23,0.5)" }} onClick={() => setShowBudgetForm(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 flex flex-col gap-4 shadow-xl" style={{ background: C.card }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: C.border }} />
            <h2 className="font-semibold text-lg" style={{ color: C.text }}>ตั้งเป้าหมาย {monthLabel}</h2>
            {[
              { key: "salary", label: "💼 เงินเดือน (บาท)" },
              { key: "savingGoal", label: "🏦 เป้าออมเงิน (บาท)" },
              { key: "investGoal", label: "📈 เป้าลงทุน (บาท)" },
            ].map(f => (
              <input key={f.key}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                placeholder={f.label} type="number"
                value={budgetInput[f.key as keyof typeof budgetInput]}
                onChange={e => setBudgetInput(prev => ({ ...prev, [f.key]: e.target.value }))} />
            ))}
            <button onClick={saveBudget} className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: `linear-gradient(135deg,${C.accent},${C.purple})` }}>บันทึก</button>
          </div>
        </div>
      )}
    </div>
  )
}
