export type Category =
  | "salary"       // เงินเดือน
  | "income_other" // รายรับอื่น
  | "fixed"        // ค่าใช้จ่ายประจำ (บิล, ค่าเช่า)
  | "variable"     // ค่าใช้จ่ายทั่วไป (ของกิน, shopping)
  | "invest"       // การลงทุน (หุ้น, กองทุน)
  | "saving"       // ออมเงิน

export type TxType = "income" | "expense"

export interface Transaction {
  id: string
  date: string        // ISO date
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

export interface UserData {
  transactions: Transaction[]
  budgets: Record<string, MonthBudget> // key = "2026-06"
}

export const CATEGORY_META: Record<Category, { label: string; emoji: string; type: TxType; color: string }> = {
  salary:       { label: "เงินเดือน",          emoji: "💼", type: "income",  color: "#10B981" },
  income_other: { label: "รายรับอื่น",          emoji: "💰", type: "income",  color: "#34D399" },
  fixed:        { label: "ค่าใช้จ่ายประจำ",     emoji: "🔄", type: "expense", color: "#F59E0B" },
  variable:     { label: "ค่าใช้จ่ายทั่วไป",   emoji: "🛒", type: "expense", color: "#F43F5E" },
  invest:       { label: "การลงทุน",            emoji: "📈", type: "expense", color: "#6C63FF" },
  saving:       { label: "ออมเงิน",             emoji: "🏦", type: "expense", color: "#A78BFA" },
}
