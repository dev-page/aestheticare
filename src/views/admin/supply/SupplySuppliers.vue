<template>
  <div class="flex bg-slate-900 min-h-screen">
    <SupplySidebar />
    
    <main class="flex-1 p-8">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Supplier List</h1>
          <p class="text-slate-400">Manage all suppliers and vendors</p>
        </div>
        <button 
          @click="showAddModal = true"
          class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Supplier
        </button>
      </div>

      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-slate-400 text-sm mb-2">Search</label>
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Search by name or contact..."
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-slate-400 text-sm mb-2">Filter by Category</label>
            <select 
              v-model="selectedCategory"
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="Injectables">Injectables</option>
              <option value="Equipment">Equipment</option>
              <option value="Skincare">Skincare</option>
              <option value="Medical Supplies">Medical Supplies</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-400 text-sm mb-2">Filter by Status</label>
            <select 
              v-model="selectedStatus"
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div v-for="supplier in filteredSuppliers" :key="supplier.id" class="bg-slate-800 rounded-xl p-6 border border-slate-700 hover:border-purple-500 transition-colors">
          <div class="flex items-start justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
            <span 
              :class="[
                'px-3 py-1 rounded-full text-xs font-medium',
                supplier.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              ]"
            >
              {{ supplier.status }}
            </span>
          </div>
          
          <h3 class="text-white font-semibold text-lg mb-2">{{ supplier.name }}</h3>
          <p class="text-slate-400 text-sm mb-4">{{ supplier.category }}</p>
          
          <div class="space-y-2 mb-4">
            <div class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              <span class="text-slate-300">{{ supplier.contact }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
              </svg>
              <span class="text-slate-300">{{ supplier.email }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm">
              <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
              </svg>
              <span class="text-slate-300">{{ supplier.phone }}</span>
            </div>
          </div>
          
          <div class="flex items-center justify-between pt-4 border-t border-slate-700">
            <span class="text-slate-400 text-sm">{{ supplier.productsCount }} products</span>
            <div class="flex items-center gap-2">
              <button class="text-blue-400 hover:text-blue-300 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
              <button class="text-red-400 hover:text-red-300 transition-colors">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-slate-800 rounded-xl p-8 max-w-2xl w-full mx-4 border border-slate-700">
          <h2 class="text-2xl font-bold text-white mb-6">Add New Supplier</h2>
          <form @submit.prevent="addSupplier" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-slate-400 text-sm mb-2">Supplier Name</label>
                <input 
                  type="text" 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Category</label>
                <select 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Select Category</option>
                  <option value="Injectables">Injectables</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Skincare">Skincare</option>
                  <option value="Medical Supplies">Medical Supplies</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Contact Person</label>
                <input 
                  type="text" 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Email</label>
                <input 
                  type="email" 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Phone</label>
                <input 
                  type="tel" 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Status</label>
                <select 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-slate-400 text-sm mb-2">Address</label>
              <textarea 
                rows="3"
                class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
              ></textarea>
            </div>
            <div class="flex justify-end gap-3 mt-6">
              <button 
                type="button"
                @click="showAddModal = false"
                class="px-6 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                class="px-6 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors"
              >
                Add Supplier
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed } from 'vue'
import SupplySidebar from '@/components/sidebar/SupplySidebar.vue'

export default {
  name: 'SupplySuppliers',
  components: {
    SupplySidebar
  },
  setup() {
    const showAddModal = ref(false)
    const searchQuery = ref('')
    const selectedCategory = ref('')
    const selectedStatus = ref('')

    const suppliers = ref([
      { id: 1, name: 'MedSupply Co.', category: 'Injectables', contact: 'John Smith', email: 'john@medsupply.com', phone: '+63 912 345 6789', status: 'Active', productsCount: 45 },
      { id: 2, name: 'Beauty Essentials', category: 'Skincare', contact: 'Maria Garcia', email: 'maria@beautyessentials.com', phone: '+63 923 456 7890', status: 'Active', productsCount: 32 },
      { id: 3, name: 'Medical Supplies Inc.', category: 'Medical Supplies', contact: 'Robert Lee', email: 'robert@medsupplies.com', phone: '+63 934 567 8901', status: 'Active', productsCount: 28 },
      { id: 4, name: 'Laser Tech Solutions', category: 'Equipment', contact: 'Sarah Johnson', email: 'sarah@lasertech.com', phone: '+63 945 678 9012', status: 'Active', productsCount: 15 },
      { id: 5, name: 'Premium Aesthetics', category: 'Injectables', contact: 'David Chen', email: 'david@premiumaesthetics.com', phone: '+63 956 789 0123', status: 'Inactive', productsCount: 22 },
      { id: 6, name: 'Derma Solutions', category: 'Skincare', contact: 'Emily Wong', email: 'emily@dermasolutions.com', phone: '+63 967 890 1234', status: 'Active', productsCount: 38 }
    ])

    const filteredSuppliers = computed(() => {
      return suppliers.value.filter(supplier => {
        const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                            supplier.contact.toLowerCase().includes(searchQuery.value.toLowerCase())
        const matchesCategory = !selectedCategory.value || supplier.category === selectedCategory.value
        const matchesStatus = !selectedStatus.value || supplier.status === selectedStatus.value
        
        return matchesSearch && matchesCategory && matchesStatus
      })
    })

    const addSupplier = () => {
      // Add supplier logic here
      showAddModal.value = false
    }

    return {
      showAddModal,
      searchQuery,
      selectedCategory,
      selectedStatus,
      suppliers,
      filteredSuppliers,
      addSupplier
    }
  }
}
</script>
