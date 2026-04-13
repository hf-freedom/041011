<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { SavingsGoal, Transaction, IncomeCategory } from '../types'
import { INCOME_CATEGORIES, CATEGORY_LABELS, CATEGORY_ICONS } from '../types'
import { formatMoney } from '../utils/storage'

const props = defineProps<{
  transactions: Transaction[]
}>()

const STORAGE_KEY = 'finance_savings_goals_v3'

const goals = ref<SavingsGoal[]>([])
const showForm = ref(false)
const editingGoal = ref<SavingsGoal | null>(null)

const formData = ref({
  name: '',
  targetAmount: 0,
  deadline: '',
  color: '#4CAF50',
  linkedCategories: [] as IncomeCategory[]
})

const colorOptions = [
  '#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#795548'
]

function loadGoals() {
  const data = localStorage.getItem(STORAGE_KEY)
  if (data) {
    goals.value = JSON.parse(data)
  }
}

function saveGoals() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(goals.value))
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

function calculateProgress(goal: SavingsGoal): number {
  const linkedAmount = props.transactions
    .filter(t => t.type === 'income' && goal.linkedCategories.includes(t.category as IncomeCategory))
    .reduce((sum, t) => sum + t.amount, 0)
  
  return linkedAmount
}

function countLinkedTransactions(goal: SavingsGoal): number {
  return props.transactions.filter(t => 
    t.type === 'income' && goal.linkedCategories.includes(t.category as IncomeCategory)
  ).length
}

const goalsWithProgress = computed(() => {
  return goals.value.map(goal => {
    const currentAmount = calculateProgress(goal)
    return {
      ...goal,
      currentAmount,
      transactionCount: countLinkedTransactions(goal),
      progressPercent: Math.min((currentAmount / goal.targetAmount) * 100, 100)
    }
  })
})

function handleAdd() {
  editingGoal.value = null
  formData.value = {
    name: '',
    targetAmount: 0,
    deadline: '',
    color: '#4CAF50',
    linkedCategories: []
  }
  showForm.value = true
}

function handleEdit(goal: SavingsGoal) {
  editingGoal.value = goal
  formData.value = {
    name: goal.name,
    targetAmount: goal.targetAmount,
    deadline: goal.deadline || '',
    color: goal.color,
    linkedCategories: [...goal.linkedCategories]
  }
  showForm.value = true
}

function handleSubmit() {
  if (!formData.value.name || formData.value.targetAmount <= 0) {
    alert('请填写完整信息')
    return
  }

  if (editingGoal.value) {
    const index = goals.value.findIndex(g => g.id === editingGoal.value!.id)
    if (index >= 0) {
      goals.value[index] = {
        ...editingGoal.value,
        name: formData.value.name,
        targetAmount: formData.value.targetAmount,
        deadline: formData.value.deadline || undefined,
        color: formData.value.color,
        linkedCategories: formData.value.linkedCategories
      }
    }
  } else {
    const newGoal: SavingsGoal = {
      id: generateId(),
      name: formData.value.name,
      targetAmount: formData.value.targetAmount,
      currentAmount: 0,
      deadline: formData.value.deadline || undefined,
      color: formData.value.color,
      createdAt: Date.now(),
      linkedCategories: formData.value.linkedCategories
    }
    goals.value.push(newGoal)
  }

  saveGoals()
  showForm.value = false
  editingGoal.value = null
}

function handleDelete(id: string) {
  if (confirm('确定要删除这个目标吗？')) {
    goals.value = goals.value.filter(g => g.id !== id)
    saveGoals()
  }
}

function handleCancel() {
  showForm.value = false
  editingGoal.value = null
}

function toggleCategory(category: IncomeCategory) {
  const index = formData.value.linkedCategories.indexOf(category)
  if (index >= 0) {
    formData.value.linkedCategories.splice(index, 1)
  } else {
    formData.value.linkedCategories.push(category)
  }
}

function getDaysLeft(deadline?: string): number | null {
  if (!deadline) return null
  const today = new Date()
  const deadlineDate = new Date(deadline)
  const diffTime = deadlineDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

onMounted(() => {
  loadGoals()
})
</script>

<template>
  <div class="savings-goals">
    <div class="panel-header">
      <h2>🎯 规划与目标</h2>
      <button class="add-btn" @click="handleAdd">
        <span class="add-icon">+</span>
        新建目标
      </button>
    </div>

    <div v-if="goalsWithProgress.length === 0" class="empty-state">
      <div class="empty-icon">🎯</div>
      <p>暂无储蓄目标</p>
      <p class="empty-hint">点击右上角"新建目标"开始规划</p>
    </div>

    <div v-else class="goals-grid">
      <div 
        v-for="goal in goalsWithProgress" 
        :key="goal.id"
        class="goal-card"
        :style="{ borderLeftColor: goal.color }"
      >
        <div class="goal-header">
          <h3 class="goal-name">{{ goal.name }}</h3>
          <div class="goal-actions">
            <button class="action-btn" @click="handleEdit(goal)" title="编辑">✏️</button>
            <button class="action-btn" @click="handleDelete(goal.id)" title="删除">🗑️</button>
          </div>
        </div>

        <div class="goal-progress">
          <div class="progress-info">
            <span class="current-amount" :style="{ color: goal.color }">
              ¥{{ formatMoney(goal.currentAmount) }}
            </span>
            <span class="target-amount">/ ¥{{ formatMoney(goal.targetAmount) }}</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ 
                width: `${goal.progressPercent}%`,
                backgroundColor: goal.color 
              }"
            ></div>
          </div>
          <div class="progress-percent">{{ goal.progressPercent.toFixed(1) }}%</div>
        </div>

        <div class="goal-categories">
          <span class="categories-label">关联类别:</span>
          <div class="category-tags">
            <span 
              v-for="cat in goal.linkedCategories" 
              :key="cat"
              class="category-tag"
            >
              {{ CATEGORY_ICONS[cat] }} {{ CATEGORY_LABELS[cat] }}
            </span>
            <span v-if="goal.linkedCategories.length === 0" class="no-categories">
              未关联类别
            </span>
          </div>
        </div>

        <div class="goal-stats">
          <span class="linked-count">
            已匹配 {{ goal.transactionCount }} 笔收入流水
          </span>
        </div>

        <div class="goal-footer">
          <span v-if="goal.deadline" class="deadline">
            📅 {{ goal.deadline }}
            <span v-if="getDaysLeft(goal.deadline) !== null" 
                  :class="['days-left', { urgent: getDaysLeft(goal.deadline)! < 7 }]">
              ({{ getDaysLeft(goal.deadline)! > 0 ? `还剩${getDaysLeft(goal.deadline)}天` : '已过期' }})
            </span>
          </span>
          <span v-else class="no-deadline">无截止日期</span>
        </div>
      </div>
    </div>

    <!-- 新建/编辑目标弹窗 -->
    <div v-if="showForm" class="modal-overlay" @click.self="handleCancel">
      <div class="modal">
        <h3>{{ editingGoal ? '编辑目标' : '新建储蓄目标' }}</h3>
        
        <div class="form-group">
          <label>目标名称</label>
          <input 
            v-model="formData.name" 
            type="text" 
            placeholder="例如：旅行基金"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>目标金额</label>
          <input 
            v-model.number="formData.targetAmount" 
            type="number" 
            min="0"
            step="0.01"
            placeholder="0.00"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>截止日期（可选）</label>
          <input 
            v-model="formData.deadline" 
            type="date"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>关联收入类别（多选）</label>
          <div class="category-selector">
            <button
              v-for="cat in INCOME_CATEGORIES"
              :key="cat.value"
              :class="['category-btn', { active: formData.linkedCategories.includes(cat.value) }]"
              @click="toggleCategory(cat.value)"
            >
              <span class="category-icon">{{ cat.icon }}</span>
              <span class="category-label">{{ cat.label }}</span>
            </button>
          </div>
          <p class="hint">选择要计入此目标的收入类别，所有该类别收入将自动累计</p>
        </div>

        <div class="form-group">
          <label>颜色标识</label>
          <div class="color-picker">
            <button
              v-for="color in colorOptions"
              :key="color"
              :class="['color-option', { active: formData.color === color }]"
              :style="{ backgroundColor: color }"
              @click="formData.color = color"
            ></button>
          </div>
        </div>

        <div class="form-actions">
          <button class="btn-secondary" @click="handleCancel">取消</button>
          <button class="btn-primary" @click="handleSubmit">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.savings-goals {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.panel-header h2 {
  margin: 0;
  font-size: 20px;
  color: #333;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.add-btn:hover {
  background: #43A047;
  transform: translateY(-1px);
}

.add-icon {
  font-size: 18px;
  font-weight: 300;
}

.empty-state {
  text-align: center;
  padding: 48px 20px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.empty-hint {
  font-size: 14px;
  color: #bbb;
}

.goals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.goal-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 20px;
  border-left-width: 4px;
  transition: all 0.2s;
}

.goal-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.goal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.goal-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.goal-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 14px;
  padding: 6px;
  opacity: 0.6;
  transition: opacity 0.2s;
  border-radius: 4px;
}

.action-btn:hover {
  opacity: 1;
  background: #f5f5f5;
}

.goal-progress {
  margin-bottom: 12px;
}

.progress-info {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}

.current-amount {
  font-size: 20px;
  font-weight: 600;
}

.target-amount {
  font-size: 14px;
  color: #999;
}

.progress-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 4px;
}

.progress-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.progress-percent {
  font-size: 12px;
  color: #666;
  text-align: right;
}

.goal-categories {
  margin-bottom: 8px;
}

.categories-label {
  font-size: 12px;
  color: #666;
  margin-right: 8px;
}

.category-tags {
  display: inline-flex;
  gap: 6px;
  flex-wrap: wrap;
}

.category-tag {
  font-size: 12px;
  padding: 2px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
}

.no-categories {
  font-size: 12px;
  color: #999;
  font-style: italic;
}

.goal-stats {
  margin-bottom: 8px;
}

.linked-count {
  font-size: 12px;
  color: #666;
  background: #f5f5f5;
  padding: 4px 8px;
  border-radius: 4px;
}

.goal-footer {
  font-size: 13px;
  color: #666;
}

.deadline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.days-left {
  color: #666;
}

.days-left.urgent {
  color: #FF5252;
  font-weight: 500;
}

.no-deadline {
  color: #999;
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
  z-index: 200;
}

.modal {
  background: white;
  border-radius: 12px;
  padding: 24px;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
  color: #333;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #666;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: #4CAF50;
}

.category-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.category-btn:hover {
  background: #f5f5f5;
}

.category-btn.active {
  background: #e8f5e9;
  border-color: #4CAF50;
  color: #2e7d32;
}

.category-icon {
  font-size: 16px;
}

.category-label {
  font-size: 14px;
}

.hint {
  font-size: 12px;
  color: #999;
  margin: 8px 0 0 0;
}

.color-picker {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.color-option {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
}

.color-option.active {
  border-color: #333;
  transform: scale(1.1);
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.btn-secondary {
  padding: 10px 20px;
  border: 1px solid #e0e0e0;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: #f5f5f5;
}

.btn-primary {
  padding: 10px 20px;
  border: none;
  background: #4CAF50;
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: #43A047;
}

@media (max-width: 768px) {
  .goals-grid {
    grid-template-columns: 1fr;
  }
  
  .category-selector {
    grid-template-columns: 1fr;
  }
}
</style>
