import type { Transaction, DailySummary, MonthlySummary, SavingsGoal, WeeklyData, CategoryChartData } from '../types'
import { CATEGORY_LABELS, EXPENSE_CATEGORIES } from '../types'

const STORAGE_KEY = 'finance_transactions'
const GOALS_STORAGE_KEY = 'finance_savings_goals'

export function loadTransactions(): Transaction[] {
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return []
  try {
    return JSON.parse(data) as Transaction[]
  } catch {
    return []
  }
}

export function saveTransactions(transactions: Transaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]
  return `${year}-${month}-${day} ${weekDay}`
}

export function formatMoney(amount: number): string {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function getToday(): string {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

export function getCurrentMonth(): string {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
}

export function groupByDate(transactions: Transaction[]): DailySummary[] {
  const grouped: Record<string, DailySummary> = {}

  const sorted = [...transactions].sort((a, b) => {
    const dateCompare = b.date.localeCompare(a.date)
    if (dateCompare !== 0) return dateCompare
    return b.createdAt - a.createdAt
  })

  for (const t of sorted) {
    if (!grouped[t.date]) {
      grouped[t.date] = {
        date: t.date,
        income: 0,
        expense: 0,
        transactions: [],
      }
    }
    grouped[t.date].transactions.push(t)
    if (t.type === 'income') {
      grouped[t.date].income += t.amount
    } else {
      grouped[t.date].expense += t.amount
    }
  }

  return Object.values(grouped)
}

export function calculateMonthlySummary(transactions: Transaction[], month: string): MonthlySummary {
  const monthTransactions = transactions.filter(t => t.date.startsWith(month))

  let totalIncome = 0
  let totalExpense = 0
  const categoryBreakdown: Record<string, number> = {}

  for (const t of monthTransactions) {
    if (t.type === 'income') {
      totalIncome += t.amount
    } else {
      totalExpense += t.amount
    }
    const key = `${t.type}-${t.category}`
    categoryBreakdown[key] = (categoryBreakdown[key] || 0) + t.amount
  }

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    categoryBreakdown,
  }
}

export function loadSavingsGoals(): SavingsGoal[] {
  const data = localStorage.getItem(GOALS_STORAGE_KEY)
  if (!data) return []
  try {
    return JSON.parse(data) as SavingsGoal[]
  } catch {
    return []
  }
}

export function saveSavingsGoals(goals: SavingsGoal[]): void {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
}

export function calculateWeeklyData(transactions: Transaction[], month: string): WeeklyData[] {
  const monthTransactions = transactions.filter(t => t.date.startsWith(month))
  const weeks: Record<string, { income: number; expense: number }> = {}

  for (const t of monthTransactions) {
    const date = new Date(t.date)
    const weekNum = Math.ceil(date.getDate() / 7)
    const weekKey = `第${weekNum}周`

    if (!weeks[weekKey]) {
      weeks[weekKey] = { income: 0, expense: 0 }
    }

    if (t.type === 'income') {
      weeks[weekKey].income += t.amount
    } else {
      weeks[weekKey].expense += t.amount
    }
  }

  const result: WeeklyData[] = []
  for (let i = 1; i <= 5; i++) {
    const weekKey = `第${i}周`
    result.push({
      week: weekKey,
      income: weeks[weekKey]?.income || 0,
      expense: weeks[weekKey]?.expense || 0,
    })
  }

  return result
}

export function calculateCategoryPieData(transactions: Transaction[], month: string): CategoryChartData[] {
  const monthTransactions = transactions.filter(t => t.date.startsWith(month) && t.type === 'expense')

  const categoryTotals: Record<string, number> = {}
  let totalExpense = 0

  for (const t of monthTransactions) {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount
    totalExpense += t.amount
  }

  const colors = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF']

  return Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount], index) => ({
      category: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category,
      amount,
      percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0,
      color: colors[index % colors.length],
      icon: EXPENSE_CATEGORIES.find(c => c.value === category)?.icon || '📦',
    }))
}

export function getAvailableMonths(transactions: Transaction[]): string[] {
  const months = new Set<string>()
  for (const t of transactions) {
    months.add(t.date.substring(0, 7))
  }
  return Array.from(months).sort().reverse()
}
