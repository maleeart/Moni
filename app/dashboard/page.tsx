"use client"
import { useEffect, useState, useCallback, useRef } from "react"
import Image from "next/image"
import { Transaction, CATEGORY_META, MonthBudget, Category, Goal, RecurringBill } from "@/lib/types"
import AddTxModal from "@/components/AddTxModal"
import ImportSlipModal from "@/components/ImportSlipModal"

interface UserInfo { name: string; picture: string; email: string }

const C = {
  bg: "#EFF6FF", card: "#FFFFFF", border: "#93C5FD",
  text: "#1E293B", sub: "#334155", accent: "#1D6EBF",
  accentLight: "#DBEAFE", green: "#059669", red: "#DC2626", yellow: "#D97706",
}

function fmt(n: number) { return n.toLocaleString("th-TH", { minimumFractionDigits: 0 }) }
function getMonthKey(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}` }
const MONTHS_TH = ["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."]

function BudgetRing({ pct, income, expense }: { pct: number; income: number; expense: number }) {
  const size = 160, cx = 80, cy = 80, r = 62, strokeW = 13
  const circ = 2 * Math.PI * r
  const p = Math.min(pct, 100)
  // color stops: green→teal→yellow→orange→red
  const gradId = "ringGrad"
  const trackColor = "#E0F2FE"
  const color = p < 40 ? C.green : p < 65 ? "#0891B2" : p < 80 ? C.yellow : p < 92 ? "#F97316" : C.red
  const offset = circ * (1 - p / 100)

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ filter: "drop-shadow(0 4px 12px rgba(14,165,233,0.15))" }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={strokeW} />
        {/* Progress arc */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={`url(#${gradId})`} strokeWidth={strokeW}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.34,1.56,0.64,1)" }} />
        {/* Center pct */}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="800" fill={C.text}
          style={{ fontFamily: "system-ui, sans-serif" }}>{Math.round(p)}%</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize="11" fill={C.sub}>ใช้ไปแล้ว</text>
        {/* income/expense mini labels */}
        <text x={cx} y={cy + 28} textAnchor="middle" fontSize="9.5" fill={C.sub}>
          {`฿${income.toLocaleString("th-TH")}`}
        </text>
      </svg>
    </div>
  )
}

export default function Dashboard() {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [txs, setTxs] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Record<string, MonthBudget>>({})
  const [goals, setGoals] = useState<Goal[]>([])
  const [recurring, setRecurring] = useState<RecurringBill[]>([])
  const [month, setMonth] = useState(getMonthKey(new Date()))
  const [tab, setTab] = useState<"home" | "list" | "stats">("home")
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [budgetInput, setBudgetInput] = useState({ salary: "", savingGoal: "", investGoal: "" })
  const [insight, setInsight] = useState("")
  const [insightLoading, setInsightLoading] = useState(false)
  // Goal form
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalInput, setGoalInput] = useState({ name: "", target: "", current: "", emoji: "🎯" })
  const [editGoalId, setEditGoalId] = useState<string | null>(null)
  // Recurring form
  const [showRecurringForm, setShowRecurringForm] = useState(false)
  const [recurringInput, setRecurringInput] = useState({ label: "", amount: "", category: "fixed" as Category, dayOfMonth: "1" })
  const monthPickerRef = useRef<HTMLInputElement>(null)
  const [trend, setTrend] = useState<{ m: string; income: number; expense: number }[]>([])
  const [showMonthPicker, setShowMonthPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear())
  const [pushEnabled, setPushEnabled] = useState(false)

  async function subscribePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return alert("เบราว์เซอร์นี้ไม่รองรับ Push")
    const reg = await navigator.serviceWorker.register("/sw.js")
    const perm = await Notification.requestPermission()
    if (perm !== "granted") return
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    })
    await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) })
    setPushEnabled(true)
  }

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub))
      )
    }
  }, [])

  useEffect(() => {
    fetch("/api/auth/session").then(r => r.json()).then(d => {
      if (!d.user) window.location.href = "/"
      else setUser(d.user)
    })
    fetch("/api/goals").then(r => r.json()).then(d => setGoals(d.goals ?? []))
    fetch("/api/recurring").then(r => r.json()).then(d => setRecurring(d.recurring ?? []))
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    setInsight("")
    await fetch("/api/recurring/apply", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month }),
    })
    const r = await fetch(`/api/transactions?month=${month}`)
    const d = await r.json()
    setTxs(d.transactions || [])
    setBudgets(d.budgets || {})
    setLoading(false)
  }, [month])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => { setTrend([]) }, [month])

  useEffect(() => {
    if (tab !== "stats" || trend.length) return
    const months: string[] = []
    const d = new Date(month + "-01")
    for (let i = 5; i >= 0; i--) {
      const t = new Date(d); t.setMonth(t.getMonth() - i)
      months.push(getMonthKey(t))
    }
    Promise.all(months.map(m => fetch(`/api/transactions?month=${m}`).then(r => r.json()))).then(results => {
      setTrend(results.map((r, i) => ({
        m: months[i],
        income: (r.transactions ?? []).filter((t: Transaction) => t.type === "income").reduce((s: number, t: Transaction) => s + t.amount, 0),
        expense: (r.transactions ?? []).filter((t: Transaction) => t.type === "expense").reduce((s: number, t: Transaction) => s + t.amount, 0),
      })))
    })
  }, [tab, trend.length, month])

  async function logout() {
    await fetch("/api/auth/session", { method: "DELETE" })
    window.location.href = "/"
  }

  function exportCSV() {
    const rows = [["วันที่","ประเภท","หมวด","รายการ","จำนวน"]]
    txs.forEach(t => rows.push([t.date, t.type === "income" ? "รายรับ" : "รายจ่าย", CATEGORY_META[t.category].label, t.label, String(t.amount)]))
    const csv = rows.map(r => r.map(c => `"${c}"`).join(",")).join("\n")
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
    a.download = `moni-${month}.csv`
    a.click()
  }

  async function deleteTx(id: string) {
    setDeleting(id)
    await fetch(`/api/transactions?id=${id}`, { method: "DELETE" })
    await loadData()
    setDeleting(null)
  }

  async function saveBudget() {
    await fetch("/api/budget", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month, budget: {
        salary: parseFloat(budgetInput.salary) || 0,
        savingGoal: parseFloat(budgetInput.savingGoal) || 0,
        investGoal: parseFloat(budgetInput.investGoal) || 0,
      }}),
    })
    setShowBudgetForm(false)
    loadData()
  }

  async function saveGoal() {
    const body = { name: goalInput.name, target: parseFloat(goalInput.target) || 0,
      current: parseFloat(goalInput.current) || 0, emoji: goalInput.emoji,
      ...(editGoalId ? { id: editGoalId } : {}),
    }
    const r = await fetch("/api/goals", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const d = await r.json()
    setGoals(d.goals)
    setShowGoalForm(false)
    setEditGoalId(null)
    setGoalInput({ name: "", target: "", current: "", emoji: "🎯" })
  }

  async function deleteGoal(id: string) {
    const r = await fetch(`/api/goals?id=${id}`, { method: "DELETE" })
    const d = await r.json()
    setGoals(d.goals ?? goals.filter(g => g.id !== id))
  }

  async function saveRecurring() {
    const r = await fetch("/api/recurring", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recurringInput) })
    const d = await r.json()
    setRecurring(d.recurring)
    setShowRecurringForm(false)
    setRecurringInput({ label: "", amount: "", category: "fixed", dayOfMonth: "1" })
  }

  async function deleteRecurring(id: string) {
    const r = await fetch(`/api/recurring?id=${id}`, { method: "DELETE" })
    const d = await r.json()
    setRecurring(d.recurring ?? recurring.filter(r => r.id !== id))
  }

  async function loadInsight() {
    if (!catSorted.length) return
    setInsightLoading(true)
    setInsight("")
    const r = await fetch("/api/insight", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month: monthLabel, totalIncome, totalExpense, balance,
        categories: catSorted.slice(0, 5).map(([cat, amount]) => ({ label: CATEGORY_META[cat].label, amount })) }),
    })
    const d = await r.json()
    if (r.status === 429) setInsight("⏳ AI ถึง limit รายวันแล้ว ลองใหม่พรุ่งนี้")
    else setInsight(d.insight || "")
    setInsightLoading(false)
  }

  const totalIncome = txs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0)
  const totalExpense = txs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense
  const budget = budgets[month]
  const ringPct = budget?.salary ? (totalExpense / budget.salary) * 100 : totalIncome ? (totalExpense / totalIncome) * 100 : 0

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

      {/* Header — logo + profile only */}
      <div className="flex items-center justify-between px-5 pt-10 pb-2">
        <div className="flex items-center gap-2">
          <Image src="/Moni.png" alt="Moni" width={30} height={30} />
          <span className="font-bold text-base tracking-widest" style={{ color: C.accent }}>MONI</span>
        </div>
        {user && (
          <button onClick={logout} className="flex items-center gap-2">
            <img src={user.picture} alt="" className="w-8 h-8 rounded-full" />
          </button>
        )}
      </div>

      {/* Month picker row */}
      <div className="flex items-center justify-center gap-3 py-2 px-4">
        <button onClick={prevMonth} className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg"
          style={{ background: C.accentLight, color: C.accent }}>‹</button>
        <button onClick={() => { setPickerYear(parseInt(month.split("-")[0])); setShowMonthPicker(true) }}
          className="px-5 py-1.5 rounded-full font-semibold text-sm"
          style={{ background: C.accentLight, color: C.accent }}>
          📅 {monthLabel}
        </button>
        <button onClick={nextMonth} className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-lg"
          style={{ background: C.accentLight, color: C.accent }}>›</button>
      </div>

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setShowMonthPicker(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 shadow-xl"
            style={{ background: C.card }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: C.border }} />
            {/* Year nav */}
            <div className="flex items-center justify-between mb-5 px-2">
              <button onClick={() => setPickerYear(y => y - 1)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold"
                style={{ background: C.accentLight, color: C.accent }}>‹</button>
              <span className="font-bold text-base" style={{ color: C.text }}>{pickerYear + 543}</span>
              <button onClick={() => setPickerYear(y => y + 1)}
                disabled={pickerYear >= new Date().getFullYear()}
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold disabled:opacity-30"
                style={{ background: C.accentLight, color: C.accent }}>›</button>
            </div>
            {/* Month grid */}
            <div className="grid grid-cols-4 gap-2">
              {MONTHS_TH.map((m, i) => {
                const key = `${pickerYear}-${String(i + 1).padStart(2, "0")}`
                const isCurrent = key === month
                const isFuture = key > getMonthKey(new Date())
                return (
                  <button key={key} disabled={isFuture}
                    onClick={() => { setMonth(key); setShowMonthPicker(false) }}
                    className="py-2.5 rounded-2xl text-sm font-medium transition-all disabled:opacity-30"
                    style={{
                      background: isCurrent ? C.accent : C.accentLight,
                      color: isCurrent ? "#fff" : C.text,
                      fontWeight: isCurrent ? 700 : 400,
                      boxShadow: isCurrent ? `0 2px 8px ${C.accent}55` : "none",
                    }}>
                    {m}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── HOME TAB ── */}
      {tab === "home" && (
        <div className="px-4 space-y-4 mt-1">
          {/* Hero */}
          <div className="rounded-3xl p-5 shadow-sm" style={cardStyle}>
            <div className="flex flex-col items-center">
              <BudgetRing pct={ringPct} income={totalIncome} expense={totalExpense} />
              <p className="text-xs mt-1 mb-1" style={{ color: C.sub }}>ยอดคงเหลือเดือนนี้</p>
              <p className="text-3xl font-bold" style={{ color: balance >= 0 ? C.text : C.red }}>
                {balance < 0 ? "-" : ""}฿{fmt(Math.abs(balance))}
              </p>
              <p className="text-xs mt-0.5 mb-3" style={{ color: balance >= 0 ? C.green : C.red }}>
                {balance >= 0 ? "▲ เหลือใช้" : "▼ เกินงบ"}
              </p>
              <div className="flex w-full rounded-2xl overflow-hidden" style={{ background: C.bg }}>
                <div className="flex-1 flex flex-col items-center py-3">
                  <p className="text-xs mb-1" style={{ color: C.sub }}>รายรับ</p>
                  <p className="text-sm font-bold" style={{ color: C.green }}>+฿{fmt(totalIncome)}</p>
                </div>
                <div className="w-px" style={{ background: C.border }} />
                <div className="flex-1 flex flex-col items-center py-3">
                  <p className="text-xs mb-1" style={{ color: C.sub }}>รายจ่าย</p>
                  <p className="text-sm font-bold" style={{ color: C.red }}>-฿{fmt(totalExpense)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insight */}
          <div className="rounded-2xl p-4 shadow-sm" style={cardStyle}>
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-semibold" style={{ color: C.text }}>✨ AI วิเคราะห์</p>
              <button onClick={loadInsight} disabled={insightLoading}
                className="text-xs px-3 py-1 rounded-full disabled:opacity-40"
                style={{ background: C.accentLight, color: C.accent }}>
                {insightLoading ? "กำลังวิเคราะห์..." : insight ? "รีเฟรช" : "วิเคราะห์"}
              </button>
            </div>
            {insight
              ? <p className="text-sm leading-relaxed" style={{ color: C.sub }}>{insight}</p>
              : <p className="text-sm" style={{ color: C.border }}>กดวิเคราะห์เพื่อดู AI insight ของเดือนนี้</p>}
          </div>

          {/* Budget */}
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
            <button onClick={() => setShowBudgetForm(true)} className="w-full rounded-2xl p-4 text-sm border-2 border-dashed flex items-center justify-center gap-2"
              style={{ borderColor: C.border, color: C.sub }}>+ ตั้งเป้าหมายเดือนนี้</button>
          )}

          {/* Category bars */}
          {catSorted.length > 0 && (
            <div className="rounded-2xl p-4 shadow-sm" style={cardStyle}>
              <p className="text-sm font-semibold mb-3" style={{ color: C.text }}>รายจ่ายแยกหมวด</p>
              <div className="space-y-2.5">
                {catSorted.slice(0, 5).map(([cat, amt]) => {
                  const meta = CATEGORY_META[cat]
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: C.sub }}>{meta.emoji} {meta.label}</span>
                        <span className="font-medium" style={{ color: C.text }}>฿{fmt(amt)}</span>
                      </div>
                      <div className="h-1.5 rounded-full" style={{ background: C.accentLight }}>
                        <div className="h-1.5 rounded-full" style={{ width: `${(amt / maxCat) * 100}%`, background: meta.color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recent */}
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
            </div>
          )}
        </div>
      )}

      {/* ── LIST TAB ── */}
      {tab === "list" && (
        <div className="px-4 mt-2">
          {loading ? <div className="text-center py-12 text-sm" style={{ color: C.sub }}>กำลังโหลด...</div>
          : txs.length === 0 ? <div className="text-center py-12" style={{ color: C.sub }}>ไม่มีรายการ</div>
          : Object.entries(grouped).map(([date, items]) => (
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
          ))}
        </div>
      )}

      {/* ── STATS TAB ── */}
      {tab === "stats" && (
        <div className="px-4 space-y-4 mt-2">
          {/* Trend chart */}
          {trend.length > 0 && (() => {
            const W = 320, H = 100, pad = 8
            const maxVal = Math.max(...trend.map(t => Math.max(t.income, t.expense)), 1)
            const xStep = (W - pad * 2) / (trend.length - 1)
            const yPct = (v: number) => H - pad - (v / maxVal) * (H - pad * 2)
            const pts = (key: "income" | "expense") => trend.map((t, i) => `${pad + i * xStep},${yPct(t[key])}`).join(" ")
            return (
              <div className="rounded-2xl p-4 shadow-sm" style={cardStyle}>
                <p className="text-sm font-semibold mb-3" style={{ color: C.text }}>แนวโน้ม 6 เดือน</p>
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
                  <polyline points={pts("income")} fill="none" stroke={C.green} strokeWidth="2" strokeLinejoin="round" />
                  <polyline points={pts("expense")} fill="none" stroke={C.red} strokeWidth="2" strokeLinejoin="round" />
                  {trend.map((t, i) => (
                    <text key={t.m} x={pad + i * xStep} y={H} textAnchor="middle" fontSize="8" fill={C.sub}>
                      {MONTHS_TH[parseInt(t.m.split("-")[1]) - 1]}
                    </text>
                  ))}
                </svg>
                <div className="flex gap-4 mt-1 text-xs" style={{ color: C.sub }}>
                  <span><span style={{ color: C.green }}>─</span> รายรับ</span>
                  <span><span style={{ color: C.red }}>─</span> รายจ่าย</span>
                </div>
              </div>
            )
          })()}
          {/* Expense breakdown */}
          <div className="rounded-2xl p-5 shadow-sm" style={cardStyle}>
            <p className="text-sm font-semibold mb-4" style={{ color: C.text }}>รายจ่ายแยกหมวด {monthLabel}</p>
            {catSorted.length === 0
              ? <p className="text-sm text-center py-4" style={{ color: C.sub }}>ยังไม่มีข้อมูล</p>
              : catSorted.map(([cat, amt]) => {
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

          {/* Goals */}
          <div className="rounded-2xl p-4 shadow-sm" style={cardStyle}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold" style={{ color: C.text }}>🎯 เป้าหมายการออม</p>
              <button onClick={() => setShowGoalForm(true)} className="text-xs px-3 py-1 rounded-full"
                style={{ background: C.accentLight, color: C.accent }}>+ เพิ่ม</button>
            </div>
            {goals.length === 0
              ? <p className="text-sm text-center py-3" style={{ color: C.sub }}>ยังไม่มีเป้าหมาย</p>
              : goals.map(g => {
                const pct = Math.min((g.current / g.target) * 100, 100)
                return (
                  <div key={g.id} className="mb-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium" style={{ color: C.text }}>{g.emoji} {g.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: C.sub }}>{pct.toFixed(0)}%</span>
                        <button onClick={() => { setEditGoalId(g.id); setGoalInput({ name: g.name, target: String(g.target), current: String(g.current), emoji: g.emoji ?? "🎯" }); setShowGoalForm(true) }}
                          className="text-xs" style={{ color: C.accent }}>แก้</button>
                        <button onClick={() => deleteGoal(g.id)} className="text-xs" style={{ color: C.red }}>ลบ</button>
                      </div>
                    </div>
                    <div className="h-2 rounded-full mb-1" style={{ background: C.accentLight }}>
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: C.accent }} />
                    </div>
                    <div className="flex justify-between text-xs" style={{ color: C.sub }}>
                      <span>฿{fmt(g.current)}</span><span>เป้า ฿{fmt(g.target)}</span>
                    </div>
                  </div>
                )
              })}
          </div>

          {/* Recurring Bills */}
          <div className="rounded-2xl p-4 shadow-sm" style={cardStyle}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold" style={{ color: C.text }}>🔄 รายการประจำ</p>
              <button onClick={() => setShowRecurringForm(true)} className="text-xs px-3 py-1 rounded-full"
                style={{ background: C.accentLight, color: C.accent }}>+ เพิ่ม</button>
            </div>
            {recurring.length === 0
              ? <p className="text-sm text-center py-3" style={{ color: C.sub }}>ยังไม่มีรายการประจำ</p>
              : recurring.map(r => {
                const meta = CATEGORY_META[r.category]
                return (
                  <div key={r.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: C.border }}>
                    <span>{meta.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm" style={{ color: C.text }}>{r.label}</p>
                      <p className="text-xs" style={{ color: C.sub }}>ทุกวันที่ {r.dayOfMonth}</p>
                    </div>
                    <span className="text-sm font-medium" style={{ color: C.red }}>฿{fmt(r.amount)}</span>
                    <button onClick={() => deleteRecurring(r.id)} className="text-xs ml-1" style={{ color: C.red }}>ลบ</button>
                  </div>
                )
              })}
          </div>

          {/* Push notification */}
          <div className="rounded-2xl p-4 shadow-sm flex items-center justify-between" style={cardStyle}>
            <div>
              <p className="text-sm font-semibold" style={{ color: C.text }}>🔔 แจ้งเตือน</p>
              <p className="text-xs mt-0.5" style={{ color: C.sub }}>{pushEnabled ? "เปิดอยู่แล้ว" : "เตือนวันจ่ายรายการประจำ"}</p>
            </div>
            <button onClick={subscribePush} disabled={pushEnabled}
              className="text-xs px-3 py-1.5 rounded-full font-medium disabled:opacity-40"
              style={{ background: pushEnabled ? C.accentLight : C.accent, color: pushEnabled ? C.accent : "#fff" }}>
              {pushEnabled ? "เปิดแล้ว ✓" : "เปิดแจ้งเตือน"}
            </button>
          </div>

          {/* Summary */}
          <div className="rounded-2xl p-5 shadow-sm" style={cardStyle}>
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold" style={{ color: C.text }}>สรุป {monthLabel}</p>
              <button onClick={exportCSV} className="text-xs px-3 py-1 rounded-full"
                style={{ background: C.accentLight, color: C.accent }}>⬇ CSV</button>
            </div>
            {[
              { label: "รายรับ", val: totalIncome, color: C.green },
              { label: "รายจ่าย", val: totalExpense, color: C.red },
              { label: "คงเหลือ", val: balance, color: balance >= 0 ? C.accent : C.red },
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
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-around px-2 shadow-lg"
        style={{ background: C.card, borderTop: `1px solid ${C.border}`, paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))", paddingTop: "0.5rem" }}>
        {([
          { id: "home", icon: "⊞", label: "หน้าแรก" },
          { id: "list", icon: "☰", label: "รายการ" },
          { id: "stats", icon: "◎", label: "วิเคราะห์" },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl"
            style={{ color: tab === t.id ? C.accent : C.sub }}>
            <span className="text-xl">{t.icon}</span>
            <span className="text-xs font-medium">{t.label}</span>
          </button>
        ))}
        <button onClick={() => setShowModal(true)}
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl text-white shadow-md"
          style={{ background: C.accent }}>+</button>
        <button onClick={() => setShowImport(true)}
          className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl" style={{ color: C.sub }}>
          <span className="text-xl">📄</span>
          <span className="text-xs font-medium">สลิป</span>
        </button>
      </div>

      {showModal && <AddTxModal onClose={() => setShowModal(false)} onSaved={loadData} />}
      {showImport && <ImportSlipModal onClose={() => setShowImport(false)} onSaved={(m) => { if (m) setMonth(m); loadData() }} />}

      {/* Budget modal */}
      {showBudgetForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowBudgetForm(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 flex flex-col gap-4 shadow-xl" style={{ background: C.card }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: C.border }} />
            <h2 className="font-semibold text-lg" style={{ color: C.text }}>ตั้งเป้าหมาย {monthLabel}</h2>
            {[{ key: "salary", label: "💼 เงินเดือน" }, { key: "savingGoal", label: "🏦 เป้าออม" }, { key: "investGoal", label: "📈 เป้าลงทุน" }].map(f => (
              <input key={f.key} type="number" placeholder={f.label}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                value={budgetInput[f.key as keyof typeof budgetInput]}
                onChange={e => setBudgetInput(prev => ({ ...prev, [f.key]: e.target.value }))} />
            ))}
            <button onClick={saveBudget} className="w-full py-3 rounded-xl font-semibold text-white" style={{ background: C.accent }}>บันทึก</button>
          </div>
        </div>
      )}

      {/* Goal modal */}
      {showGoalForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => { setShowGoalForm(false); setEditGoalId(null) }}>
          <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 flex flex-col gap-4 shadow-xl" style={{ background: C.card }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: C.border }} />
            <h2 className="font-semibold text-lg" style={{ color: C.text }}>{editGoalId ? "แก้ไข" : "เพิ่ม"}เป้าหมาย</h2>
            <div className="flex gap-2">
              {["🎯","💰","🏠","✈️","🚗","📱","🎓","🏦"].map(e => (
                <button key={e} onClick={() => setGoalInput(p => ({ ...p, emoji: e }))}
                  className="text-xl p-1 rounded-lg" style={{ background: goalInput.emoji === e ? C.accentLight : "transparent" }}>{e}</button>
              ))}
            </div>
            {[{ key: "name", label: "ชื่อเป้าหมาย", type: "text" }, { key: "target", label: "เป้าหมาย (บาท)", type: "number" }, { key: "current", label: "ออมไปแล้ว (บาท)", type: "number" }].map(f => (
              <input key={f.key} type={f.type} placeholder={f.label}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                value={goalInput[f.key as keyof typeof goalInput]}
                onChange={e => setGoalInput(prev => ({ ...prev, [f.key]: e.target.value }))} />
            ))}
            <button onClick={saveGoal} className="w-full py-3 rounded-xl font-semibold text-white" style={{ background: C.accent }}>บันทึก</button>
          </div>
        </div>
      )}

      {/* Recurring modal */}
      {showRecurringForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setShowRecurringForm(false)}>
          <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 flex flex-col gap-4 shadow-xl" style={{ background: C.card }} onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-2" style={{ background: C.border }} />
            <h2 className="font-semibold text-lg" style={{ color: C.text }}>เพิ่มรายการประจำ</h2>
            <input type="text" placeholder="ชื่อรายการ" className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
              value={recurringInput.label} onChange={e => setRecurringInput(p => ({ ...p, label: e.target.value }))} />
            <input type="number" placeholder="จำนวนเงิน" className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
              value={recurringInput.amount} onChange={e => setRecurringInput(p => ({ ...p, amount: e.target.value }))} />
            <input type="number" placeholder="วันที่ของเดือน (1-31)" min="1" max="31"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
              value={recurringInput.dayOfMonth} onChange={e => setRecurringInput(p => ({ ...p, dayOfMonth: e.target.value }))} />
            <select className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
              value={recurringInput.category} onChange={e => setRecurringInput(p => ({ ...p, category: e.target.value as Category }))}>
              {(["fixed","variable","invest","saving","provident_fund","tax"] as Category[]).map(c => (
                <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>
              ))}
            </select>
            <button onClick={saveRecurring} className="w-full py-3 rounded-xl font-semibold text-white" style={{ background: C.accent }}>บันทึก</button>
          </div>
        </div>
      )}
    </div>
  )
}
