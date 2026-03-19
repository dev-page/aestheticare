<script>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { collection, getDocs, getFirestore } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'

export default {
  name: 'AttendanceReports',
  components: { OwnerSidebar },
  setup() {
    const db = getFirestore(getApp())

    const attendanceRecords = ref([])
    const staffUsers = ref([])
    const branchMap = ref({})
    const nowRef = ref(new Date())

    const branchFilter = ref('')
    const selectedDay = ref('')
    let clockInterval = null

    const toDateKey = (dateObj) => {
      const yyyy = dateObj.getFullYear()
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0')
      const dd = String(dateObj.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    const parseClockToMinutes = (timeValue) => {
      if (!timeValue) return null
      const input = String(timeValue).trim().toUpperCase()
      if (!input) return null

      const hasMeridiem = input.includes('AM') || input.includes('PM')
      const clean = input.replace(/\s+/g, '')
      const meridiem = clean.endsWith('AM') ? 'AM' : clean.endsWith('PM') ? 'PM' : ''
      const timePart = meridiem ? clean.slice(0, -2) : clean
      const parts = timePart.split(':')

      if (parts.length < 2) return null
      let hours = Number(parts[0])
      const minutes = Number(parts[1])
      if (Number.isNaN(hours) || Number.isNaN(minutes)) return null

      if (hasMeridiem) {
        if (hours === 12) hours = 0
        if (meridiem === 'PM') hours += 12
      }

      return hours * 60 + minutes
    }

    const liveTime = computed(() =>
      nowRef.value.toLocaleTimeString('en-PH', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    )

    const liveDate = computed(() =>
      nowRef.value.toLocaleDateString('en-PH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    )

    const todayKey = computed(() => toDateKey(nowRef.value))

    const loadAttendance = async () => {
      const [attendanceSnap, clinicsSnap, usersSnap] = await Promise.all([
        getDocs(collection(db, 'attendance')),
        getDocs(collection(db, 'clinics')),
        getDocs(collection(db, 'users'))
      ])

      const clinicLookup = {}
      clinicsSnap.docs.forEach((clinicDoc) => {
        const clinic = clinicDoc.data() || {}
        clinicLookup[clinicDoc.id] = `${clinic.clinicBranch || 'Branch'}${clinic.clinicLocation ? ` - ${clinic.clinicLocation}` : ''}`
      })
      branchMap.value = clinicLookup

      attendanceRecords.value = attendanceSnap.docs
        .map((recordDoc) => ({ id: recordDoc.id, ...recordDoc.data() }))
        .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0))

      staffUsers.value = usersSnap.docs
        .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
        .filter((user) => user.userType === 'Staff' && !user.archived && user.status === 'Active')
    }

    const activeStaffIds = computed(() => new Set(staffUsers.value.map((staff) => staff.id)))

    const displayRecords = computed(() =>
      attendanceRecords.value
        .filter((record) => activeStaffIds.value.has(record.employeeId))
        .map((record) => {
        const branchName = branchMap.value[record.branchId] || record.branchId || 'N/A'
        const dateValue = record.date || ''
        return {
          ...record,
          dateKey: dateValue,
          displayName: record.employeeName || record.staffName || 'N/A',
          displayBranch: branchName,
          displayDate: dateValue ? new Date(dateValue).toLocaleDateString() : '-',
          displayTimeIn: record.timeIn || '-',
          displayTimeOut: record.timeOut || '-'
        }
      })
    )

    // This table auto-resets every day because it always uses todayKey.
    const todayDailyRecords = computed(() =>
      displayRecords.value.filter((record) => {
        const matchesDay = record.dateKey === todayKey.value
        const matchesBranch = branchFilter.value
          ? record.displayBranch.toLowerCase().includes(branchFilter.value.toLowerCase())
          : true
        return matchesDay && matchesBranch
      })
    )

    const statusRows = computed(() => {
      const selectedKey = selectedDay.value || todayKey.value
      const branchNeedle = branchFilter.value.toLowerCase()

      const staffPool = staffUsers.value.filter((staff) => {
        const branchName = branchMap.value[staff.branchId] || staff.branchId || ''
        return branchNeedle ? branchName.toLowerCase().includes(branchNeedle) : true
      })

      return staffPool
        .map((staff) => {
          const branchName = branchMap.value[staff.branchId] || staff.branchId || 'N/A'
          const fullName = staff.fullName || `${staff.firstName || ''} ${staff.lastName || ''}`.trim() || staff.email || 'N/A'
          const dayRecord = attendanceRecords.value.find(
            (record) => record.employeeId === staff.id && record.date === selectedKey
          )

          const timeIn = dayRecord?.timeIn || '-'
          const timeOut = dayRecord?.timeOut || '-'
          const shiftStart = staff.shiftStart || ''
          const shiftEnd = staff.shiftEnd || ''
          const hasShiftAssignment = Boolean(String(shiftStart).trim() && String(shiftEnd).trim())

          let attendanceStatus = 'N/A'
          if (hasShiftAssignment) {
            attendanceStatus = 'Absent'
            if (dayRecord?.timeIn) {
              const inMinutes = parseClockToMinutes(dayRecord.timeIn)
              const shiftStartMinutes = parseClockToMinutes(shiftStart)
              if (shiftStartMinutes !== null && inMinutes !== null && inMinutes > shiftStartMinutes) {
                attendanceStatus = 'Late'
              } else {
                attendanceStatus = 'Present'
              }
            }
          }

          let workHoursStatus = 'N/A'
          if (hasShiftAssignment) {
            workHoursStatus = '-'
            if (dayRecord?.timeIn && !dayRecord?.timeOut) {
              workHoursStatus = 'No Clock Out'
            } else if (dayRecord?.timeIn && dayRecord?.timeOut) {
              const outMinutes = parseClockToMinutes(dayRecord.timeOut)
              const shiftEndMinutes = parseClockToMinutes(shiftEnd)
              if (shiftEndMinutes !== null && outMinutes !== null) {
                if (outMinutes > shiftEndMinutes) workHoursStatus = 'Overtime'
                else if (outMinutes < shiftEndMinutes) workHoursStatus = 'Undertime'
                else workHoursStatus = 'On Time'
              } else {
                workHoursStatus = 'Completed'
              }
            }
          }

          return {
            id: `${staff.id}-${selectedKey}`,
            name: fullName,
            branch: branchName,
            date: selectedKey,
            timeIn,
            timeOut,
            attendanceStatus,
            workHoursStatus
          }
        })
        .sort((a, b) => a.name.localeCompare(b.name))
    })

    const todaySummary = computed(() =>
      todayDailyRecords.value.reduce(
        (acc, record) => {
          if (record.timeIn) acc.clockedIn += 1
          if (record.timeOut) acc.clockedOut += 1
          if (record.timeIn && !record.timeOut) acc.pendingClockOut += 1
          return acc
        },
        { clockedIn: 0, clockedOut: 0, pendingClockOut: 0 }
      )
    )

    onMounted(async () => {
      selectedDay.value = toDateKey(new Date())
      await loadAttendance()

      clockInterval = setInterval(() => {
        nowRef.value = new Date()
      }, 1000)
    })

    onUnmounted(() => {
      if (clockInterval) clearInterval(clockInterval)
    })

    return {
      branchFilter,
      selectedDay,
      liveTime,
      liveDate,
      todayDailyRecords,
      statusRows,
      todaySummary
    }
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row owner-theme bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 p-6 md:p-10 text-white">
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div>
          <h1 class="text-2xl font-bold">Attendance Reports</h1>
          <p class="text-slate-400">Daily live attendance and filterable status report.</p>
        </div>

        <div class="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 md:min-w-[240px] text-right">
          <p class="text-slate-400 text-xs uppercase tracking-wide">Current Time</p>
          <p class="text-white text-2xl font-semibold leading-tight">{{ liveTime }}</p>
          <p class="text-slate-300 text-sm">{{ liveDate }}</p>
        </div>
      </div>

      <div class="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          v-model="branchFilter"
          placeholder="Filter by branch..."
          class="px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-slate-800 p-4 rounded-lg text-center">
          <p class="text-slate-400">Clocked In Today</p>
          <p class="text-green-400 text-xl font-bold">{{ todaySummary.clockedIn }}</p>
        </div>
        <div class="bg-slate-800 p-4 rounded-lg text-center">
          <p class="text-slate-400">Clocked Out Today</p>
          <p class="text-blue-400 text-xl font-bold">{{ todaySummary.clockedOut }}</p>
        </div>
        <div class="bg-slate-800 p-4 rounded-lg text-center">
          <p class="text-slate-400">Pending Clock Out</p>
          <p class="text-yellow-400 text-xl font-bold">{{ todaySummary.pendingClockOut }}</p>
        </div>
      </div>

      <section class="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700 mb-8">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-white">Daily Attendance (Today)</h2>
          <p class="text-sm text-slate-400">Auto-resets every 24 hours</p>
        </div>

        <table class="w-full text-left text-sm">
          <thead class="text-slate-400 border-b border-slate-600">
            <tr>
              <th class="px-4 py-2">Name</th>
              <th class="px-4 py-2">Branch</th>
              <th class="px-4 py-2">Date</th>
              <th class="px-4 py-2">Time In</th>
              <th class="px-4 py-2">Time Out</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in todayDailyRecords" :key="record.id" class="border-b border-slate-700">
              <td class="px-4 py-2">{{ record.displayName }}</td>
              <td class="px-4 py-2">{{ record.displayBranch }}</td>
              <td class="px-4 py-2">{{ record.displayDate }}</td>
              <td class="px-4 py-2">{{ record.displayTimeIn }}</td>
              <td class="px-4 py-2">{{ record.displayTimeOut }}</td>
            </tr>

            <tr v-if="todayDailyRecords.length === 0">
              <td colspan="5" class="px-4 py-6 text-center text-slate-400">
                No attendance records for today.
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 class="text-lg font-semibold text-white">Attendance Status (Per Day)</h2>
          <input
            type="date"
            v-model="selectedDay"
            class="px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <table class="w-full text-left text-sm">
          <thead class="text-slate-400 border-b border-slate-600">
            <tr>
              <th class="px-4 py-2">Name</th>
              <th class="px-4 py-2">Branch</th>
              <th class="px-4 py-2">Date</th>
              <th class="px-4 py-2">Time In</th>
              <th class="px-4 py-2">Time Out</th>
              <th class="px-4 py-2">Attendance</th>
              <th class="px-4 py-2">Hours</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in statusRows" :key="row.id" class="border-b border-slate-700">
              <td class="px-4 py-2">{{ row.name }}</td>
              <td class="px-4 py-2">{{ row.branch }}</td>
              <td class="px-4 py-2">{{ row.date }}</td>
              <td class="px-4 py-2">{{ row.timeIn }}</td>
              <td class="px-4 py-2">{{ row.timeOut }}</td>
              <td class="px-4 py-2">
                <span
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-medium',
                    row.attendanceStatus === 'Present' ? 'bg-green-500/20 text-green-400' :
                    row.attendanceStatus === 'Late' ? 'bg-yellow-500/20 text-yellow-400' :
                    row.attendanceStatus === 'Absent' ? 'bg-red-500/20 text-red-400' :
                    'bg-slate-600 text-slate-200'
                  ]"
                >
                  {{ row.attendanceStatus }}
                </span>
              </td>
              <td class="px-4 py-2">
                <span
                  :class="[
                    'px-2 py-1 rounded-full text-xs font-medium',
                    row.workHoursStatus === 'Overtime' ? 'bg-blue-500/20 text-blue-400' :
                    row.workHoursStatus === 'Undertime' ? 'bg-orange-500/20 text-orange-400' :
                    row.workHoursStatus === 'No Clock Out' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-slate-600 text-slate-200'
                  ]"
                >
                  {{ row.workHoursStatus }}
                </span>
              </td>
            </tr>

            <tr v-if="statusRows.length === 0">
              <td colspan="7" class="px-4 py-6 text-center text-slate-400">
                No employee records found.
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  </div>
</template>
