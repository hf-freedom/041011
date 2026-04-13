<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Pie, Bar } from 'vue-chartjs'
import type { Transaction, WeeklyData, CategoryChartData } from '../types'
import { calculateWeeklyData, calculateCategoryPieData, formatMoney } from '../utils/storage'

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const props = defineProps<{
  transactions: Transaction[]
  currentMonth: string
}>()

const activeTab = ref<'pie' | 'bar'>('pie')
const weeklyData = ref<WeeklyData[]>([])
const categoryData = ref<CategoryChartData[]>([])

watch(() => [props.transactions, props.currentMonth], () => {
  updateChartData()
}, { immediate: true })

function updateChartData() {
  weeklyData.value = calculateWeeklyData(props.transactions, props.currentMonth)
  categoryData.value = calculateCategoryPieData(props.transactions, props.currentMonth)
}

const pieChartData = computed(() => ({
  labels: categoryData.value.map(d => d.category),
  datasets: [{
    data: categoryData.value.map(d => d.amount),
    backgroundColor: categoryData.value.map(d => d.color),
    borderWidth: 2,
    borderColor: '#fff',
  }]
}))

const barChartData = computed(() => ({
  labels: weeklyData.value.map(d => d.week),
  datasets: [
    {
      label: '收入',
      data: weeklyData.value.map(d => d.income),
      backgroundColor: '#4CAF50',
      borderRadius: 6,
    },
    {
      label: '支出',
      data: weeklyData.value.map(d => d.expense),
      backgroundColor: '#f44336',
      borderRadius: 6,
    }
  ]
}))

const pieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 16,
        usePointStyle: true,
        font: { size: 12 }
      }
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          const value = context.raw as number
          const total = categoryData.value.reduce((sum, d) => sum + d.amount, 0)
          const percentage = total > 0 ? Math.round((value / total) * 100) : 0
          return `¥${formatMoney(value)} (${percentage}%)`
        }
      }
    }
  }
}

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 16,
        usePointStyle: true,
        font: { size: 12 }
      }
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          return `¥${formatMoney(context.raw as number)}`
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        callback: function(value: any) {
          return '¥' + value
        }
      }
    }
  }
}
</script>

<template>
  <div class="statistics-chart">
    <div class="chart-header">
      <h3>📊 统计图表</h3>
      <div class="tab-buttons">
        <button 
          :class="['tab-btn', { active: activeTab === 'pie' }]"
          @click="activeTab = 'pie'"
        >
          支出占比
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'bar' }]"
          @click="activeTab = 'bar'"
        >
          周趋势
        </button>
      </div>
    </div>

    <div class="chart-content">
      <div v-if="activeTab === 'pie'" class="chart-container">
        <div v-if="categoryData.length === 0" class="no-data">
          <span class="no-data-icon">📈</span>
          <p>本月暂无支出数据</p>
        </div>
        <template v-else>
          <div class="pie-chart">
            <Pie :data="pieChartData" :options="pieOptions" />
          </div>
          <div class="category-list">
            <div 
              v-for="item in categoryData" 
              :key="item.category"
              class="category-item"
            >
              <span class="category-icon">{{ item.icon }}</span>
              <span class="category-name">{{ item.category }}</span>
              <span class="category-amount">¥{{ formatMoney(item.amount) }}</span>
              <span class="category-percent">{{ item.percentage }}%</span>
            </div>
          </div>
        </template>
      </div>

      <div v-if="activeTab === 'bar'" class="chart-container">
        <div v-if="weeklyData.every(d => d.income === 0 && d.expense === 0)" class="no-data">
          <span class="no-data-icon">📊</span>
          <p>本月暂无数据</p>
        </div>
        <div v-else class="bar-chart">
          <Bar :data="barChartData" :options="barOptions" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.statistics-chart {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.chart-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.tab-buttons {
  display: flex;
  gap: 8px;
}

.tab-btn {
  padding: 8px 16px;
  border: none;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: #4CAF50;
  color: white;
}

.tab-btn:hover:not(.active) {
  background: #e0e0e0;
}

.chart-content {
  min-height: 280px;
}

.chart-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.pie-chart {
  height: 200px;
}

.bar-chart {
  height: 280px;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #999;
}

.no-data-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.category-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.category-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 13px;
}

.category-icon {
  font-size: 18px;
}

.category-name {
  flex: 1;
  color: #333;
}

.category-amount {
  color: #f44336;
  font-weight: 500;
}

.category-percent {
  color: #999;
  min-width: 40px;
  text-align: right;
}
</style>
