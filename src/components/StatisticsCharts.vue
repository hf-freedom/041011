<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, computed } from 'vue'
import { Chart, registerables } from 'chart.js'
import type { Transaction } from '../types'
import { CATEGORY_LABELS, CATEGORY_ICONS } from '../types'
import { calculateWeeklySummary, getExpenseByCategory } from '../utils/storage'

Chart.register(...registerables)

const props = defineProps<{
  transactions: Transaction[]
  currentMonth: string
}>()

const pieChartRef = ref<HTMLCanvasElement | null>(null)
const barChartRef = ref<HTMLCanvasElement | null>(null)
let pieChart: Chart | null = null
let barChart: Chart | null = null

const hasNoExpenseData = computed(() => {
  return getExpenseByCategory(props.transactions, props.currentMonth).length === 0
})

const COLORS = [
  '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
  '#FF9F40', '#FF6384', '#C9CBCF', '#7BC225', '#F7464A'
]

function renderPieChart() {
  if (!pieChartRef.value) return

  if (pieChart) {
    pieChart.destroy()
  }

  const expenseData = getExpenseByCategory(props.transactions, props.currentMonth)
  const labels = expenseData.map(item => CATEGORY_LABELS[item.category as keyof typeof CATEGORY_LABELS] || item.category)
  const data = expenseData.map(item => item.amount)

  if (data.length === 0) {
    return
  }

  const ctx = pieChartRef.value.getContext('2d')
  if (!ctx) return

  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: COLORS.slice(0, data.length),
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true
          }
        },
        title: {
          display: true,
          text: '支出类别占比',
          font: {
            size: 16,
            weight: '600'
          },
          padding: {
            bottom: 20
          }
        }
      }
    }
  })
}

function renderBarChart() {
  if (!barChartRef.value) return

  if (barChart) {
    barChart.destroy()
  }

  const weeklyData = calculateWeeklySummary(props.transactions, props.currentMonth)
  const labels = weeklyData.map(item => item.week)
  const incomeData = weeklyData.map(item => item.income)
  const expenseData = weeklyData.map(item => item.expense)

  const ctx = barChartRef.value.getContext('2d')
  if (!ctx) return

  barChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: '收入',
          data: incomeData,
          backgroundColor: 'rgba(76, 175, 80, 0.7)',
          borderColor: 'rgba(76, 175, 80, 1)',
          borderWidth: 1
        },
        {
          label: '支出',
          data: expenseData,
          backgroundColor: 'rgba(244, 67, 54, 0.7)',
          borderColor: 'rgba(244, 67, 54, 1)',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 15,
            usePointStyle: true
          }
        },
        title: {
          display: true,
          text: '每周收支趋势',
          font: {
            size: 16,
            weight: '600'
          },
          padding: {
            bottom: 20
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  })
}

onMounted(() => {
  renderPieChart()
  renderBarChart()
})

watch(() => props.currentMonth, () => {
  renderPieChart()
  renderBarChart()
})

watch(() => props.transactions, () => {
  renderPieChart()
  renderBarChart()
}, { deep: true })

onUnmounted(() => {
  if (pieChart) pieChart.destroy()
  if (barChart) barChart.destroy()
})
</script>

<template>
  <div class="charts-container">
    <div class="chart-card">
      <div class="chart-wrapper">
        <canvas ref="pieChartRef"></canvas>
      </div>
      <div v-if="hasNoExpenseData" class="no-chart-data">
        暂无支出数据
      </div>
    </div>
    <div class="chart-card">
      <div class="chart-wrapper">
        <canvas ref="barChartRef"></canvas>
      </div>
    </div>
  </div>
</template>

<style scoped>
.charts-container {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.chart-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  min-height: 320px;
  position: relative;
}

.chart-wrapper {
  height: 280px;
  position: relative;
}

.no-chart-data {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #999;
  font-size: 14px;
}

@media (max-width: 900px) {
  .charts-container {
    grid-template-columns: 1fr;
  }
}
</style>
