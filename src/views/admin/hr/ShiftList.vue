<template>
  <div class="flex flex-col md:flex-row bg-slate-900 min-h-screen">
    <HRSidebar />

    <main class="flex-1 p-6 md:p-10 text-white">
      <h1 class="text-2xl font-bold mb-6">Weekly Shift List</h1>

      <!-- Filters -->
      <div class="bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 border border-slate-700 mb-6 flex flex-wrap gap-2">
        <select v-model="selectedBranch" class="px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500">
          <option value="">All Branches</option>
          <option v-for="branch in branchOptions" :key="branch" :value="branch">{{ branch }}</option>
        </select>

        <select v-model="selectedShiftType" class="px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500">
          <option value="">All Shift Types</option>
          <option v-for="type in shiftTypes" :key="type" :value="type">{{ type }}</option>
        </select>

      </div>

      <!-- Shifts Table -->
      <div class="bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 border border-slate-700 overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-slate-400">
              <th class="p-2">Day</th>
              <th class="p-2">Shift Type</th>
              <th class="p-2">Start</th>
              <th class="p-2">End</th>
              <th class="p-2">Branch</th>
              <th class="p-2">Capacity</th>
              <th class="p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="shift in filteredShifts" :key="shift.id" class="border-t border-slate-700">
              <td class="p-2">{{ shift.dayOfWeek }}</td>
              <td class="p-2">{{ shift.shiftType }}</td>
              <td class="p-2">{{ shift.start }}</td>
              <td class="p-2">{{ shift.end }}</td>
              <td class="p-2">{{ shift.branch }}</td>
              <td class="p-2">{{ shift.capacity }}</td>
              <td class="p-2 space-x-2">
                <button @click="editShift(shift)" class="bg-slate-600 hover:bg-slate-700 px-2 py-1 rounded">Edit</button>
                <button @click="deleteShift(shift.id)" class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded">Delete</button>
              </td>
            </tr>
            <tr v-if="filteredShifts.length === 0">
              <td colspan="7" class="text-center p-4 text-slate-400">No shifts found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add Shift Modal -->
      <div v-if="showAddModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-slate-800 p-6 rounded-lg shadow-lg w-96">
          <h3 class="text-xl mb-4">Add Weekly Shift</h3>
          <form @submit.prevent="addShift" class="space-y-3">
            <select v-model="currentShift.dayOfWeek" class="w-full px-3 py-2 rounded bg-slate-700 text-white" required>
              <option disabled value="">Select Day</option>
              <option v-for="day in daysOfWeek" :key="day" :value="day">{{ day }}</option>
            </select>

            <select v-model="currentShift.shiftType" class="w-full px-3 py-2 rounded bg-slate-700 text-white" required>
              <option disabled value="">Select Shift Type</option>
              <option v-for="type in shiftTypes" :key="type" :value="type">{{ type }}</option>
            </select>

            <input type="time" v-model="currentShift.start" class="w-full px-3 py-2 rounded bg-slate-700 text-white" required />
            <input type="time" v-model="currentShift.end" class="w-full px-3 py-2 rounded bg-slate-700 text-white" required />
            <input type="text" v-model="currentShift.branch" placeholder="Branch" class="w-full px-3 py-2 rounded bg-slate-700 text-white" required />
            <input type="number" min="1" v-model="currentShift.capacity" placeholder="Capacity" class="w-full px-3 py-2 rounded bg-slate-700 text-white" />

            <div class="flex justify-end space-x-2">
              <button type="button" @click="showAddModal = false" class="bg-slate-600 px-3 py-1 rounded">Cancel</button>
              <button type="submit" class="bg-blue-600 px-3 py-1 rounded">Save</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Edit Shift Modal -->
      <div v-if="showEditModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div class="bg-slate-800 p-6 rounded-lg shadow-lg w-96">
          <h3 class="text-xl mb-4">Edit Weekly Shift</h3>
          <form @submit.prevent="saveShift" class="space-y-3">
            <select v-model="currentShift.dayOfWeek" class="w-full px-3 py-2 rounded bg-slate-700 text-white" required>
              <option disabled value="">Select Day</option>
              <option v-for="day in daysOfWeek" :key="day" :value="day">{{ day }}</option>
            </select>

            <select v-model="currentShift.shiftType" class="w-full px-3 py-2 rounded bg-slate-700 text-white" required>
              <option disabled value="">Select Shift Type</option>
              <option v-for="type in shiftTypes" :key="type" :value="type">{{ type }}</option>
            </select>

            <input type="time" v-model="currentShift.start" class="w-full px-3 py-2 rounded bg-slate-700 text-white" required />
            <input type="time" v-model="currentShift.end" class="w-full px-3 py-2 rounded bg-slate-700 text-white" required />
            <input type="text" v-model="currentShift.branch" class="w-full px-3 py-2 rounded bg-slate-700 text-white" required />
            <input type="number" min="1" v-model="currentShift.capacity" class="w-full px-3 py-2 rounded bg-slate-700 text-white" />

            <div class="flex justify-end space-x-2">
              <button type="button" @click="showEditModal = false" class="bg-slate-600 px-3 py-1 rounded">Cancel</button>
              <button type="submit" class="bg-blue-600 px-3 py-1 rounded">Update</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'
import { toast } from 'vue3-toastify'
import Swal from 'sweetalert2'

export default {
  name: 'ShiftList',
  components: { HRSidebar },
  setup() {
    const db = getFirestore(getApp())
    const shifts = ref([])
    const showAddModal = ref(false)
    const showEditModal = ref(false)
    const currentShift = ref({ id: null, dayOfWeek: '', shiftType: '', start: '', end: '', branch: '', capacity: 1, employees: [] })

    const daysOfWeek = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    const shiftTypes = ['Morning', 'Afternoon', 'Evening']

    const selectedBranch = ref('')
    const selectedShiftType = ref('')

    const loadShifts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "shifts"))
        shifts.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      } catch (err) {
        console.error("Error loading shifts:", err)
      }
    }

    onMounted(loadShifts)

    const branchOptions = computed(() => {
      return [...new Set(shifts.value.map(s => s.branch))]
    })

    const filteredShifts = computed(() => {
      return shifts.value.filter(s => {
        const branchMatch = selectedBranch.value ? s.branch === selectedBranch.value : true
        const typeMatch = selectedShiftType.value ? s.shiftType === selectedShiftType.value : true
        return branchMatch && typeMatch
      })
    })

    const addShift = async () => {
      if (!currentShift.value.dayOfWeek || !currentShift.value.shiftType || !currentShift.value.start || !currentShift.value.end || !currentShift.value.branch) {
        toast.error("Day, shift type, start, end, and branch are required.")
        return
      }
      try {
        const result = await Swal.fire({
          title: 'Confirm Weekly Shift',
          text: `Create ${currentShift.value.shiftType} shift every ${currentShift.value.dayOfWeek} (${currentShift.value.start} - ${currentShift.value.end}) at ${currentShift.value.branch}?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#aaa',
          confirmButtonText: 'Yes, create',
          cancelButtonText: 'Cancel'
        })
        if (!result.isConfirmed) return

        await addDoc(collection(db, "shifts"), { ...currentShift.value })
        toast.success("Shift added successfully!")
        showAddModal.value = false
        currentShift.value = { id: null, dayOfWeek: '', shiftType: '', start: '', end: '', branch: '', capacity: 1, employees: [] }
        await loadShifts()
      } catch (err) {
        console.error("Error adding shift:", err)
        toast.error("Failed to add shift.")
      }
    }

    const editShift = (shift) => {
      currentShift.value = { ...shift }
      showEditModal.value = true
    }

    const saveShift = async () => {
      if (!currentShift.value.id) return
      try {
        const shiftRef = doc(db, "shifts", currentShift.value.id)
        await updateDoc(shiftRef, { ...currentShift.value })
        toast.success("Shift updated successfully!")
        showEditModal.value = false
        currentShift.value = { id: null, dayOfWeek: '', shiftType: '', start: '', end: '', branch: '', capacity: 1, employees: [] }
        await loadShifts()
      } catch (err) {
        console.error("Error updating shift:", err)
        toast.error("Failed to update shift.")
      }
    }

    const deleteShift = async (id) => {
      try {
        const result = await Swal.fire({
          title: 'Delete Weekly Shift?',
          text: "This recurring schedule will be removed.",
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          confirmButtonText: 'Delete'
        })
        if (!result.isConfirmed) return

        await deleteDoc(doc(db, "shifts", id))
        toast.success("Shift deleted successfully!")
        await loadShifts()
      } catch (err) {
        console.error("Error deleting shift:", err)
        toast.error("Failed to delete shift.")
      }
    }

    return {
      shifts,
      showAddModal,
      showEditModal,
      currentShift,
      daysOfWeek,
      shiftTypes,
      selectedBranch,
      selectedShiftType,
      branchOptions,
      filteredShifts,
      addShift,
      editShift,
      saveShift,
      deleteShift
    }
  }
}
</script>
