<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import type { SavingGoal, Transaction } from '../types'
import { INCOME_CATEGORIES } from '../types'
import { loadGoals, saveGoals, generateId, formatMoney, getToday } from '../utils/storage'

const props = defineProps<{
  transactions: Transaction[]
}>()

const goals = ref<SavingGoal[]>([])
const showGoalForm = ref(false)

const newGoal = ref({
  name: '',
  targetAmount: 0,
  deadline: '',
  icon: '🎯',
  description: '',
  linkedCategory: null as string | null,
  autoDeposit: false
})

const GOAL_ICONS = ['🎯', '✈️', '🏠', '🚗', '💍', '📱', '💻', '🎓', '🏥', '🎁']

onMounted(() => {
  goals.value = loadGoals()
})

watch(() => props.transactions, () => {
  updateGoalAmountsFromTransactions()
}, { deep: true, immediate: true })

function updateGoalAmountsFromTransactions() {
  let changed = false
  
  for (const goal of goals.value) {
    if (goal.autoDeposit && goal.linkedCategory) {
      const linkedIncomes = props.transactions.filter(t => 
        t.type === 'income' && 
        t.category === goal.linkedCategory
      )
      const totalFromLinked = linkedIncomes.reduce((sum, t) => sum + t.amount, 0)
      
      if (goal.currentAmount !== totalFromLinked) {
        goal.currentAmount = totalFromLinked
        changed = true
      }
    }
  }
  
  if (changed) {
    saveGoals(goals.value)
  }
}

function openGoalForm() {
  newGoal.value = {
    name: '',
    targetAmount: 0,
    deadline: '',
    icon: '🎯',
    description: '',
    linkedCategory: null,
    autoDeposit: false
  }
  showGoalForm.value = true
}

function closeGoalForm() {
  showGoalForm.value = false
}

function createGoal() {
  if (!newGoal.value.name || !newGoal.value.targetAmount) return

  const goal: SavingGoal = {
    id: generateId(),
    name: newGoal.value.name,
    targetAmount: newGoal.value.targetAmount,
    currentAmount: 0,
    deadline: newGoal.value.deadline,
    icon: newGoal.value.icon,
    description: newGoal.value.description,
    linkedCategory: newGoal.value.linkedCategory,
    autoDeposit: newGoal.value.autoDeposit,
    createdAt: Date.now()
  }

  goals.value.push(goal)
  saveGoals(goals.value)
  closeGoalForm()
}

function deleteGoal(id: string) {
  if (confirm('确定要删除这个储蓄目标吗？')) {
    goals.value = goals.value.filter(g => g.id !== id)
    saveGoals(goals.value)
  }
}

function addToGoal(goal: SavingGoal) {
  const amount = prompt('请输入存入金额：')
  if (!amount || isNaN(Number(amount))) return
  
  const numAmount = Number(amount)
  if (numAmount <= 0) return

  goal.currentAmount += numAmount
  goal.autoDeposit = false
  saveGoals(goals.value)
}

function toggleAutoDeposit(goal: SavingGoal) {
  goal.autoDeposit = !goal.autoDeposit
  if (goal.autoDeposit && goal.linkedCategory) {
    const linkedIncomes = props.transactions.filter(t => 
      t.type === 'income' && 
      t.category === goal.linkedCategory
    )
    goal.currentAmount = linkedIncomes.reduce((sum, t) => sum + t.amount, 0)
  }
  saveGoals(goals.value)
}

function getProgress(goal: SavingGoal): number {
  return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
}

function getCategoryLabel(category: string): string {
  const cat = INCOME_CATEGORIES.find(c => c.value === category)
  return cat ? cat.label : category
}
</script>

<template>
  <div class="saving-goals">
    <div class="goals-header">
      <h3>🎯 储蓄目标</h3>
      <button class="add-goal-btn" @click="openGoalForm">
        + 新建目标
      </button>
    </div>

    <div v-if="goals.length === 0" class="no-goals">
      <div class="no-goals-icon">🏦</div>
      <p>还没有储蓄目标</p>
      <p class="hint">点击"新建目标"开始规划你的储蓄计划</p>
    </div>

    <div v-else class="goals-list">
      <div v-for="goal in goals" :key="goal.id" class="goal-card">
        <div class="goal-header">
          <span class="goal-icon">{{ goal.icon }}</span>
          <div class="goal-title">
            <h4>{{ goal.name }}</h4>
            <p v-if="goal.description" class="goal-desc">{{ goal.description }}</p>
            <p v-if="goal.linkedCategory" class="goal-linked">
              🔗 关联: {{ getCategoryLabel(goal.linkedCategory) }}
              <span v-if="goal.autoDeposit" class="auto-badge">自动同步</span>
            </p>
          </div>
          <button class="delete-btn" @click="deleteGoal(goal.id)">🗑️</button>
        </div>

        <div class="goal-progress">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: getProgress(goal) + '%' }"
            ></div>
          </div>
          <div class="progress-info">
            <span class="progress-text">{{ getProgress(goal).toFixed(1) }}%</span>
            <span class="progress-amount">
              ¥{{ formatMoney(goal.currentAmount) }} / ¥{{ formatMoney(goal.targetAmount) }}
            </span>
          </div>
        </div>

        <div class="goal-footer">
          <span v-if="goal.deadline" class="deadline">
            📅 目标日期: {{ goal.deadline }}
          </span>
          <div class="goal-actions">
            <button 
              v-if="goal.linkedCategory"
              class="toggle-auto-btn"
              :class="{ active: goal.autoDeposit }"
              @click="toggleAutoDeposit(goal)"
              :title="goal.autoDeposit ? '关闭自动同步' : '开启自动同步'"
            >
              {{ goal.autoDeposit ? '🔄 已同步' : '⚡ 同步' }}
            </button>
            <button class="deposit-btn" @click="addToGoal(goal)">
              + 手动存入
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showGoalForm" class="modal-overlay" @click.self="closeGoalForm">
      <div class="modal">
        <div class="modal-header">
          <h3>创建储蓄目标</h3>
          <button class="close-btn" @click="closeGoalForm">×</button>
        </div>

        <div class="form-group">
          <label>目标名称</label>
          <input 
            v-model="newGoal.name" 
            type="text" 
            placeholder="如：旅行基金、买房首付..."
          >
        </div>

        <div class="form-group">
          <label>选择图标</label>
          <div class="icons-grid">
            <span 
              v-for="icon in GOAL_ICONS" 
              :key="icon"
              class="icon-option"
              :class="{ selected: newGoal.icon === icon }"
              @click="newGoal.icon = icon"
            >
              {{ icon }}
            </span>
          </div>
        </div>

        <div class="form-group">
          <label>目标金额 (元)</label>
          <input 
            v-model.number="newGoal.targetAmount" 
            type="number" 
            placeholder="10000"
            min="1"
          >
        </div>

        <div class="form-group">
          <label>关联收入类别 (可选)</label>
          <select v-model="newGoal.linkedCategory" class="select-input">
            <option :value="null">不关联</option>
            <option 
              v-for="cat in INCOME_CATEGORIES" 
              :key="cat.value"
              :value="cat.value"
            >
              {{ cat.icon }} {{ cat.label }}
            </option>
          </select>
          <p class="form-hint">关联后，该类别的收入将自动计入储蓄进度</p>
        </div>

        <div class="form-group">
          <label>目标日期 (可选)</label>
          <input 
            v-model="newGoal.deadline" 
            type="date"
            :min="getToday()"
          >
        </div>

        <div class="form-group">
          <label>描述 (可选)</label>
          <textarea 
            v-model="newGoal.description" 
            placeholder="简单描述一下这个目标..."
            rows="2"
          ></textarea>
        </div>

        <div class="form-actions">
          <button class="cancel-btn" @click="closeGoalForm">取消</button>
          <button class="submit-btn" @click="createGoal" :disabled="!newGoal.name || !newGoal.targetAmount">
            创建目标
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.saving-goals {
  flex: 1;
  overflow-y: auto;
}

.goals-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.goals-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.add-goal-btn {
  padding: 8px 16px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.2s;
}

.add-goal-btn:hover {
  background: #43A047;
}

.no-goals {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.no-goals-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.no-goals p {
  margin: 4px 0;
}

.hint {
  font-size: 13px;
  color: #bbb;
}

.goals-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.goal-card {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 10px;
  border-left: 4px solid #4CAF50;
}

.goal-header {
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
  background: white;
  border-radius: 50%;
  font-size: 20px;
}

.goal-title h4 {
  margin: 0;
  font-size: 15px;
  color: #333;
}

.goal-desc {
  margin: 2px 0 0 0;
  font-size: 12px;
  color: #999;
}

.goal-linked {
  margin: 4px 0 0 0;
  font-size: 12px;
  color: #4CAF50;
  display: flex;
  align-items: center;
  gap: 6px;
}

.auto-badge {
  background: #4CAF50;
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
}

.delete-btn {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  opacity: 0.6;
  transition: all 0.2s;
}

.delete-btn:hover {
  opacity: 1;
  background: #ffebee;
}

.goal-progress {
  margin-bottom: 12px;
}

.progress-bar {
  height: 12px;
  background: #e0e0e0;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #81C784);
  border-radius: 6px;
  transition: width 0.3s ease;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: #4CAF50;
}

.progress-amount {
  font-size: 13px;
  color: #666;
}

.goal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.deadline {
  font-size: 12px;
  color: #999;
}

.goal-actions {
  display: flex;
  gap: 8px;
}

.toggle-auto-btn {
  padding: 6px 12px;
  background: #f5f5f5;
  color: #666;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-auto-btn.active {
  background: #4CAF50;
  color: white;
}

.toggle-auto-btn:hover {
  opacity: 0.9;
}

.deposit-btn {
  padding: 6px 12px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}

.deposit-btn:hover {
  background: #43A047;
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
  max-width: 420px;
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: #f5f5f5;
  border-radius: 50%;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-btn:hover {
  background: #e0e0e0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.form-group input,
.form-group textarea,
.select-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-size: 14px;
  box-sizing: border-box;
  transition: border-color 0.2s;
  background: white;
}

.form-group input:focus,
.form-group textarea:focus,
.select-input:focus {
  outline: none;
  border-color: #4CAF50;
}

.form-hint {
  margin: 6px 0 0 0;
  font-size: 12px;
  color: #999;
}

.icons-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}

.icon-option {
  width: 100%;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s;
}

.icon-option:hover {
  background: #e8f5e9;
}

.icon-option.selected {
  background: #4CAF50;
  transform: scale(1.05);
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}

.cancel-btn,
.submit-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.submit-btn {
  background: #4CAF50;
  color: white;
}

.submit-btn:hover:not(:disabled) {
  background: #43A047;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
