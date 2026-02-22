<template>
  <div class="flex bg-slate-900 min-h-screen">
    <SupplySidebar />
    
    <main class="flex-1 p-8">
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Purchase Requests</h1>
          <p class="text-slate-400">Manage and approve purchase requests from branches</p>
        </div>
        <button 
          @click="showAddModal = true"
          class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          New Request
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-2">Pending</h3>
          <p class="text-3xl font-bold text-orange-500">{{ pendingCount }}</p>
        </div>
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-2">Approved</h3>
          <p class="text-3xl font-bold text-green-500">{{ approvedCount }}</p>
        </div>
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-2">Processing</h3>
          <p class="text-3xl font-bold text-blue-500">{{ processingCount }}</p>
        </div>
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-2">Completed</h3>
          <p class="text-3xl font-bold text-white">{{ completedCount }}</p>
        </div>
      </div>

      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-slate-400 text-sm mb-2">Search</label>
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Search requests..."
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-slate-400 text-sm mb-2">Status</label>
            <select 
              v-model="selectedStatus"
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Status</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Processing">Processing</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-400 text-sm mb-2">Branch</label>
            <select 
              v-model="selectedBranch"
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Branches</option>
              <option value="Imus">Imus Branch</option>
              <option value="Trece">Trece Martires Branch</option>
              <option value="Dasmarinas">Dasmarinas Branch</option>
              <option value="Bacoor">Bacoor Branch</option>
              <option value="Cavite">Cavite City Branch</option>
            </select>
          </div>
          <div>
            <label class="block text-slate-400 text-sm mb-2">Priority</label>
            <select 
              v-model="selectedPriority"
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-700">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Request ID</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Item</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Branch</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Quantity</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Priority</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Date</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
              <tr v-for="request in filteredRequests" :key="request.id" class="hover:bg-slate-700/50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-white font-medium">{{ request.id }}</span>
                </td>
                <td class="px-6 py-4">
                  <div>
                    <p class="text-white font-medium">{{ request.item }}</p>
                    <p class="text-slate-400 text-sm">{{ request.supplier }}</p>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-slate-300">{{ request.branch }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-white">{{ request.quantity }} {{ request.unit }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'px-3 py-1 rounded-full text-xs font-medium',
                      request.priority === 'High' ? 'bg-red-500/20 text-red-400' :
                      request.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    ]"
                  >
                    {{ request.priority }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-slate-300">{{ request.date }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'px-3 py-1 rounded-full text-xs font-medium',
                      request.status === 'Pending' ? 'bg-orange-500/20 text-orange-400' :
                      request.status === 'Approved' ? 'bg-green-500/20 text-green-400' :
                      request.status === 'Processing' ? 'bg-blue-500/20 text-blue-400' :
                      request.status === 'Completed' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-red-500/20 text-red-400'
                    ]"
                  >
                    {{ request.status }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-2">
                    <button 
                      v-if="request.status === 'Pending'"
                      @click="approveRequest(request.id)"
                      class="text-green-400 hover:text-green-300 transition-colors"
                      title="Approve"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </button>
                    <button 
                      v-if="request.status === 'Pending'"
                      @click="rejectRequest(request.id)"
                      class="text-red-400 hover:text-red-300 transition-colors"
                      title="Reject"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                      </svg>
                    </button>
                    <button class="text-blue-400 hover:text-blue-300 transition-colors" title="View Details">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
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
        <div class="bg-slate-800 rounded-xl p-8 max-w-2xl w-full mx-4 border border-slate-700">
          <h2 class="text-2xl font-bold text-white mb-6">New Purchase Request</h2>
          <form @submit.prevent="addRequest" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-slate-400 text-sm mb-2">Item</label>
                <select 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Select Item</option>
                  <option value="Botox Injectable 100U">Botox Injectable 100U</option>
                  <option value="Dermal Filler 1ml">Dermal Filler 1ml</option>
                  <option value="Chemical Peel Solution">Chemical Peel Solution</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Branch</label>
                <select 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Select Branch</option>
                  <option value="Imus">Imus Branch</option>
                  <option value="Trece">Trece Martires Branch</option>
                  <option value="Dasmarinas">Dasmarinas Branch</option>
                  <option value="Bacoor">Bacoor Branch</option>
                  <option value="Cavite">Cavite City Branch</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Quantity</label>
                <input 
                  type="number" 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Priority</label>
                <select 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
            </div>
            <div>
              <label class="block text-slate-400 text-sm mb-2">Reason/Notes</label>
              <textarea 
                rows="3"
                required
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
                Submit Request
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
  name: 'SupplyPurchaseRequests',
  components: {
    SupplySidebar
  },
  setup() {
    const showAddModal = ref(false)
    const searchQuery = ref('')
    const selectedStatus = ref('')
    const selectedBranch = ref('')
    const selectedPriority = ref('')

    //Static data
    const requests = ref([
      { id: 'PR-001', item: 'Botox Injectable 100U', supplier: 'MedSupply Co.', branch: 'Imus Branch', quantity: 50, unit: 'vials', priority: 'High', date: '2026-01-28', status: 'Pending' },
      { id: 'PR-002', item: 'Dermal Filler 1ml', supplier: 'MedSupply Co.', branch: 'Trece Martires Branch', quantity: 30, unit: 'syringes', priority: 'Medium', date: '2026-01-27', status: 'Approved' },
      { id: 'PR-003', item: 'Chemical Peel Solution', supplier: 'Beauty Essentials', branch: 'Dasmarinas Branch', quantity: 20, unit: 'bottles', priority: 'Low', date: '2026-01-26', status: 'Processing' },
      { id: 'PR-004', item: 'Laser Consumables Kit', supplier: 'MedSupply Co.', branch: 'Bacoor Branch', quantity: 40, unit: 'kits', priority: 'High', date: '2026-01-25', status: 'Pending' },
      { id: 'PR-005', item: 'Facial Masks Premium', supplier: 'Beauty Essentials', branch: 'Cavite City Branch', quantity: 100, unit: 'pieces', priority: 'Low', date: '2026-01-24', status: 'Completed' },
      { id: 'PR-006', item: 'Sterilization Pouches', supplier: 'Medical Supplies Inc.', branch: 'Imus Branch', quantity: 200, unit: 'boxes', priority: 'Medium', date: '2026-01-23', status: 'Approved' },
      { id: 'PR-007', item: 'Hyaluronic Acid Serum', supplier: 'Beauty Essentials', branch: 'Trece Martires Branch', quantity: 25, unit: 'bottles', priority: 'High', date: '2026-01-22', status: 'Pending' },
      { id: 'PR-008', item: 'Vitamin C Serum', supplier: 'Beauty Essentials', branch: 'Dasmarinas Branch', quantity: 35, unit: 'bottles', priority: 'Medium', date: '2026-01-21', status: 'Processing' }
    ])

    const pendingCount = computed(() => requests.value.filter(r => r.status === 'Pending').length)
    const approvedCount = computed(() => requests.value.filter(r => r.status === 'Approved').length)
    const processingCount = computed(() => requests.value.filter(r => r.status === 'Processing').length)
    const completedCount = computed(() => requests.value.filter(r => r.status === 'Completed').length)

    const filteredRequests = computed(() => {
      return requests.value.filter(request => {
        const matchesSearch = request.id.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
        request.item.toLowerCase().includes(searchQuery.value.toLowerCase())
        const matchesStatus = !selectedStatus.value || request.status === selectedStatus.value
        const matchesBranch = !selectedBranch.value || request.branch.includes(selectedBranch.value)
        const matchesPriority = !selectedPriority.value || request.priority === selectedPriority.value
        
        return matchesSearch && matchesStatus && matchesBranch && matchesPriority
      })
    })

    const addRequest = () => {
      // Add request logic here
      showAddModal.value = false
    }

    const approveRequest = (id) => {
      const request = requests.value.find(r => r.id === id)
      if (request) {
        request.status = 'Approved'
      }
    }

    const rejectRequest = (id) => {
      const request = requests.value.find(r => r.id === id)
      if (request) {
        request.status = 'Rejected'
      }
    }

    return {
      showAddModal,
      searchQuery,
      selectedStatus,
      selectedBranch,
      selectedPriority,
      requests,
      pendingCount,
      approvedCount,
      processingCount,
      completedCount,
      filteredRequests,
      addRequest,
      approveRequest,
      rejectRequest
    }
  }
}
</script>
