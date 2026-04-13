<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { Chart, PieController, BarController, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend } from 'chart.js'
import type { Transaction, MonthlySummary, WeeklyData } from '../types'
import { CATEGORY_LABELS, CATEGORY_ICONS, EXPENSE_CATEGORIES } from '../types'
import { formatMoney, getCurrentMonth } from '../utils/storage'

Chart.register(PieController, BarController, ArcElement, BarElement, CategoryScale, LinearScale, Title, Tooltip, Legend)

const props = defineProps<{
  transactions: Transaction[]
}>()

const currentMonth = ref(getCurrentMonth())
const pieChartRef = ref<HTMLCanvasElement | null>(null)
const barChartRef = ref<HTMLCanvasElement | null>(null)
let pieChart: Chart | null = null
let barChart: Chart | null = null

const monthTransactions = computed(() => {
  return props.transactions.filter(t => t.date.startsWith(currentMonth.value))
})

const expenseByCategory = computed(() => {
  const result: Record<string, number> = {}
  monthTransactions.value
    .filter(t => t.type === 'expense')
    .forEach(t => {
      result[t.category] = (result[t.category] || 0) + t.amount
    })
  return result
})

const weeklyData = computed((): WeeklyData[] => {
  const weeks: Record<string, WeeklyData> = {}
  
  monthTransactions.value.forEach(t => {
    const date = new Date(t.date)
    const weekStart = new Date(date)
    weekStart.setDate(date.getDate() - date.getDay())
    const weekKey = weekStart.toISOString().split('T')[0]
    
    if (!weeks[weekKey]) {
      weeks[weekKey] = { week: weekKey, income: 0, expense: 0 }
    }
    
    if (t.type === 'income') {
      weeks[weekKey].income += t.amount
    } else {
      weeks[weekKey].expense += t.amount
    }
  })
  
  return Object.values(weeks).sort((a, b) => a.week.localeCompare(b.week))
})

const monthDisplay = computed(() => {
  const [year, month] = currentMonth.value.split('-')
  return `${year}年${parseInt(month)}月`
})

function prevMonth() {
  const [year, month] = currentMonth.value.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  currentMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function nextMonth() {
  const [year, month] = currentMonth.value.split('-').map(Number)
  const date = new Date(year, month, 1)
  currentMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function goToToday() {
  currentMonth.value = getCurrentMonth()
}

function initPieChart() {
  if (!pieChartRef.value) return
  
  const data = expenseByCategory.value
  const labels = Object.keys(data).map(k => CATEGORY_LABELS[k as keyof typeof CATEGORY_LABELS])
  const values = Object.values(data)
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE']
  
  if (pieChart) {
    pieChart.destroy()
  }
  
  if (values.length === 0) {
    pieChart = new Chart(pieChartRef.value, {
      type: 'pie',
      data: {
        labels: ['暂无数据'],
        datasets: [{
          data: [1],
          backgroundColor: ['#E0E0E0']
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '支出类别占比'
          }
        }
      }
    })
    return
  }
  
  pieChart = new Chart(pieChartRef.value, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, values.length)
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: '支出类别占比'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.label || ''
              const value = context.parsed || 0
              const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
              const percentage = ((value / total) * 100).toFixed(1)
              return `${label}: ¥${formatMoney(value)} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

function initBarChart() {
  if (!barChartRef.value) return
  
  const data = weeklyData.value
  
  if (barChart) {
    barChart.destroy()
  }
  
  if (data.length === 0) {
    barChart = new Chart(barChartRef.value, {
      type: 'bar',
      data: {
        labels: ['暂无数据'],
        datasets: [
          { label: '收入', data: [0], backgroundColor: '#4CAF50' },
          { label: '支出', data: [0], backgroundColor: '#FF5252' }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: '每周收支趋势'
          }
        }
      }
    })
    return
  }
  
  const labels = data.map(d => {
    const date = new Date(d.week)
    return `第${Math.ceil(date.getDate() / 7)}周`
  })
  
  barChart = new Chart(barChartRef.value, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '收入',
          data: data.map(d => d.income),
          backgroundColor: '#4CAF50'
        },
        {
          label: '支出',
          data: data.map(d => d.expense),
          backgroundColor: '#FF5252'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: '每周收支趋势'
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const label = context.dataset.label || ''
              const value = context.parsed.y || 0
              return `${label}: ¥${formatMoney(value)}`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: (value: any) => `¥${value}`
          }
        }
      }
    }
  })
}

watch([expenseByCategory, weeklyData], () => {
  initPieChart()
  initBarChart()
}, { deep: true })

onMounted(() => {
  initPieChart()
  initBarChart()
})

onUnmounted(() => {
  if (pieChart) pieChart.destroy()
  if (barChart) barChart.destroy()
})
</script>

<template>
  <div class="statistics-panel">
    <div class="panel-header">
      <h2>📊 统计与图表</h2>
      <div class="month-nav">
        <button class="nav-btn" @click="prevMonth">‹</button>
        <span class="current-month">{{ monthDisplay }}</span>
        <button class="nav-btn" @click="nextMonth">›</button>
        <button class="today-btn" @click="goToToday">今</button>
      </div>
    </div>
    
    <div class="charts-container">
      <div class="chart-wrapper">
        <canvas ref="pieChartRef"></canvas>
      </div>
      <div class="chart-wrapper">
        <canvas ref="barChartRef"></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
.statistics-panel {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 24px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.month-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.nav-btn {
  width: 32px;
  height: 32px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: #f5f5f5;
  border-color: #ccc;
}

.current-month {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  min-width: 100px;
  text-align: center;
}

.today-btn {
  padding: 6px 12px;
  border: 1px solid #4CAF50;
  background: white;
  color: #4CAF50;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.today-btn:hover {
  background: #4CAF50;
  color: white;
}

.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.chart-wrapper {
  height: 300px;
  position: relative;
}

@media (max-width: 768px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}
</style>
