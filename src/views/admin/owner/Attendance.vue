<script>
import { ref, onMounted, computed } from 'vue'
import { getFirestore, collection, getDocs } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'

export default {
  name: 'AttendanceReports',
  components: { OwnerSidebar },
  setup() {
    const db = getFirestore(getApp())
    const attendanceRecords = ref([])

    const branchFilter = ref('')
    const startDate = ref('')
    const endDate = ref('')

    const loadAttendance = async () => {
      const snapshot = await getDocs(collection(db, "attendance"))
      attendanceRecords.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    }

    const filteredRecords = computed(() => {
      return attendanceRecords.value.filter(record => {
        const matchesBranch = branchFilter.value ? record.branch?.toLowerCase().includes(branchFilter.value.toLowerCase()) : true
        const recordDate = new Date(record.date)
        const matchesStartDate = startDate.value ? recordDate >= new Date(startDate.value) : true
        const matchesEndDate = endDate.value ? recordDate <= new Date(endDate.value) : true
        return matchesBranch && matchesStartDate && matchesEndDate
      })
    })

    const summary = computed(() => {
      return filteredRecords.value.reduce((acc, record) => {
        if (record.status === 'Present') acc.present++
        else if (record.status === 'Absent') acc.absent++
        else if (record.status === 'Late') acc.late++
        return acc
      }, { present: 0, absent: 0, late: 0 })
    })

    onMounted(() => {
      loadAttendance()
    })

    return { attendanceRecords, summary, branchFilter, startDate, endDate, filteredRecords}
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 p-6 md:p-10 text-white">
      <h1 class="text-2xl font-bold mb-6">Attendance Reports</h1>

      <!-- Filters -->
      <div class="flex flex-col md:flex-row gap-4 mb-6">
        <input type="text" v-model="branchFilter" placeholder="Filter by branch..."
          class="px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500"/>
        <input type="date" v-model="startDate"
          class="px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500"/>
        <input type="date" v-model="endDate"
          class="px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500"/>
      </div>

      <!-- Summary -->
      <div class="grid grid-cols-3 gap-4 mb-6">
        <div class="bg-slate-800 p-4 rounded-lg text-center">
          <p class="text-slate-400">Present</p>
          <p class="text-green-400 text-xl font-bold">{{ summary.present }}</p>
        </div>
        <div class="bg-slate-800 p-4 rounded-lg text-center">
          <p class="text-slate-400">Absent</p>
          <p class="text-red-400 text-xl font-bold">{{ summary.absent }}</p>
        </div>
        <div class="bg-slate-800 p-4 rounded-lg text-center">
          <p class="text-slate-400">Late</p>
          <p class="text-yellow-400 text-xl font-bold">{{ summary.late }}</p>
        </div>
      </div>

      <div class="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-700">
        <table class="w-full text-left text-sm">
          <thead class="text-slate-400 border-b border-slate-600">
            <tr>
              <th class="px-4 py-2">Name</th>
              <th class="px-4 py-2">Branch</th>
              <th class="px-4 py-2">Date</th>
              <th class="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
          <!-- Show records if available -->
            <tr v-for="record in attendanceRecords" :key="record.id" class="border-b border-slate-700">
              <td class="px-4 py-2">{{ record.staffName }}</td>
              <td class="px-4 py-2">{{ record.branch }}</td>
              <td class="px-4 py-2">{{ new Date(record.date).toLocaleDateString() }}</td>
              <td class="px-4 py-2">
                <span
                  :class="{
                  'text-green-400': record.status === 'Present',
                  'text-red-400': record.status === 'Absent',
                  'text-yellow-400': record.status === 'Late'
                  }">
                  {{ record.status }}
                </span>
              </td>
            </tr>

            <!-- Empty state -->
            <tr v-if="filteredRecords.length === 0">
              <td colspan="4" class="px-4 py-6 text-center text-slate-400">
                No Results Found
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>
