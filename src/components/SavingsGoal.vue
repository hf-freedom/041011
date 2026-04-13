<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import type { SavingsGoal, Transaction } from '../types'
import { 
  loadSavingsGoals, 
  saveSavingsGoals, 
  generateId, 
  formatMoney,
  getToday 
} from '../utils/storage'

const props = defineProps<{
  transactions: Transaction[]
}>()

const goals = ref<SavingsGoal[]>([])
const showForm = ref(false)
const editingGoal = ref<SavingsGoal | null>(null)

const goalName = ref('')
const targetAmount = ref(0)
const deadline = ref('')

const iconOptions = ['🎯', '🏖️', '🚗', '🏠', '💻', '📚', '🎮', '💍', '🎁', '💰']
const colorOptions = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63', '#00BCD4']

onMounted(() => {
  goals.value = loadSavingsGoals()
  updateGoalProgress()
})

watch(() => props.transactions, () => {
  updateGoalProgress()
}, { deep: true, immediate: true })

function updateGoalProgress() {
  const totalIncome = props.transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const totalExpense = props.transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  
  const savings = totalIncome - totalExpense
  
  goals.value = goals.value.map(goal => ({
    ...goal,
    currentAmount: Math.min(savings, goal.targetAmount)
  }))
  
  saveSavingsGoals(goals.value)
}

function openCreateForm() {
  editingGoal.value = null
  goalName.value = ''
  targetAmount.value = 0
  deadline.value = ''
  showForm.value = true
}

function openEditForm(goal: SavingsGoal) {
  editingGoal.value = goal
  goalName.value = goal.name
  targetAmount.value = goal.targetAmount
  deadline.value = goal.deadline || ''
  showForm.value = true
}

function handleSubmit() {
  if (!goalName.value.trim()) {
    alert('请输入目标名称')
    return
  }
  if (targetAmount.value <= 0) {
    alert('请输入有效目标金额')
    return
  }

  if (editingGoal.value) {
    const index = goals.value.findIndex(g => g.id === editingGoal.value!.id)
    if (index >= 0) {
      goals.value[index] = {
        ...goals.value[index],
        name: goalName.value.trim(),
        targetAmount: targetAmount.value,
        deadline: deadline.value || undefined,
      }
    }
  } else {
    const newGoal: SavingsGoal = {
      id: generateId(),
      name: goalName.value.trim(),
      targetAmount: targetAmount.value,
      currentAmount: 0,
      createdAt: Date.now(),
      deadline: deadline.value || undefined,
      icon: iconOptions[Math.floor(Math.random() * iconOptions.length)],
      color: colorOptions[Math.floor(Math.random() * colorOptions.length)],
    }
    goals.value.push(newGoal)
  }

  saveSavingsGoals(goals.value)
  showForm.value = false
  editingGoal.value = null
  updateGoalProgress()
}

function deleteGoal(id: string) {
  if (confirm('确定要删除这个储蓄目标吗？')) {
    goals.value = goals.value.filter(g => g.id !== id)
    saveSavingsGoals(goals.value)
  }
}

function getProgress(goal: SavingsGoal): number {
  if (goal.targetAmount <= 0) return 0
  return Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
}

function getDaysRemaining(deadline: string): number {
  const today = new Date()
  const deadlineDate = new Date(deadline)
  const diff = deadlineDate.getTime() - today.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function formatDeadline(deadline: string): string {
  const days = getDaysRemaining(deadline)
  if (days < 0) return `已过期 ${Math.abs(days)} 天`
  if (days === 0) return '今天截止'
  return `剩余 ${days} 天`
}
</script>

<template>
  <div class="savings-goal">
    <div class="goal-header">
      <h3>🎯 储蓄目标</h3>
      <button class="add-goal-btn" @click="openCreateForm">+ 新目标</button>
    </div>

    <div v-if="goals.length === 0" class="no-goals">
      <span class="no-goal-icon">🎯</span>
      <p>还没有储蓄目标</p>
      <p class="hint">点击"新目标"创建一个储蓄计划</p>
    </div>

    <div v-else class="goal-list">
      <div 
        v-for="goal in goals" 
        :key="goal.id"
        class="goal-card"
      >
        <div class="goal-info">
          <div class="goal-icon" :style="{ background: goal.color + '20', color: goal.color }">
            {{ goal.icon }}
          </div>
          <div class="goal-details">
            <div class="goal-name">{{ goal.name }}</div>
            <div v-if="goal.deadline" class="goal-deadline" :class="{ overdue: getDaysRemaining(goal.deadline) < 0 }">
              {{ formatDeadline(goal.deadline) }}
            </div>
          </div>
          <div class="goal-actions">
            <button class="action-btn" @click="openEditForm(goal)" title="编辑">✏️</button>
            <button class="action-btn" @click="deleteGoal(goal.id)" title="删除">🗑️</button>
          </div>
        </div>

        <div class="progress-section">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ 
                width: getProgress(goal) + '%',
                background: goal.color 
              }"
            ></div>
          </div>
          <div class="progress-info">
            <span class="progress-amount">
              ¥{{ formatMoney(goal.currentAmount) }} / ¥{{ formatMoney(goal.targetAmount) }}
            </span>
            <span class="progress-percent" :style="{ color: goal.color }">
              {{ getProgress(goal) }}%
            </span>
          </div>
        </div>

        <div v-if="getProgress(goal) >= 100" class="goal-complete">
          🎉 恭喜达成目标！
        </div>
      </div>
    </div>

    <div v-if="showForm" class="modal-overlay" @click.self="showForm = false">
      <div class="modal">
        <div class="form-container">
          <h3>{{ editingGoal ? '编辑目标' : '创建储蓄目标' }}</h3>
          
          <div class="form-group">
            <label>目标名称</label>
            <input 
              type="text" 
              v-model="goalName" 
              placeholder="例如：旅行基金"
              maxlength="20"
            />
          </div>

          <div class="form-group">
            <label>目标金额</label>
            <div class="amount-input">
              <span class="currency">¥</span>
              <input 
                type="number" 
                v-model.number="targetAmount" 
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          <div class="form-group">
            <label>截止日期（可选）</label>
            <input type="date" v-model="deadline" :min="getToday()" />
          </div>

          <div class="form-actions">
            <button class="btn-cancel" @click="showForm = false">取消</button>
            <button class="btn-submit" @click="handleSubmit">
              {{ editingGoal ? '保存' : '创建' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.savings-goal {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.goal-header h3 {
  margin: 0;
  font-size: 16px;
  color: #333;
}

.add-goal-btn {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.add-goal-btn:hover {
  background: #43A047;
}

.no-goals {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 30px;
  color: #999;
}

.no-goal-icon {
  font-size: 40px;
  margin-bottom: 12px;
}

.no-goals p {
  margin: 4px 0;
}

.hint {
  font-size: 13px;
  color: #bbb;
}

.goal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-card {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 10px;
  transition: transform 0.2s;
}

.goal-card:hover {
  transform: translateY(-2px);
}

.goal-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.goal-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  font-size: 20px;
}

.goal-details {
  flex: 1;
}

.goal-name {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}

.goal-deadline {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
}

.goal-deadline.overdue {
  color: #f44336;
}

.goal-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.goal-card:hover .goal-actions {
  opacity: 1;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.action-btn:hover {
  background: #e0e0e0;
}

.progress-section {
  margin-top: 8px;
}

.progress-bar {
  height: 8px;
  background: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 13px;
}

.progress-amount {
  color: #666;
}

.progress-percent {
  font-weight: 600;
}

.goal-complete {
  margin-top: 12px;
  padding: 8px 12px;
  background: #e8f5e9;
  border-radius: 6px;
  text-align: center;
  font-size: 13px;
  color: #4CAF50;
  font-weight: 500;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 400px;
}

.form-container {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.form-container h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="date"] {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus {
  border-color: #4CAF50;
  outline: none;
}

.amount-input {
  display: flex;
  align-items: center;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.2s;
}

.amount-input:focus-within {
  border-color: #4CAF50;
}

.currency {
  padding: 12px 16px;
  background: #f5f5f5;
  font-size: 16px;
  color: #666;
}

.amount-input input {
  flex: 1;
  border: none;
  padding: 12px;
  font-size: 16px;
  outline: none;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-cancel:hover {
  background: #e0e0e0;
}

.btn-submit {
  background: #4CAF50;
  color: white;
}

.btn-submit:hover {
  background: #43A047;
}
</style>
