<template>
  <div class="flex bg-slate-900 min-h-screen">
    <SupplySidebar />
    
    <main class="flex-1 p-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Supply Dashboard</h1>
        <p class="text-slate-400">Overview of supply chain and inventory</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-slate-400 text-sm mb-1">Active Suppliers</h3>
          <p class="text-3xl font-bold text-white">{{ activeSuppliers }}</p>
          <p class="text-xs text-green-500 mt-1">+3 new this month</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-slate-400 text-sm mb-1">Procurement Costs</h3>
          <p class="text-3xl font-bold text-white">₱{{ totalProcurementCosts.toLocaleString() }}</p>
          <p class="text-xs text-slate-500 mt-1">This month</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-slate-400 text-sm mb-1">Stock Items</h3>
          <p class="text-3xl font-bold text-white">{{ totalStockItems }}</p>
          <p class="text-xs text-red-500 mt-1">{{ lowStockItems }} low stock</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-slate-400 text-sm mb-1">Pending Requests</h3>
          <p class="text-3xl font-bold text-white">{{ pendingRequests }}</p>
          <p class="text-xs text-orange-500 mt-1">Requires approval</p>
        </div>
      </div>

      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
        <h2 class="text-xl font-semibold text-white mb-6">Most Used Products</h2>
        <div class="space-y-4">
          <div v-for="product in mostUsedProducts" :key="product.name" class="space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                  </svg>
                </div>
                <div>
                  <p class="text-white font-medium">{{ product.name }}</p>
                  <p class="text-slate-400 text-sm">{{ product.category }}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-white font-semibold">{{ product.usage }} units</p>
                <p class="text-slate-400 text-sm">This month</p>
              </div>
            </div>
            <div class="w-full bg-slate-700 rounded-full h-2">
              <div 
                class="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                :style="{ width: `${(product.usage / maxUsage) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
        <h2 class="text-xl font-semibold text-white mb-6">Low Stock Alerts</h2>
        <div class="space-y-3">
          <div v-for="item in lowStockAlerts" :key="item.id" class="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <div>
                <p class="text-white font-medium">{{ item.name }}</p>
                <p class="text-slate-400 text-sm">{{ item.supplier }}</p>
              </div>
            </div>
            <div class="text-right">
              <p class="text-red-500 font-semibold">{{ item.currentStock }} units</p>
              <p class="text-slate-400 text-sm">Min: {{ item.minStock }} units</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 class="text-xl font-semibold text-white mb-6">Recent Purchase Requests</h2>
        <div class="space-y-3">
          <div v-for="request in recentRequests" :key="request.id" class="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
            <div class="flex-1">
              <p class="text-white font-medium">{{ request.item }}</p>
              <p class="text-slate-400 text-sm">{{ request.branch }} • {{ request.quantity }} units</p>
            </div>
            <div class="flex items-center gap-3">
              <span 
                :class="[
                  'px-3 py-1 rounded-full text-xs font-medium',
                  request.status === 'Pending' ? 'bg-orange-500/20 text-orange-400' :
                  request.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                  'bg-blue-500/20 text-blue-400'
                ]"
              >
                {{ request.status }}
              </span>
              <button class="text-purple-400 hover:text-purple-300 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import SupplySidebar from '@/components/sidebar/SupplySidebar.vue'

export default {
  name: 'SupplyDashboard',
  components: {
    SupplySidebar
  },
  setup() {
    //Static data
    const activeSuppliers = ref(24)
    const totalProcurementCosts = ref(1250000)
    const totalStockItems = ref(342)
    const lowStockItems = ref(12)
    const pendingRequests = ref(8)

    const mostUsedProducts = ref([
      { name: 'Botox Injectable', category: 'Injectables', usage: 450 },
      { name: 'Dermal Fillers', category: 'Injectables', usage: 380 },
      { name: 'Chemical Peel Solution', category: 'Treatments', usage: 320 },
      { name: 'Laser Consumables', category: 'Equipment', usage: 280 },
      { name: 'Facial Masks', category: 'Skincare', usage: 250 }
    ])

    const maxUsage = computed(() => {
      return Math.max(...mostUsedProducts.value.map(p => p.usage))
    })

    const lowStockAlerts = ref([
      { id: 1, name: 'Botox Injectable 100U', supplier: 'MedSupply Co.', currentStock: 5, minStock: 20 },
      { id: 2, name: 'Hyaluronic Acid Serum', supplier: 'Beauty Essentials', currentStock: 8, minStock: 15 },
      { id: 3, name: 'Sterilization Pouches', supplier: 'Medical Supplies Inc.', currentStock: 12, minStock: 50 }
    ])

    const recentRequests = ref([
      { id: 1, item: 'Botox Injectable 100U', branch: 'Imus Branch', quantity: 50, status: 'Pending' },
      { id: 2, item: 'Dermal Fillers', branch: 'Trece Branch', quantity: 30, status: 'Approved' },
      { id: 3, item: 'Chemical Peel Solution', branch: 'Dasmarinas Branch', quantity: 20, status: 'Processing' },
      { id: 4, item: 'Laser Consumables', branch: 'Bacoor Branch', quantity: 40, status: 'Pending' }
    ])

    return {
      activeSuppliers,
      totalProcurementCosts,
      totalStockItems,
      lowStockItems,
      pendingRequests,
      mostUsedProducts,
      maxUsage,
      lowStockAlerts,
      recentRequests
    }
  }
}
</script>
