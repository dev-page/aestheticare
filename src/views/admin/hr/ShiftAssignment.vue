<template>
  <div class="flex module-theme min-h-screen bg-slate-900 text-white">
    <HRSidebar />

    <main class="flex-1 p-4 md:p-6">
      <div class="mb-5">
        <h2 class="text-2xl font-semibold">Weekly Shift Assignment</h2>
        <p class="text-slate-400 text-sm mt-1">Assign shifts, then review the weekly calendar visualization.</p>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <section class="xl:col-span-3 bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Assignment Matrix</h3>
            <input
              v-model="employeeSearch"
              type="text"
              placeholder="Search employee..."
              class="w-56 bg-slate-700 border border-slate-600 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>

          <div class="overflow-x-auto">
            <table class="w-full min-w-[920px] text-xs border-collapse">
              <thead>
                <tr class="text-slate-300 border-b border-slate-700">
                  <th class="px-2 py-2 text-left w-52">Employee</th>
                  <th v-for="day in daysOfWeek" :key="day" class="px-2 py-2 text-center">{{ day }}</th>
                  <th class="px-2 py-2 text-center w-32">Actions</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="emp in filteredEmployees"
                  :key="emp.id"
                  class="border-t border-slate-700 hover:bg-slate-700/40 transition-colors"
                >
                  <td class="px-2 py-2">
                    <p class="font-medium text-sm">{{ emp.fullName }}</p>
                    <p class="text-slate-400 text-[11px]">{{ emp.role }} | {{ emp.branchName }}</p>
                  </td>

                  <td v-for="day in daysOfWeek" :key="day" class="px-2 py-2 text-center">
                    <select
                      :value="rosterValue(emp.id, day)"
                      @change="updateAssignment(emp.id, day, $event.target.value)"
                      class="w-full min-w-[120px] bg-slate-700 border border-slate-600 rounded px-1 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    >
                      <option value="">Off</option>
                      <option
                        v-for="shift in shifts"
                        :key="shift.id"
                        :value="shift.name"
                        :disabled="isShiftAtCapacity(shift.name, day, emp.id)"
                      >
                        {{ getShiftCountLabel(shift.name, day, emp.id) }}
                      </option>
                    </select>
                  </td>

                  <td class="px-2 py-2 text-center">
                    <div class="flex items-center justify-center gap-1">
                      <button
                        @click="cancel"
                        class="bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded text-[11px] transition-colors"
                      >
                        Reset
                      </button>
                      <button
                        @click="saveRoster"
                        class="bg-cyan-600 hover:bg-cyan-500 px-2 py-1 rounded text-[11px] transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </td>
                </tr>

                <tr v-if="filteredEmployees.length === 0">
                  <td colspan="9" class="py-5 text-center text-slate-400">No employees found.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="xl:col-span-2 bg-slate-800 border border-slate-700 rounded-xl p-4">
          <div class="mb-4">
            <h3 class="text-lg font-semibold">Weekly Calendar View</h3>
            <p class="text-xs text-slate-400 mt-1">Live preview based on your current assignments above.</p>
          </div>

          <div class="flex flex-wrap gap-2 mb-3">
            <span class="text-[11px] px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Morning</span>
            <span class="text-[11px] px-2 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Afternoon</span>
            <span class="text-[11px] px-2 py-1 rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">Evening</span>
            <span class="text-[11px] px-2 py-1 rounded bg-slate-500/20 text-slate-300 border border-slate-500/30">Uncategorized</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              v-for="day in daysOfWeek"
              :key="day"
              class="rounded-lg border border-slate-700 bg-slate-900/60 p-3 min-h-[130px]"
            >
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-semibold">{{ day }}</p>
                <p class="text-[11px] text-slate-400">{{ calendarByDay[day].length }} assigned</p>
              </div>

              <div class="space-y-2">
                <div
                  v-for="entry in calendarByDay[day]"
                  :key="`${day}-${entry.employeeId}-${entry.shiftName}`"
                  :class="['rounded-md px-2 py-1 border text-[11px]', shiftCardClass(entry.shiftType)]"
                >
                  <p class="font-medium">{{ entry.employeeName }}</p>
                  <p class="opacity-90">{{ entry.shiftName }}</p>
                </div>
              </div>

              <p v-if="calendarByDay[day].length === 0" class="text-[11px] text-slate-500">No assigned shifts.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, serverTimestamp, onSnapshot, writeBatch } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'
import { toast } from 'vue3-toastify'
import { logActivity } from '@/utils/activityLogger'
import { auth } from '@/config/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'

export default {
  name: 'ShiftAssignment',
  components: { HRSidebar },
  setup() {
    const db = getFirestore(getApp())
    const employees = ref([])
    const shifts = ref([])
    const roster = ref({})
    const initialRoster = ref({})
    const employeeSearch = ref('')
    const currentUserId = ref('')
    const currentBranchId = ref('')
    const rosterDocId = ref('')
    const isApplyingRemote = ref(false)
    const rosterReady = ref(false)
    let autoSaveTimer = null
    let unsubscribeRoster = null
    let unsubscribeAuth = null

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const branches = ref([])

    const loadBranches = async () => {
      const snapshot = await getDocs(collection(db, 'clinics'))
      branches.value = snapshot.docs.map((snap) => ({
        id: snap.id,
        clinicBranch: snap.data().clinicBranch,
        clinicLocation: snap.data().clinicLocation
      }))
    }

    const buildEmptyRoster = () => {
      const empty = {}
      employees.value.forEach((emp) => {
        empty[emp.id] = {}
        daysOfWeek.forEach((day) => {
          empty[emp.id][day] = ''
        })
      })
      return empty
    }

    const normalizeRoster = (rawRoster) => {
      const normalized = buildEmptyRoster()
      employees.value.forEach((emp) => {
        daysOfWeek.forEach((day) => {
          normalized[emp.id][day] = rawRoster?.[emp.id]?.[day] || ''
        })
      })
      return normalized
    }

    const ensureRosterShape = () => {
      const next = { ...(roster.value || {}) }

      employees.value.forEach((emp) => {
        if (!next[emp.id] || typeof next[emp.id] !== 'object') next[emp.id] = {}
        daysOfWeek.forEach((day) => {
          if (typeof next[emp.id][day] !== 'string') next[emp.id][day] = ''
        })
      })

      roster.value = next
    }

    const rosterValue = (employeeId, day) => {
      return roster.value?.[employeeId]?.[day] || ''
    }

    const getShiftCapacity = (shiftName) => {
      const raw = shiftByName.value[shiftName]?.capacity
      const numeric = Number(raw)
      return Number.isFinite(numeric) && numeric > 0 ? numeric : null
    }

    const countAssignedForShift = (shiftName, day, excludeEmployeeId = null) => {
      let count = 0
      Object.entries(roster.value || {}).forEach(([empId, days]) => {
        if (excludeEmployeeId && empId === excludeEmployeeId) return
        if (days?.[day] === shiftName) count += 1
      })
      return count
    }

    const isShiftAtCapacity = (shiftName, day, employeeId) => {
      const capacity = getShiftCapacity(shiftName)
      if (!capacity) return false
      const currentValue = roster.value?.[employeeId]?.[day] || ''
      if (currentValue === shiftName) return false
      return countAssignedForShift(shiftName, day, employeeId) >= capacity
    }

    const getShiftCountLabel = (shiftName, day, employeeId) => {
      const capacity = getShiftCapacity(shiftName)
      if (!capacity) return shiftName
      const assigned = countAssignedForShift(shiftName, day, employeeId)
      return `${shiftName} (${assigned}/${capacity})`
    }

    const updateAssignment = (employeeId, day, value) => {
      if (!roster.value[employeeId] || typeof roster.value[employeeId] !== 'object') {
        roster.value[employeeId] = {}
      }

      const nextValue = value || ''
      const previousValue = roster.value?.[employeeId]?.[day] || ''

      if (nextValue && nextValue !== previousValue) {
        const capacity = getShiftCapacity(nextValue)
        if (capacity) {
          const assignedCount = countAssignedForShift(nextValue, day, employeeId)
          if (assignedCount >= capacity) {
            toast.error(`Capacity reached for ${nextValue} on ${day}.`)
            return
          }
        }
      }

      roster.value[employeeId][day] = nextValue
    }

    const getWeekStartKey = () => {
      const now = new Date()
      const currentDay = now.getDay()
      const diffToMonday = (currentDay + 6) % 7
      const monday = new Date(now)
      monday.setDate(now.getDate() - diffToMonday)
      const yyyy = monday.getFullYear()
      const mm = String(monday.getMonth() + 1).padStart(2, '0')
      const dd = String(monday.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    const loadEmployees = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'users'))
        employees.value = snapshot.docs
          .map((snap) => {
            const data = snap.data()
            const branch = branches.value.find((b) => b.id === data.branchId)
            return {
              id: snap.id,
              ...data,
              role: data.role || data.userType || 'Staff',
              fullName: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
              branchName: branch ? branch.clinicBranch : 'Unassigned'
            }
          })
          .filter((u) => u.userType === 'Staff' && u.role !== 'HR' && u.branchId === currentBranchId.value)
          .filter((u) => !u.archived)
      } catch (err) {
        console.error('Error loading employees:', err)
        toast.error('Failed to load employees.')
      }
    }

    const loadShifts = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'shifts'))
        shifts.value = snapshot.docs.map((snap) => {
          const data = snap.data()
          const abbreviations = { Morning: 'MRN', Afternoon: 'AFT', Evening: 'EVE' }
          const shiftType = data.shiftType || 'Uncategorized'
          const abbr = abbreviations[shiftType] || shiftType
          return {
            id: snap.id,
            ...data,
            shiftType,
            name: `${abbr} || ${formatTime(data.start)} - ${formatTime(data.end)}`
          }
        })
      } catch (err) {
        console.error('Error loading shifts:', err)
        toast.error('Failed to load shifts.')
      }
    }

    const formatTime = (timeStr) => {
      if (!timeStr) return ''
      const [hour, minute] = timeStr.split(':').map(Number)
      const suffix = hour >= 12 ? 'PM' : 'AM'
      const adjustedHour = ((hour + 11) % 12) + 1
      return `${adjustedHour}:${String(minute).padStart(2, '0')}${suffix}`
    }

    const filteredEmployees = computed(() => {
      const q = employeeSearch.value.trim().toLowerCase()
      if (!q) return employees.value
      return employees.value.filter((emp) => {
        return (
          emp.fullName.toLowerCase().includes(q) ||
          String(emp.role || '').toLowerCase().includes(q) ||
          String(emp.branchName || '').toLowerCase().includes(q)
        )
      })
    })

    const shiftByName = computed(() => {
      const map = {}
      shifts.value.forEach((shift) => {
        map[shift.name] = shift
      })
      return map
    })

    const inferShiftType = (shiftName) => {
      const fromDb = shiftByName.value[shiftName]?.shiftType
      if (fromDb) return fromDb
      if (shiftName?.startsWith('MRN')) return 'Morning'
      if (shiftName?.startsWith('AFT')) return 'Afternoon'
      if (shiftName?.startsWith('EVE')) return 'Evening'
      return 'Uncategorized'
    }

    const calendarByDay = computed(() => {
      const out = {}

      daysOfWeek.forEach((day) => {
        const entries = []

        filteredEmployees.value.forEach((emp) => {
          const shiftName = roster.value?.[emp.id]?.[day]
          if (shiftName) {
            entries.push({
              employeeId: emp.id,
              employeeName: emp.fullName,
              shiftName,
              shiftType: inferShiftType(shiftName)
            })
          }
        })

        out[day] = entries.sort((a, b) => a.employeeName.localeCompare(b.employeeName))
      })

      return out
    })

    const shiftCardClass = (shiftType) => {
      if (shiftType === 'Morning') return 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40'
      if (shiftType === 'Afternoon') return 'bg-amber-500/20 text-amber-200 border-amber-500/40'
      if (shiftType === 'Evening') return 'bg-violet-500/20 text-violet-200 border-violet-500/40'
      return 'bg-slate-500/20 text-slate-200 border-slate-500/40'
    }

    onMounted(async () => {
      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          currentUserId.value = ''
          currentBranchId.value = ''
          rosterDocId.value = ''
          employees.value = []
          roster.value = {}
          initialRoster.value = {}
          rosterReady.value = false
          if (unsubscribeRoster) {
            unsubscribeRoster()
            unsubscribeRoster = null
          }
          return
        }

        currentUserId.value = user.uid

        const userSnap = await getDoc(doc(db, 'users', user.uid))
        if (!userSnap.exists()) return

        currentBranchId.value = userSnap.data().branchId || ''
        if (!currentBranchId.value) {
          toast.error('Your account has no branch assignment.')
          return
        }

        await loadBranches()
        await loadEmployees()
        await loadShifts()

        const weekKey = getWeekStartKey()
        rosterDocId.value = `${currentBranchId.value}_${weekKey}`

        if (unsubscribeRoster) unsubscribeRoster()
        unsubscribeRoster = onSnapshot(doc(db, 'shift_assignments', rosterDocId.value), (snap) => {
          isApplyingRemote.value = true
          const savedRoster = snap.exists() ? snap.data().roster || {} : {}
          roster.value = normalizeRoster(savedRoster)
          initialRoster.value = JSON.parse(JSON.stringify(roster.value))
          rosterReady.value = true
          isApplyingRemote.value = false
        })
      })
    })

    onUnmounted(() => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer)
      if (unsubscribeRoster) unsubscribeRoster()
      if (unsubscribeAuth) unsubscribeAuth()
    })

    const persistRoster = async (showToast = false) => {
      if (!currentBranchId.value || !rosterDocId.value) return

      try {
        const weekStart = getWeekStartKey()

        await setDoc(
          doc(db, 'shift_assignments', rosterDocId.value),
          {
            branchId: currentBranchId.value,
            weekStart,
            roster: roster.value,
            updatedBy: currentUserId.value,
            updatedAt: serverTimestamp()
          },
          { merge: true }
        )

        // Keep employee-linked schedules so each employee has their own weekly assignment record.
        const batch = writeBatch(db)
        employees.value.forEach((emp) => {
          const employeeScheduleRef = doc(db, 'users', emp.id, 'schedules', weekStart)
          batch.set(
            employeeScheduleRef,
            {
              employeeId: emp.id,
              employeeName: emp.fullName,
              branchId: currentBranchId.value,
              weekStart,
              assignments: roster.value?.[emp.id] || {},
              updatedBy: currentUserId.value,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          )
        })
        await batch.commit()

        if (showToast) {
          await logActivity(db, {
            module: 'HR',
            action: 'Saved shift assignments',
            details: 'Saved weekly roster assignments.'
          })
          toast.success('Roster saved successfully!')
        }
      } catch (err) {
        console.error('Error persisting roster:', err)
        toast.error('Failed to save roster.')
      }
    }

    watch(
      roster,
      () => {
        if (!rosterReady.value || isApplyingRemote.value) return
        if (autoSaveTimer) clearTimeout(autoSaveTimer)
        autoSaveTimer = setTimeout(() => {
          persistRoster(false)
        }, 150)
      },
      { deep: true }
    )

    watch(
      employees,
      () => {
        ensureRosterShape()
      },
      { deep: true }
    )

    const saveRoster = async () => {
      if (employees.value.length === 0) {
        toast.error('No employees available for assignment.')
        return
      }
      if (shifts.value.length === 0) {
        toast.error('No shifts available. Please add shifts first.')
        return
      }
      await persistRoster(true)
      initialRoster.value = JSON.parse(JSON.stringify(roster.value))
    }

    const cancel = () => {
      roster.value = JSON.parse(JSON.stringify(initialRoster.value))
      toast.info('Roster editing cancelled and reset.')
    }

    return {
      daysOfWeek,
      employees,
      shifts,
      roster,
      employeeSearch,
      filteredEmployees,
      calendarByDay,
      shiftCardClass,
      rosterValue,
      updateAssignment,
      isShiftAtCapacity,
      getShiftCountLabel,
      saveRoster,
      cancel
    }
  }
}
</script>
