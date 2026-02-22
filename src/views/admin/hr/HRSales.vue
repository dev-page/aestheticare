<template>
  <div class="flex bg-slate-900 min-h-screen">
    <HRSidebar />
    
    <main class="flex-1 p-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Sales Report</h1>
        <p class="text-slate-400">Compare sales performance across branches</p>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-2">Total Revenue</h3>
          <p class="text-3xl font-bold text-white">₱{{ totalRevenue.toLocaleString() }}</p>
          <p class="text-xs text-green-500 mt-2">+12% from last month</p>
        </div>
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-2">Average per Branch</h3>
          <p class="text-3xl font-bold text-white">₱{{ averagePerBranch.toLocaleString() }}</p>
          <p class="text-xs text-slate-500 mt-2">Across 5 branches</p>
        </div>
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-2">Top Performer</h3>
          <p class="text-2xl font-bold text-purple-500">Imus Branch</p>
          <p class="text-xs text-slate-500 mt-2">₱{{ topPerformerRevenue.toLocaleString() }}</p>
        </div>
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-2">Growth Rate</h3>
          <p class="text-3xl font-bold text-white">+15.3%</p>
          <p class="text-xs text-green-500 mt-2">Year over year</p>
        </div>
      </div>

      <!-- Branch Comparison Chart -->
      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-white">Branch Sales Comparison</h2>
          <select 
            v-model="selectedPeriod"
            class="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
        </div>
        
        <!-- Bar Chart -->
        <div class="space-y-6">
          <div v-for="branch in branchSales" :key="branch.name" class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-white font-medium">{{ branch.name }}</span>
              <span class="text-slate-400">₱{{ branch.revenue.toLocaleString() }}</span>
            </div>
            <div class="relative">
              <div class="w-full bg-slate-700 rounded-full h-8">
                <div
                  class="bg-gradient-to-r from-purple-500 to-purple-600 h-8 rounded-full flex items-center justify-end px-4 transition-all duration-500"
                  :style="{ width: `${(branch.revenue / maxRevenue) * 100}%` }"
                >
                  <span class="text-white text-sm font-medium">{{ Math.round((branch.revenue / totalRevenue) * 100) }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Expenses Section -->
      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
        <h2 class="text-xl font-semibold text-white mb-6">Expenses by Branch</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div v-for="expense in branchExpenses" :key="expense.branch" class="bg-slate-700 rounded-lg p-4">
            <h3 class="text-white font-medium mb-3">{{ expense.branch }}</h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400">Salaries</span>
                <span class="text-white">₱{{ expense.salaries.toLocaleString() }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400">Supplies</span>
                <span class="text-white">₱{{ expense.supplies.toLocaleString() }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-400">Utilities</span>
                <span class="text-white">₱{{ expense.utilities.toLocaleString() }}</span>
              </div>
              <div class="flex items-center justify-between text-sm pt-2 border-t border-slate-600">
                <span class="text-slate-300 font-medium">Total</span>
                <span class="text-purple-500 font-semibold">₱{{ expense.total.toLocaleString() }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Profit Margin -->
      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 class="text-xl font-semibold text-white mb-6">Profit Margin by Branch</h2>
        <div class="space-y-4">
          <div v-for="profit in profitMargins" :key="profit.branch" class="flex items-center gap-4">
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <span class="text-white font-medium">{{ profit.branch }}</span>
                <div class="flex items-center gap-4">
                  <span class="text-slate-400 text-sm">Revenue: ₱{{ profit.revenue.toLocaleString() }}</span>
                  <span class="text-slate-400 text-sm">Expenses: ₱{{ profit.expenses.toLocaleString() }}</span>
                  <span 
                    :class="[
                      'text-sm font-semibold',
                      profit.margin >= 30 ? 'text-green-500' : profit.margin >= 20 ? 'text-yellow-500' : 'text-red-500'
                    ]"
                  >
                    {{ profit.margin }}% margin
                  </span>
                </div>
              </div>
              <div class="w-full bg-slate-700 rounded-full h-2">
                <div 
                  :class="[
                    'h-2 rounded-full transition-all duration-500',
                    profit.margin >= 30 ? 'bg-green-500' : profit.margin >= 20 ? 'bg-yellow-500' : 'bg-red-500'
                  ]"
                  :style="{ width: `${profit.margin}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'

export default {
  name: 'HRSales',
  components: {
    HRSidebar
  },
  setup() {
    const selectedPeriod = ref('month')

    const branchSales = ref([
      { name: 'Imus Branch', revenue: 850000 },
      { name: 'Trece Martires Branch', revenue: 720000 },
      { name: 'Dasmarinas Branch', revenue: 680000 },
      { name: 'Bacoor Branch', revenue: 650000 },
      { name: 'Cavite City Branch', revenue: 580000 }
    ])

    const branchExpenses = ref([
      { branch: 'Imus Branch', salaries: 250000, supplies: 120000, utilities: 45000, total: 415000 },
      { branch: 'Trece Martires Branch', salaries: 220000, supplies: 95000, utilities: 38000, total: 353000 },
      { branch: 'Dasmarinas Branch', salaries: 210000, supplies: 88000, utilities: 35000, total: 333000 },
      { branch: 'Bacoor Branch', salaries: 200000, supplies: 82000, utilities: 32000, total: 314000 },
      { branch: 'Cavite City Branch', salaries: 180000, supplies: 75000, utilities: 28000, total: 283000 }
    ])

    const totalRevenue = computed(() => {
      return branchSales.value.reduce((sum, branch) => sum + branch.revenue, 0)
    })

    const maxRevenue = computed(() => {
      return Math.max(...branchSales.value.map(b => b.revenue))
    })

    const averagePerBranch = computed(() => {
      return Math.round(totalRevenue.value / branchSales.value.length)
    })

    const topPerformerRevenue = computed(() => {
      return maxRevenue.value
    })

    const profitMargins = computed(() => {
      return branchSales.value.map((branch, index) => {
        const expense = branchExpenses.value[index]
        const profit = branch.revenue - expense.total
        const margin = Math.round((profit / branch.revenue) * 100)
        return {
          branch: branch.name,
          revenue: branch.revenue,
          expenses: expense.total,
          margin
        }
      })
    })

    return {
      selectedPeriod,
      branchSales,
      branchExpenses,
      totalRevenue,
      maxRevenue,
      averagePerBranch,
      topPerformerRevenue,
      profitMargins
    }
  }
}
</script>
