export type Category =
  | "salary"          // เงินเดือน
  | "ot"              // ค่าล่วงเวลา
  | "income_other"    // รายรับอื่น
  | "slip_deduction"  // รายการหักหน้าสลิป
  | "credit_card"     // รายการบัตรเครดิต
  | "fixed"           // ค่าใช้จ่ายประจำ
  | "variable"        // ค่าใช้จ่ายทั่วไป
  | "invest"          // การลงทุน
  | "saving"          // ออมเงิน

export type TxType = "income" | "expense"

export interface Transaction {
  id: string
  date: string
  type: TxType
  category: Category
  label: string
  amount: number
  note?: string
}

export interface MonthBudget {
  salary: number
  savingGoal: number
  investGoal: number
}

export interface Goal {
  id: string
  name: string
  target: number
  current: number
  status: "active" | "completed" | "paused"
  emoji?: string
}

export interface RecurringBill {
  id: string
  label: string
  amount: number
  category: Category
  dayOfMonth: number
  active: boolean
}

export interface UserData {
  transactions: Transaction[]
  budgets: Record<string, MonthBudget>
  goals?: Goal[]
  recurring?: RecurringBill[]
  recurringApplied?: string[] // "YYYY-MM" months already auto-applied
}

export const CATEGORY_META: Record<Category, { label: string; emoji: string; type: TxType; color: string }> = {
  salary:          { label: "เงินเดือน",             emoji: "💼", type: "income",  color: "#10B981" },
  ot:              { label: "ค่าล่วงเวลา",           emoji: "⏰", type: "income",  color: "#34D399" },
  income_other:    { label: "รายรับอื่น",             emoji: "💰", type: "income",  color: "#6EE7B7" },
  slip_deduction:  { label: "หักหน้าสลิป",           emoji: "📋", type: "expense", color: "#64748B" },
  credit_card:     { label: "บัตรเครดิต",             emoji: "💳", type: "expense", color: "#8B5CF6" },
  fixed:           { label: "ค่าใช้จ่ายประจำ",        emoji: "🔄", type: "expense", color: "#F59E0B" },
  variable:        { label: "ค่าใช้จ่ายทั่วไป",      emoji: "🛒", type: "expense", color: "#F43F5E" },
  invest:          { label: "การลงทุน",               emoji: "📈", type: "expense", color: "#6C63FF" },
  saving:          { label: "ออมเงิน",                emoji: "🏦", type: "expense", color: "#A78BFA" },
}
