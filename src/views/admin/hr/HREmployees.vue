<template>
  <div class="flex bg-slate-900 min-h-screen">
    <HRSidebar />
    
    <main class="flex-1 p-8">
      <!-- Header -->
      <div class="mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Employee List</h1>
          <p class="text-slate-400">Manage all employees across branches</p>
        </div>
        <button
          @click="showAddModal = true"
          class="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
          </svg>
          Add Employee
        </button>
      </div>

      <!-- Filters -->
      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-6">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label class="block text-slate-400 text-sm mb-2">Search</label>
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="Search by name or email..."
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label class="block text-slate-400 text-sm mb-2">Filter by Branch</label>
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
            <label class="block text-slate-400 text-sm mb-2">Filter by Position</label>
            <select 
              v-model="selectedPosition"
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">All Positions</option>
              <option value="Manager">Manager</option>
              <option value="Practitioner">Practitioner</option>
              <option value="Receptionist">Receptionist</option>
              <option value="Nurse">Nurse</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Employee Table -->
      <div class="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-slate-700">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Employee</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Position</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Branch</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Email</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Status</th>
                <th class="px-6 py-4 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-700">
              <tr v-for="employee in filteredEmployees" :key="employee.id" class="hover:bg-slate-700/50 transition-colors">
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                      {{ employee.name.charAt(0) }}
                    </div>
                    <div>
                      <p class="text-white font-medium">{{ employee.name }}</p>
                      <p class="text-slate-400 text-sm">ID: {{ employee.id }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-slate-300">{{ employee.position }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-slate-300">{{ employee.branch }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="text-slate-300">{{ employee.email }}</span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span 
                    :class="[
                      'px-3 py-1 rounded-full text-xs font-medium',
                      employee.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    ]"
                  >
                    {{ employee.status }}
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

      <!-- Add Employee Modal -->
      <div v-if="showAddModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div class="bg-slate-800 rounded-xl p-8 max-w-2xl w-full mx-4 border border-slate-700">
          <h2 class="text-2xl font-bold text-white mb-6">Add New Employee</h2>
          <form @submit.prevent="addEmployee" class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-slate-400 text-sm mb-2">Full Name</label>
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
                <label class="block text-slate-400 text-sm mb-2">Position</label>
                <select 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
                >
                  <option value="">Select Position</option>
                  <option value="Manager">Manager</option>
                  <option value="Practitioner">Practitioner</option>
                  <option value="Receptionist">Receptionist</option>
                  <option value="Nurse">Nurse</option>
                </select>
              </div>
              <div>
                <label class="block text-slate-400 text-sm mb-2">Branch</label>
                <select 
                  required
                  class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-yellow-500 focus:outline-none"
                >
                  <option value="">Select Branch</option>
                  <option value="Imus">Imus Branch</option>
                  <option value="Trece">Trece Martires Branch</option>
                  <option value="Dasmarinas">Dasmarinas Branch</option>
                  <option value="Bacoor">Bacoor Branch</option>
                  <option value="Cavite">Cavite City Branch</option>
                </select>
              </div>
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
                Add Employee
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import HRSidebar from '@/components/sidebar/HRSidebar.vue'
import { toast } from 'vue3-toastify'

export default {
  name: 'HREmployees',
  components: {
    HRSidebar
  },
  setup() {
    const db = getFirestore(getApp())

    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const searchQuery = ref('')
    const selectedBranch = ref('')
    const selectedPosition = ref('')

    const employees = ref([])
    const currentEmployee = ref({
      id: null,
      name: '',
      email: '',
      branch: '',
      position: '',
      status: 'Active'
    })

    const loadEmployees = async () => {
      try {
        const staffSnapshot = await getDocs(collection(db, "users"))
        const staffData = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(u => u.userType === 'Staff')
      } catch (err) {
        console.error("Error loading employees:", err)
      }
    }

    onMounted(loadEmployees)

    const filteredEmployees = computed(() => {
      return employees.value.filter(emp => {
        const matchesSearch = emp.name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
                            emp.email?.toLowerCase().includes(searchQuery.value.toLowerCase())
        const matchesBranch = !selectedBranch.value || emp.branch?.includes(selectedBranch.value)
        const matchesPosition = !selectedPosition.value || emp.role === selectedPosition.value || emp.position === selectedPosition.value
        
        return matchesSearch && matchesBranch && matchesPosition
      })
    })

    const addEmployee = () => {
      // Add employee logic here
      showAddModal.value = false
    }

    const editEmployee = (employee) => {
      currentEmployee.value = { ...employee }
      showEditModal.value = true
    }

    const saveEmployee = async () => {
      try {
        if (!currentEmployee.value.id) return
        const employeeRef = doc(db, "users", currentEmployee.value.id)
        await updateDoc(employeeRef, {
          name: currentEmployee.value.name,
          email: currentEmployee.value.email,
          branch: currentEmployee.value.branch,
          position: currentEmployee.value.position,
          status: currentEmployee.value.status
        })
        toast.success("Employee updated successfully!")
        showEditModal.value = false
        await loadEmployees()
      } catch (err) {
        console.error("Error updating employee:", err)
        toast.error("Failed to update employee.")
      }
    }

    return {
      showAddModal,
      showEditModal,
      searchQuery,
      selectedBranch,
      selectedPosition,
      employees,
      filteredEmployees,
      currentEmployee,
      addEmployee,
      editEmployee,
      saveEmployee
    }
  }
}
</script>
