export type Category =
  | "salary"         // เงินเดือน
  | "ot"             // ค่าล่วงเวลา
  | "income_other"   // รายรับอื่น
  | "tax"            // ภาษีหัก ณ ที่จ่าย
  | "provident_fund" // กองทุนสำรองเลี้ยงชีพ
  | "fixed"          // ค่าใช้จ่ายประจำ
  | "variable"       // ค่าใช้จ่ายทั่วไป
  | "invest"         // การลงทุน
  | "saving"         // ออมเงิน

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
}

export const CATEGORY_META: Record<Category, { label: string; emoji: string; type: TxType; color: string }> = {
  salary:         { label: "เงินเดือน",             emoji: "💼", type: "income",  color: "#10B981" },
  ot:             { label: "ค่าล่วงเวลา",           emoji: "⏰", type: "income",  color: "#34D399" },
  income_other:   { label: "รายรับอื่น",             emoji: "💰", type: "income",  color: "#6EE7B7" },
  tax:            { label: "ภาษีหัก ณ ที่จ่าย",     emoji: "🏛️", type: "expense", color: "#94A3B8" },
  provident_fund: { label: "กองทุนสำรองเลี้ยงชีพ", emoji: "🛡️", type: "expense", color: "#60A5FA" },
  fixed:          { label: "ค่าใช้จ่ายประจำ",        emoji: "🔄", type: "expense", color: "#F59E0B" },
  variable:       { label: "ค่าใช้จ่ายทั่วไป",      emoji: "🛒", type: "expense", color: "#F43F5E" },
  invest:         { label: "การลงทุน",               emoji: "📈", type: "expense", color: "#6C63FF" },
  saving:         { label: "ออมเงิน",                emoji: "🏦", type: "expense", color: "#A78BFA" },
}
