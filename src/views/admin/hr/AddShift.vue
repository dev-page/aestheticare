<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getFirestore, collection, addDoc, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/config/firebaseConfig'
import { toast } from 'vue3-toastify'
import Swal from 'sweetalert2'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'
import { logActivity } from '@/utils/activityLogger'

export default {
  name: 'AddShift',
  components: { HRSidebar },
  setup() {
    const db = getFirestore(getApp())
    const router = useRouter()
    const branches = ref([])

    const currentShift = ref({
      shiftType: '',   // ✅ added shiftType
      start: '',
      end: '',
      branch: '',
      notes: '',
      capacity: 1,
      employees: []
    })

    const shiftTypes = ['Morning', 'Afternoon', 'Evening']  // ✅ Shift options

    const loadBranches = async (user) => {
      try {
        if (!user) {
          branches.value = []
          return
        }

        const userSnap = await getDoc(doc(db, 'users', user.uid))
        if (!userSnap.exists()) {
          branches.value = []
          return
        }

        const hrBranchId = userSnap.data().branchId || ''
        if (!hrBranchId) {
          branches.value = []
          toast.error('Your account has no branch assignment.')
          return
        }

        const hrClinicSnap = await getDoc(doc(db, 'clinics', hrBranchId))
        if (!hrClinicSnap.exists()) {
          branches.value = []
          toast.error('Assigned branch was not found.')
          return
        }

        const ownerId = hrClinicSnap.data().ownerId || ''
        if (!ownerId) {
          branches.value = []
          toast.error('Assigned branch has no owner mapping.')
          return
        }

        const ownerClinicsSnapshot = await getDocs(
          query(collection(db, 'clinics'), where('ownerId', '==', ownerId))
        )

        branches.value = ownerClinicsSnapshot.docs.map((clinicDoc) => {
          const data = clinicDoc.data()
          return {
            id: clinicDoc.id,
            branch: data.clinicBranch || data.clinicName || 'Unnamed Branch',
            location: data.clinicLocation || '-'
          }
        })

        const selectedExists = branches.value.some((b) => b.branch === currentShift.value.branch)
        if (!selectedExists) currentShift.value.branch = ''
      } catch (err) {
        console.error("Error loading branches:", err)
      }
    }

    let unsubscribeAuth = null
    onMounted(() => {
      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        await loadBranches(user)
      })
    })

    const resetForm = () => {
      currentShift.value = {
        shiftType: '',
        start: '',
        end: '',
        branch: '',
        notes: '',
        capacity: 1,
        employees: []
      }
    }

    const timeToMinutes = (value) => {
      if (!value) return null
      const parts = String(value).split(':')
      if (parts.length < 2) return null
      const hours = Number(parts[0])
      const minutes = Number(parts[1])
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null
      return hours * 60 + minutes
    }

    const validateShiftInput = () => {
      if (
        !currentShift.value.shiftType ||
        !currentShift.value.start ||
        !currentShift.value.end ||
        !currentShift.value.branch
      ) {
        toast.error('Shift type, start time, end time, and branch are required.')
        return false
      }

      const startMinutes = timeToMinutes(currentShift.value.start)
      const endMinutes = timeToMinutes(currentShift.value.end)
      if (startMinutes === null || endMinutes === null) {
        toast.error('Please provide a valid start and end time.')
        return false
      }
      if (endMinutes <= startMinutes) {
        toast.error('End time must be later than start time.')
        return false
      }

      const capacity = Number(currentShift.value.capacity || 0)
      if (!Number.isFinite(capacity) || capacity < 1) {
        toast.error('Capacity must be at least 1.')
        return false
      }

      if (String(currentShift.value.notes || '').length > 300) {
        toast.error('Notes should be 300 characters or fewer.')
        return false
      }

      return true
    }

    const normalizeCapacity = () => {
      const numeric = Number(currentShift.value.capacity || 0)
      if (!Number.isFinite(numeric) || numeric < 1) {
        currentShift.value.capacity = 1
      } else {
        currentShift.value.capacity = Math.floor(numeric)
      }
    }

    const saveShift = async () => {
      if (!validateShiftInput()) return

      try {
        const result = await Swal.fire({
          title: 'Confirm Weekly Shift',
          text: `Create a recurring ${currentShift.value.shiftType} shift (${currentShift.value.start} - ${currentShift.value.end}) at ${currentShift.value.branch} with capacity ${currentShift.value.capacity}?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, create',
          cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) {
          toast.info("Shift creation cancelled.")
          return
        }

        await addDoc(collection(db, "shifts"), {
          shiftType: currentShift.value.shiftType, 
          start: currentShift.value.start,
          end: currentShift.value.end,
          branch: currentShift.value.branch,
          notes: currentShift.value.notes,
          capacity: currentShift.value.capacity,
          employees: []
        })

        await logActivity(db, {
          module: 'HR',
          action: 'Added shift',
          details: `Created ${currentShift.value.shiftType} shift (${currentShift.value.start} - ${currentShift.value.end}) for ${currentShift.value.branch}.`
        })

        toast.success('Weekly shift added successfully!')
        resetForm()
        router.push('/hr/shift-list')
      } catch (err) {
        console.error("Error adding shift:", err)
        toast.error("Failed to add shift.")
      }
    }

    onUnmounted(() => {
      if (unsubscribeAuth) unsubscribeAuth()
    })

    return { currentShift, branches, shiftTypes, saveShift, resetForm, normalizeCapacity }
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row module-theme bg-slate-900 min-h-screen">
    <HRSidebar />

    <main class="flex-1 p-6 md:p-10 text-white">
      <h1 class="text-2xl font-bold mb-6">Add Weekly Shift</h1>

      <div class="bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 border border-slate-700 max-w-2xl mx-auto">
        <form class="space-y-4">
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
            <input type="number" min="1" v-model="currentShift.capacity" @input="normalizeCapacity"
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
