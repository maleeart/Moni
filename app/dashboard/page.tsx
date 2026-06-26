"use client"
import { useEffect, useState, useCallback } from "react"
import { Transaction, CATEGORY_META, MonthBudget } from "@/lib/types"
import AddTxModal from "@/components/AddTxModal"

interface UserInfo { name: string; picture: string; email: string }

function fmt(n: number) {
  return n.toLocaleString("th-TH", { minimumFractionDigits: 0 })
}

function getMonthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const MONTHS_TH = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."]

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Record<string, MonthBudget>>({})
  const [month, setMonth] = useState(getMonthKey(new Date()))
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [budgetInput, setBudgetInput] = useState({ salary: "", savingGoal: "", investGoal: "" })

  // Redirect if not logged in
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
      body: JSON.stringify({
        month,
        budget: {
          salary: parseFloat(budgetInput.salary) || 0,
          savingGoal: parseFloat(budgetInput.savingGoal) || 0,
          investGoal: parseFloat(budgetInput.investGoal) || 0,
        },
      }),
    })
    setShowBudgetForm(false)
    loadData()
  }

  // Calculations
  const totalIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const totalExpense = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense

  const budget = budgets[month]

  // Navigate month
  function prevMonth() {
    const d = new Date(month + "-01")
    d.setMonth(d.getMonth() - 1)
    setMonth(getMonthKey(d))
  }
  function nextMonth() {
    const d = new Date(month + "-01")
    d.setMonth(d.getMonth() + 1)
    setMonth(getMonthKey(d))
  }

  const [y, m2] = month.split("-")
  const monthLabel = `${MONTHS_TH[parseInt(m2) - 1]} ${parseInt(y) + 543}`

  // Group txs by date
  const grouped: Record<string, Transaction[]> = {}
  txs.forEach(t => {
    if (!grouped[t.date]) grouped[t.date] = []
    grouped[t.date].push(t)
  })

  return (
    <div className="min-h-screen pb-32" style={{ background: "#0F0E17", fontFamily: "'Helvetica Neue',Arial,sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="36" height="36">
            <defs>
              <linearGradient id="hbg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#6C63FF"/><stop offset="100%" stopColor="#A78BFA"/></linearGradient>
              <linearGradient id="hcoin" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#FDE68A"/><stop offset="100%" stopColor="#F59E0B"/></linearGradient>
            </defs>
            <rect x="10" y="10" width="180" height="180" rx="48" fill="url(#hbg)"/>
            <circle cx="100" cy="88" r="46" fill="url(#hcoin)"/>
            <text x="100" y="96" fontFamily="Georgia,serif" fontSize="52" fontWeight="700" fill="#92400E" textAnchor="middle" dominantBaseline="middle">M</text>
          </svg>
          <span className="text-white font-bold text-lg tracking-widest">MONI</span>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
            <button onClick={logout} className="text-white/40 text-xs hover:text-white/70 transition-colors">ออก</button>
          </div>
        )}
      </div>

      {/* Month navigator */}
      <div className="flex items-center justify-center gap-6 py-3">
        <button onClick={prevMonth} className="text-white/50 hover:text-white text-xl transition-colors">‹</button>
        <span className="text-white font-semibold text-base w-32 text-center">{monthLabel}</span>
        <button onClick={nextMonth} className="text-white/50 hover:text-white text-xl transition-colors">›</button>
      </div>

      {/* Summary cards */}
      <div className="px-4 grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-2xl p-4" style={{ background: "#1A1828" }}>
          <p className="text-xs text-white/40 mb-1">รายรับ</p>
          <p className="text-green-400 font-bold text-base">{fmt(totalIncome)}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#1A1828" }}>
          <p className="text-xs text-white/40 mb-1">รายจ่าย</p>
          <p className="text-red-400 font-bold text-base">{fmt(totalExpense)}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: "#1A1828" }}>
          <p className="text-xs text-white/40 mb-1">คงเหลือ</p>
          <p className={`font-bold text-base ${balance >= 0 ? "text-purple-400" : "text-red-400"}`}>{fmt(balance)}</p>
        </div>
      </div>

      {/* Budget bar */}
      {budget ? (
        <div className="mx-4 rounded-2xl p-4 mb-4" style={{ background: "#1A1828" }}>
          <div className="flex justify-between items-center mb-3">
            <p className="text-white text-sm font-medium">งบประมาณเดือนนี้</p>
            <button onClick={() => { setShowBudgetForm(true); setBudgetInput({ salary: String(budget.salary), savingGoal: String(budget.savingGoal), investGoal: String(budget.investGoal) }) }} className="text-xs text-purple-400">แก้ไข</button>
          </div>
          <div className="space-y-2">
            {[
              { label: "เงินเดือน", val: budget.salary, color: "#10B981" },
              { label: "เป้าออม", val: budget.savingGoal, color: "#A78BFA" },
              { label: "เป้าลงทุน", val: budget.investGoal, color: "#6C63FF" },
            ].map(item => (
              <div key={item.label} className="flex justify-between text-sm">
                <span className="text-white/50">{item.label}</span>
                <span style={{ color: item.color }} className="font-medium">฿{fmt(item.val)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <button onClick={() => setShowBudgetForm(true)} className="mx-4 w-[calc(100%-2rem)] rounded-2xl p-4 mb-4 text-sm text-white/40 border border-dashed flex items-center justify-center gap-2 hover:text-white/60 transition-colors" style={{ borderColor: "#2A2840" }}>
          + ตั้งเป้าหมายเดือนนี้
        </button>
      )}

      {/* Transaction list */}
      <div className="px-4">
        {loading ? (
          <div className="text-center text-white/30 py-12 text-sm">กำลังโหลด...</div>
        ) : txs.length === 0 ? (
          <div className="text-center text-white/30 py-12">
            <p className="text-3xl mb-2">💸</p>
            <p className="text-sm">ยังไม่มีรายการ</p>
            <p className="text-xs mt-1 text-white/20">กด + เพื่อเพิ่มรายการแรก</p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date} className="mb-4">
              <p className="text-white/30 text-xs mb-2 font-medium">
                {new Date(date + "T12:00:00").toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" })}
              </p>
              <div className="space-y-2">
                {items.map(tx => {
                  const meta = CATEGORY_META[tx.category]
                  return (
                    <div key={tx.id} className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: "#1A1828" }}>
                      <span className="text-xl">{meta.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{tx.label}</p>
                        <p className="text-white/30 text-xs">{meta.label}</p>
                      </div>
                      <span className={`font-semibold text-sm ${tx.type === "income" ? "text-green-400" : "text-red-400"}`}>
                        {tx.type === "income" ? "+" : "−"}฿{fmt(tx.amount)}
                      </span>
                      <button
                        onClick={() => deleteTx(tx.id)}
                        disabled={deleting === tx.id}
                        className="text-white/20 hover:text-red-400 transition-colors text-lg ml-1 disabled:opacity-30"
                      >×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-8 right-6 w-14 h-14 rounded-full flex items-center justify-center text-2xl text-white shadow-lg"
        style={{ background: "linear-gradient(135deg,#6C63FF,#A78BFA)" }}
      >+</button>

      {/* Add modal */}
      {showModal && <AddTxModal onClose={() => setShowModal(false)} onSaved={loadData} />}

      {/* Budget form modal */}
      {showBudgetForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setShowBudgetForm(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 flex flex-col gap-4" style={{ background: "#1A1828" }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-2" />
            <h2 className="text-white font-semibold text-lg">ตั้งเป้าหมาย {monthLabel}</h2>
            {[
              { key: "salary", label: "💼 เงินเดือน (บาท)" },
              { key: "savingGoal", label: "🏦 เป้าออมเงิน (บาท)" },
              { key: "investGoal", label: "📈 เป้าลงทุน (บาท)" },
            ].map(f => (
              <input
                key={f.key}
                className="w-full rounded-xl px-4 py-3 text-white text-sm outline-none"
                style={{ background: "#0F0E17", border: "1px solid #2A2840" }}
                placeholder={f.label}
                type="number"
                value={budgetInput[f.key as keyof typeof budgetInput]}
                onChange={e => setBudgetInput(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            ))}
            <button onClick={saveBudget} className="w-full py-3 rounded-xl font-semibold text-white" style={{ background: "linear-gradient(135deg,#6C63FF,#A78BFA)" }}>
              บันทึก
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
