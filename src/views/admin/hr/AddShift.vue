<script>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { toast } from 'vue3-toastify'
import Swal from 'sweetalert2'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'

export default {
  name: 'AddShift',
  components: { HRSidebar },
  setup() {
    const db = getFirestore(getApp())
    const router = useRouter()
    const branches = ref([])

    const currentShift = ref({
      dayOfWeek: '',
      shiftType: '',   // ✅ added shiftType
      start: '',
      end: '',
      branch: '',
      notes: '',
      capacity: 1,
      employees: []
    })

    const daysOfWeek = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    const shiftTypes = ['Morning', 'Afternoon', 'Evening']  // ✅ Shift options

    const loadBranches = async () => {
      try {
        const snapshot = await getDocs(collection(db, "clinics"))
        branches.value = snapshot.docs.map(doc => ({
          id: doc.id,
          branch: doc.data().clinicBranch,
          location: doc.data().clinicLocation
        }))
      } catch (err) {
        console.error("Error loading branches:", err)
      }
    }

    onMounted(loadBranches)

    const resetForm = () => {
      currentShift.value = {
        dayOfWeek: '',
        shiftType: '',
        start: '',
        end: '',
        branch: '',
        notes: '',
        capacity: 1,
        employees: []
      }
    }

    const saveShift = async () => {
      if (!currentShift.value.dayOfWeek || !currentShift.value.shiftType || !currentShift.value.start || !currentShift.value.end || !currentShift.value.branch) {
        toast.error('Day of week, shift type, start time, end time, and branch are required.')
        return
      }

      try {
        const result = await Swal.fire({
          title: 'Confirm Weekly Shift',
          text: `Create a recurring ${currentShift.value.shiftType} shift every ${currentShift.value.dayOfWeek} (${currentShift.value.start} - ${currentShift.value.end}) at ${currentShift.value.branch} with capacity ${currentShift.value.capacity}?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#aaa',
          confirmButtonText: 'Yes, create',
          cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) {
          toast.info("Shift creation cancelled.")
          return
        }

        await addDoc(collection(db, "shifts"), {
          dayOfWeek: currentShift.value.dayOfWeek,
          shiftType: currentShift.value.shiftType, 
          start: currentShift.value.start,
          end: currentShift.value.end,
          branch: currentShift.value.branch,
          notes: currentShift.value.notes,
          capacity: currentShift.value.capacity,
          employees: []
        })

        toast.success('Weekly shift added successfully!')
        resetForm()
        router.push('/hr/shift-list')
      } catch (err) {
        console.error("Error adding shift:", err)
        toast.error("Failed to add shift.")
      }
    }

    return { currentShift, branches, daysOfWeek, shiftTypes, saveShift, resetForm }
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row bg-slate-900 min-h-screen">
    <HRSidebar />

    <main class="flex-1 p-6 md:p-10 text-white">
      <h1 class="text-2xl font-bold mb-6">Add Weekly Shift</h1>

      <div class="bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 border border-slate-700 max-w-2xl mx-auto">
        <form class="space-y-4">
          <!-- Day of Week -->
          <div>
            <label class="block text-slate-400 mb-1">Day of Week</label>
            <select v-model="currentShift.dayOfWeek"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500">
              <option disabled value="">Select Day</option>
              <option v-for="day in daysOfWeek" :key="day" :value="day">{{ day }}</option>
            </select>
          </div>

          <!-- Shift Type -->
          <div>
            <label class="block text-slate-400 mb-1">Shift Type</label>
            <select v-model="currentShift.shiftType"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500">
              <option disabled value="">Select Shift Type</option>
              <option v-for="type in shiftTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>

          <!-- Start & End Time -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-slate-400 mb-1">Start Time</label>
              <input type="time" v-model="currentShift.start"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">End Time</label>
              <input type="time" v-model="currentShift.end"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <!-- Branch -->
          <div>
            <label class="block text-slate-400 mb-1">Branch</label>
            <select v-model="currentShift.branch"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500">
              <option disabled value="">Select Branch</option>
              <option v-for="branch in branches" :key="branch.id" :value="branch.branch">
                {{ branch.branch }} - {{ branch.location }}
              </option>
            </select>
          </div>

          <!-- Capacity -->
          <div>
            <label class="block text-slate-400 mb-1">Capacity (Slots)</label>
            <input type="number" min="1" v-model="currentShift.capacity"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500" />
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-slate-400 mb-1">Notes</label>
            <textarea v-model="currentShift.notes" placeholder="Optional notes"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500"></textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-end space-x-2 pt-4">
            <button type="reset" @click="resetForm"
              class="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded transition">
              Cancel
            </button>
            <button type="button" @click="saveShift"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition">
              Add Weekly Shift
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>
