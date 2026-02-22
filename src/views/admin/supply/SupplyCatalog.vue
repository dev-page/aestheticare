<template>
  <div class="flex bg-slate-900 min-h-screen">
    <SupplySidebar />
    
    <main class="flex-1 p-8">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Item Catalog</h1>
          <p class="text-slate-400">Manage inventory items and stock levels</p>
        </div>
        <button 
          @click="showAddModal = true"
          class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Item
        </button>
      </div>

      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-slate-400 text-sm mb-2">Search</label>
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Search items..."
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-slate-400 text-sm mb-2">Category</label>
            <select 
              v-model="selectedCategory"
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Categories</option>
              <option value="Injectables">Injectables</option>
              <option value="Skincare">Skincare</option>
              <option value="Equipment">Equipment</option>
              <option value="Medical Supplies">Medical Supplies</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-400 text-sm mb-2">Stock Status</label>
            <select 
              v-model="selectedStockStatus"
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-400 text-sm mb-2">Supplier</label>
            <select 
              v-model="selectedSupplier"
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Suppliers</option>
              <option value="MedSupply Co.">MedSupply Co.</option>
              <option value="Beauty Essentials">Beauty Essentials</option>
              <option value="Medical Supplies Inc.">Medical Supplies Inc.</option>
            </select>
          </div>
        </div>
      </div>

      <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-700">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Item</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Category</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Supplier</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Stock</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Unit Price</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
              <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-slate-700/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <svg class="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                      </svg>
                    </div>
                    <div>
                      <p class="text-white font-medium">{{ item.name }}</p>
                      <p class="text-slate-400 text-sm">SKU: {{ item.sku }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-slate-300">{{ item.category }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-slate-300">{{ item.supplier }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p class="text-white font-medium">{{ item.currentStock }} / {{ item.minStock }}</p>
                    <p class="text-slate-400 text-xs">{{ item.unit }}</p>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-white">₱{{ item.unitPrice.toLocaleString() }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'px-3 py-1 rounded-full text-xs font-medium',
                      item.stockStatus === 'In Stock' ? 'bg-green-500/20 text-green-400' :
                      item.stockStatus === 'Low Stock' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    ]"
                  >
                    {{ item.stockStatus }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
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
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-slate-800 rounded-xl p-8 max-w-2xl w-full mx-4 border border-slate-700 max-h-[90vh] overflow-y-auto">
          <h2 class="text-2xl font-bold text-white mb-6">Add New Item</h2>
          <form @submit.prevent="addItem" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-slate-400 text-sm mb-2">Item Name</label>
                <input 
                  type="text" 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">SKU</label> <!--Stock-keeping unit === Unique code ng item-->
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
                  <option value="Skincare">Skincare</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Medical Supplies">Medical Supplies</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Supplier</label>
                <select 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Select Supplier</option>
                  <option value="MedSupply Co.">MedSupply Co.</option>
                  <option value="Beauty Essentials">Beauty Essentials</option>
                  <option value="Medical Supplies Inc.">Medical Supplies Inc.</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Current Stock</label>
                <input 
                  type="number" 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Minimum Stock</label>
                <input 
                  type="number" 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Unit</label>
                <input 
                  type="text" 
                  placeholder="e.g., pieces, bottles, boxes"
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Unit Price (₱)</label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label class="block text-slate-400 text-sm mb-2">Description</label>
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
                Add Item
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
  name: 'SupplyCatalog',
  components: {
    SupplySidebar
  },
  setup() {
    const showAddModal = ref(false)
    const searchQuery = ref('')
    const selectedCategory = ref('')
    const selectedStockStatus = ref('')
    const selectedSupplier = ref('')

    //Static data
    const items = ref([
      { id: 1, name: 'Botox Injectable 100U', sku: 'BTX-100', category: 'Injectables', supplier: 'MedSupply Co.', currentStock: 45, minStock: 20, unit: 'vials', unitPrice: 15000, stockStatus: 'In Stock' },
      { id: 2, name: 'Hyaluronic Acid Serum', sku: 'HAS-500', category: 'Skincare', supplier: 'Beauty Essentials', currentStock: 8, minStock: 15, unit: 'bottles', unitPrice: 2500, stockStatus: 'Low Stock' },
      { id: 3, name: 'Dermal Filler 1ml', sku: 'DFL-001', category: 'Injectables', supplier: 'MedSupply Co.', currentStock: 32, minStock: 25, unit: 'syringes', unitPrice: 12000, stockStatus: 'In Stock' },
      { id: 4, name: 'Chemical Peel Solution', sku: 'CPS-250', category: 'Skincare', supplier: 'Beauty Essentials', currentStock: 0, minStock: 10, unit: 'bottles', unitPrice: 3500, stockStatus: 'Out of Stock' },
      { id: 5, name: 'Sterilization Pouches', sku: 'STP-100', category: 'Medical Supplies', supplier: 'Medical Supplies Inc.', currentStock: 12, minStock: 50, unit: 'boxes', unitPrice: 800, stockStatus: 'Low Stock' },
      { id: 6, name: 'Laser Consumables Kit', sku: 'LCK-001', category: 'Equipment', supplier: 'MedSupply Co.', currentStock: 28, minStock: 15, unit: 'kits', unitPrice: 8500, stockStatus: 'In Stock' },
      { id: 7, name: 'Facial Masks Premium', sku: 'FMP-050', category: 'Skincare', supplier: 'Beauty Essentials', currentStock: 65, minStock: 30, unit: 'pieces', unitPrice: 450, stockStatus: 'In Stock' },
      { id: 8, name: 'Vitamin C Serum', sku: 'VCS-100', category: 'Skincare', supplier: 'Beauty Essentials', currentStock: 18, minStock: 20, unit: 'bottles', unitPrice: 1800, stockStatus: 'Low Stock' }
    ])

    const filteredItems = computed(() => {
      return items.value.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                            item.sku.toLowerCase().includes(searchQuery.value.toLowerCase())
        const matchesCategory = !selectedCategory.value || item.category === selectedCategory.value
        const matchesStockStatus = !selectedStockStatus.value || item.stockStatus === selectedStockStatus.value
        const matchesSupplier = !selectedSupplier.value || item.supplier === selectedSupplier.value
        
        return matchesSearch && matchesCategory && matchesStockStatus && matchesSupplier
      })
    })

    const addItem = () => {
        //Wala pa to
      showAddModal.value = false
    }

    return {
      showAddModal,
      searchQuery,
      selectedCategory,
      selectedStockStatus,
      selectedSupplier,
      items,
      filteredItems,
      addItem
    }
  }
}
</script>
