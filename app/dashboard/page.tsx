"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { Transaction, CATEGORY_META, MonthBudget, Category } from "@/lib/types"
import AddTxModal from "@/components/AddTxModal"
import ImportSlipModal from "@/components/ImportSlipModal"

interface UserInfo { name: string; picture: string; email: string }

const C = {
  bg: "#F0F9FF", card: "#FFFFFF", border: "#BAE6FD",
  text: "#0C1A2E", sub: "#64748B", accent: "#0EA5E9",
  accentLight: "#E0F2FE", green: "#10B981", red: "#F43F5E", yellow: "#F59E0B",
}

function fmt(n: number) { return n.toLocaleString("th-TH", { minimumFractionDigits: 0 }) }
function getMonthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` }
const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]

function BudgetRing({ pct }: { pct: number }) {
  const r = 54, circ = 2 * Math.PI * r
  const p = Math.min(pct, 100)
  const color = p < 50 ? C.green : p < 75 ? "#F59E0B" : p < 90 ? "#F97316" : C.red
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke={C.accentLight} strokeWidth="14" />
      <circle cx="70" cy="70" r={r} fill="none" stroke={color} strokeWidth="14"
        strokeDasharray={circ} strokeDashoffset={circ * (1 - p / 100)}
        strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition: "stroke-dashoffset 0.6s ease" }} />
      <text x="70" y="66" textAnchor="middle" fontSize="22" fontWeight="700" fill={C.text}>{Math.round(p)}%</text>
      <text x="70" y="84" textAnchor="middle" fontSize="11" fill={C.sub}>ใช้ไปแล้ว</text>
    </svg>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Record<string, MonthBudget>>({})
  const [month, setMonth] = useState(getMonthKey(new Date()))
  const [tab, setTab] = useState<"home" | "list" | "stats">("home")
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
  const ringPct = budget?.salary ? (totalExpense / budget.salary) * 100 : totalIncome ? (totalExpense / totalIncome) * 100 : 0

  // Category breakdown
  const catTotals: Partial<Record<Category, number>> = {}
  txs.filter(t => t.type === "expense").forEach(t => { catTotals[t.category] = (catTotals[t.category] || 0) + t.amount })
  const catSorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]) as [Category, number][]
  const maxCat = catSorted[0]?.[1] || 1

  function prevMonth() { const d = new Date(month + "-01"); d.setMonth(d.getMonth() - 1); setMonth(getMonthKey(d)) }
  function nextMonth() { const d = new Date(month + "-01"); d.setMonth(d.getMonth() + 1); setMonth(getMonthKey(d)) }
  const [y, m2] = month.split("-")
  const monthLabel = `${MONTHS_TH[parseInt(m2) - 1]} ${parseInt(y) + 543}`

  const grouped: Record<string, Transaction[]> = {}
  txs.forEach(t => { if (!grouped[t.date]) grouped[t.date] = []; grouped[t.date].push(t) })

  const cardStyle = { background: C.card, border: `1px solid ${C.border}` }

  return (
    <div className="min-h-screen pb-24" style={{ background: C.bg, fontFamily: "'Helvetica Neue',Arial,sans-serif" }}>

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-10 pb-3">
        <div className="flex items-center gap-2">
          <Image src="/Moni.png" alt="Moni" width={32} height={32} />
          <span className="font-bold text-base tracking-widest" style={{ color: C.accent }}>MONI</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Month picker */}
          <button onClick={() => monthPickerRef.current?.showPicker?.()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ background: C.accentLight, color: C.accent }}>
            {monthLabel} ▾
          </button>
          <input ref={monthPickerRef} type="month" value={month} onChange={e => setMonth(e.target.value)}
            className="absolute opacity-0 pointer-events-none w-0 h-0" />
          <button onClick={prevMonth} className="text-lg" style={{ color: C.accent }}>‹</button>
          <button onClick={nextMonth} className="text-lg" style={{ color: C.accent }}>›</button>
          {user && <img src={user.picture} alt="" className="w-7 h-7 rounded-full cursor-pointer" onClick={logout} />}
        </div>
      </div>

      {/* ── HOME TAB ── */}
      {tab === "home" && (
        <div className="px-4 space-y-4">
          {/* Hero balance + ring */}
          <div className="rounded-3xl p-5 shadow-sm flex items-center justify-between" style={cardStyle}>
            <div>
              <p className="text-xs mb-1" style={{ color: C.sub }}>ยอดคงเหลือเดือนนี้</p>
              <p className="text-3xl font-bold" style={{ color: balance >= 0 ? C.text : C.red }}>
                ฿{fmt(Math.abs(balance))}
              </p>
              <p className="text-xs mt-0.5" style={{ color: balance >= 0 ? C.green : C.red }}>
                {balance >= 0 ? "▲ บวก" : "▼ ขาด"}
              </p>
              <div className="flex gap-4 mt-3">
                <div>
                  <p className="text-xs" style={{ color: C.sub }}>รายรับ</p>
                  <p className="text-sm font-semibold" style={{ color: C.green }}>+฿{fmt(totalIncome)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: C.sub }}>รายจ่าย</p>
                  <p className="text-sm font-semibold" style={{ color: C.red }}>-฿{fmt(totalExpense)}</p>
                </div>
              </div>
            </div>
            <BudgetRing pct={ringPct} />
          </div>

          {/* Budget goals */}
          {budget ? (
            <div className="rounded-2xl p-4 shadow-sm" style={cardStyle}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold" style={{ color: C.text }}>เป้าหมายเดือนนี้</p>
                <button onClick={() => { setShowBudgetForm(true); setBudgetInput({ salary: String(budget.salary), savingGoal: String(budget.savingGoal), investGoal: String(budget.investGoal) }) }}
                  className="text-xs" style={{ color: C.accent }}>แก้ไข</button>
              </div>
              {[
                { label: "เงินเดือน", val: budget.salary, color: C.green },
                { label: "เป้าออม", val: budget.savingGoal, color: C.accent },
                { label: "เป้าลงทุน", val: budget.investGoal, color: "#8B5CF6" },
              ].map(item => (
                <div key={item.label} className="flex justify-between text-sm py-1">
                  <span style={{ color: C.sub }}>{item.label}</span>
                  <span className="font-medium" style={{ color: item.color }}>฿{fmt(item.val)}</span>
                </div>
              ))}
            </div>
          ) : (
            <button onClick={() => setShowBudgetForm(true)}
              className="w-full rounded-2xl p-4 text-sm border-2 border-dashed flex items-center justify-center gap-2"
              style={{ borderColor: C.border, color: C.sub }}>
              + ตั้งเป้าหมายเดือนนี้
            </button>
          )}

          {/* Category breakdown */}
          {catSorted.length > 0 && (
            <div className="rounded-2xl p-4 shadow-sm" style={cardStyle}>
              <p className="text-sm font-semibold mb-3" style={{ color: C.text }}>รายจ่ายแยกหมวด</p>
              <div className="space-y-2.5">
                {catSorted.slice(0, 5).map(([cat, amt]) => {
                  const meta = CATEGORY_META[cat]
                  const pct = (amt / maxCat) * 100
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: C.sub }}>{meta.emoji} {meta.label}</span>
                        <span className="font-medium" style={{ color: C.text }}>฿{fmt(amt)}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: C.accentLight }}>
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: meta.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent transactions */}
          {txs.length > 0 && (
            <div className="rounded-2xl p-4 shadow-sm" style={cardStyle}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold" style={{ color: C.text }}>รายการล่าสุด</p>
                <button onClick={() => setTab("list")} className="text-xs" style={{ color: C.accent }}>ดูทั้งหมด →</button>
              </div>
              <div className="space-y-2">
                {txs.slice(0, 4).map(tx => {
                  const meta = CATEGORY_META[tx.category]
                  return (
                    <div key={tx.id} className="flex items-center gap-3">
                      <span className="text-lg">{meta.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: C.text }}>{tx.label}</p>
                        <p className="text-xs" style={{ color: C.sub }}>{tx.date}</p>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: tx.type === "income" ? C.green : C.red }}>
                        {tx.type === "income" ? "+" : "−"}฿{fmt(tx.amount)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {txs.length === 0 && !loading && (
            <div className="text-center py-12" style={{ color: C.sub }}>
              <p className="text-4xl mb-3">💸</p>
              <p className="text-sm">ยังไม่มีรายการเดือนนี้</p>
              <p className="text-xs mt-1" style={{ color: C.border }}>กด 📄 เพื่อนำเข้าสลิป หรือ + เพิ่มเอง</p>
            </div>
          )}
        </div>
      )}

      {/* ── LIST TAB ── */}
      {tab === "list" && (
        <div className="px-4 space-y-1">
          {loading ? (
            <div className="text-center py-12 text-sm" style={{ color: C.sub }}>กำลังโหลด...</div>
          ) : txs.length === 0 ? (
            <div className="text-center py-12" style={{ color: C.sub }}>ไม่มีรายการ</div>
          ) : (
            Object.entries(grouped).map(([date, items]) => (
              <div key={date} className="mb-4">
                <p className="text-xs mb-2 font-medium px-1" style={{ color: C.sub }}>
                  {new Date(date + "T12:00:00").toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short" })}
                </p>
                <div className="space-y-2">
                  {items.map(tx => {
                    const meta = CATEGORY_META[tx.category]
                    return (
                      <div key={tx.id} className="flex items-center gap-3 rounded-2xl px-4 py-3 shadow-sm" style={cardStyle}>
                        <span className="text-xl">{meta.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: C.text }}>{tx.label}</p>
                          <p className="text-xs" style={{ color: C.sub }}>{meta.label}</p>
                        </div>
                        <span className="font-semibold text-sm" style={{ color: tx.type === "income" ? C.green : C.red }}>
                          {tx.type === "income" ? "+" : "−"}฿{fmt(tx.amount)}
                        </span>
                        <button onClick={() => deleteTx(tx.id)} disabled={deleting === tx.id}
                          className="text-xl ml-1 disabled:opacity-30" style={{ color: C.border }}>×</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── STATS TAB ── */}
      {tab === "stats" && (
        <div className="px-4 space-y-4">
          <div className="rounded-2xl p-5 shadow-sm" style={cardStyle}>
            <p className="text-sm font-semibold mb-4" style={{ color: C.text }}>สรุปรายจ่ายทั้งหมด</p>
            {catSorted.length === 0 ? (
              <p className="text-sm text-center py-4" style={{ color: C.sub }}>ยังไม่มีข้อมูล</p>
            ) : catSorted.map(([cat, amt]) => {
              const meta = CATEGORY_META[cat]
              const pct = totalExpense ? ((amt / totalExpense) * 100).toFixed(1) : "0"
              return (
                <div key={cat} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span style={{ color: C.text }}>{meta.emoji} {meta.label}</span>
                    <span style={{ color: C.sub }}>฿{fmt(amt)} <span className="text-xs">({pct}%)</span></span>
                  </div>
                  <div className="h-2 rounded-full" style={{ background: C.accentLight }}>
                    <div className="h-2 rounded-full" style={{ width: `${(amt / maxCat) * 100}%`, background: meta.color }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="rounded-2xl p-5 shadow-sm" style={cardStyle}>
            <p className="text-sm font-semibold mb-3" style={{ color: C.text }}>สรุปเดือน {monthLabel}</p>
            {[
              { label: "รายรับทั้งหมด", val: totalIncome, color: C.green },
              { label: "รายจ่ายทั้งหมด", val: totalExpense, color: C.red },
              { label: "คงเหลือ", val: balance, color: balance >= 0 ? C.accent : C.red },
              ...(budget?.savingGoal ? [{ label: "เป้าออม", val: budget.savingGoal, color: "#8B5CF6" }] : []),
            ].map(row => (
              <div key={row.label} className="flex justify-between py-2 border-b last:border-0" style={{ borderColor: C.border }}>
                <span className="text-sm" style={{ color: C.sub }}>{row.label}</span>
                <span className="text-sm font-semibold" style={{ color: row.color }}>฿{fmt(row.val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-4 pb-safe pt-2 shadow-lg"
        style={{ background: C.card, borderTop: `1px solid ${C.border}`, paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        {([
          { id: "home", icon: "⊞", label: "หน้าแรก" },
          { id: "list", icon: "☰", label: "รายการ" },
          { id: "stats", icon: "◎", label: "วิเคราะห์" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl transition-all"
            style={{ color: tab === t.id ? C.accent : C.sub }}>
            <span className="text-xl">{t.icon}</span>
            <span className="text-xs font-medium">{t.label}</span>
          </button>
        ))}
        <button onClick={() => setShowModal(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl text-white shadow-md"
          style={{ background: C.accent }}>+</button>
        <button onClick={() => setShowImport(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-4 rounded-xl"
          style={{ color: C.sub }}>
          <span className="text-xl">📄</span>
          <span className="text-xs font-medium">สลิป</span>
        </button>
      </div>

      {showModal && <AddTxModal onClose={() => setShowModal(false)} onSaved={loadData} />}
      {showImport && <ImportSlipModal onClose={() => setShowImport(false)} onSaved={(m) => { if (m) setMonth(m); loadData() }} />}

      {showBudgetForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowBudgetForm(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 flex flex-col gap-4 shadow-xl" style={{ background: C.card }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: C.border }} />
            <h2 className="font-semibold text-lg" style={{ color: C.text }}>ตั้งเป้าหมาย {monthLabel}</h2>
            {[
              { key: "salary", label: "💼 เงินเดือน (บาท)" },
              { key: "savingGoal", label: "🏦 เป้าออมเงิน (บาท)" },
              { key: "investGoal", label: "📈 เป้าลงทุน (บาท)" },
            ].map(f => (
              <input key={f.key} type="number" placeholder={f.label}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                value={budgetInput[f.key as keyof typeof budgetInput]}
                onChange={e => setBudgetInput(prev => ({ ...prev, [f.key]: e.target.value }))} />
            ))}
            <button onClick={saveBudget} className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: C.accent }}>บันทึก</button>
          </div>
        </div>
      )}
    </div>
  )
}
