<template>
  <div class="flex min-h-screen bg-slate-900 text-white">
    <HRSidebar />

    <main class="flex-1 p-8">
      <h2 class="text-2xl font-bold mb-6">Weekly Shift Assignment</h2>

      <div class="bg-slate-800 p-6 rounded-xl shadow-lg overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-slate-400">
              <th class="p-2">Employee</th>
              <th v-for="day in daysOfWeek" :key="day" class="p-2">{{ day }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in employees" :key="emp.id" class="border-t border-slate-700">
              <td class="p-2 font-medium">{{ emp.name }} ({{ emp.branch }})</td>
              <td v-for="day in daysOfWeek" :key="day" class="p-2">
                <select
                  v-model="roster[emp.id][day]"
                  class="px-2 py-1 rounded bg-slate-700 text-white border border-slate-600"
                >
                  <option value="">--</option>
                  <option v-for="shift in shifts" :key="shift.id" :value="shift.name">
                    {{ shift.name }}
                  </option>
                </select>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="flex justify-end space-x-2 mt-6">
          <button @click="cancel" class="bg-slate-600 hover:bg-slate-700 px-4 py-2 rounded transition">
            Cancel
          </button>
          <button @click="saveRoster" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded transition">
            Save Roster
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'
import { toast } from 'vue3-toastify'

export default {
  name: 'ShiftAssignment',
  components: { HRSidebar },
  setup() {
    const db = getFirestore(getApp())
    const employees = ref([])
    const shifts = ref([]) // ✅ dynamic shifts
    const daysOfWeek = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
    const roster = ref({})

    const loadEmployees = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users"))
        employees.value = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.userType === "Staff")

        // initialize roster structure
        employees.value.forEach(emp => {
          roster.value[emp.id] = {}
          daysOfWeek.forEach(day => {
            roster.value[emp.id][day] = ""
          })
        })
      } catch (err) {
        console.error("Error loading employees:", err)
        toast.error("Failed to load employees.")
      }
    }

    const loadShifts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "shifts"))
        shifts.value = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().name // e.g. "Morning", "Afternoon", "Evening"
        }))
      } catch (err) {
        console.error("Error loading shifts:", err)
        toast.error("Failed to load shifts.")
      }
    }

    onMounted(async () => {
      await loadEmployees()
      await loadShifts()
    })

    const saveRoster = async () => {
      try {
        for (const emp of employees.value) {
          for (const day of daysOfWeek) {
            const shiftName = roster.value[emp.id][day]
            if (shiftName) {
              const shiftId = `${day}-${shiftName}`
              const shiftRef = doc(db, "shifts", shiftId)
              const shiftSnap = await getDoc(shiftRef)

              if (shiftSnap.exists()) {
                const shiftData = shiftSnap.data()
                const updatedEmployees = Array.isArray(shiftData.employees)
                  ? shiftData.employees
                  : []

                if (!updatedEmployees.includes(emp.name)) {
                  updatedEmployees.push(emp.name)

                  // ✅ enforce capacity if defined
                  if (shiftData.capacity && updatedEmployees.length > shiftData.capacity) {
                    toast.error(`${shiftName} on ${day} is full (capacity ${shiftData.capacity}).`)
                  } else {
                    await updateDoc(shiftRef, { employees: updatedEmployees })
                  }
                }
              } else {
                console.warn(`Shift ${shiftId} not found in Firestore.`)
              }
            }
          }
        }
        toast.success("Roster saved successfully!")
      } catch (err) {
        console.error("Error saving roster:", err)
        toast.error("Failed to save roster.")
      }
    }

    const cancel = () => {
      toast.info("Roster editing cancelled.")
    }

    return { employees, shifts, daysOfWeek, roster, saveRoster, cancel }
  }
}
</script>
