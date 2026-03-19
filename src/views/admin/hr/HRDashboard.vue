<template>
  <div class="flex module-theme bg-slate-900 min-h-screen">
    <HRSidebar />
    
    <main class="flex-1 p-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">HR Dashboard</h1>
        <p class="text-slate-400">Overview of human resources for your branch</p>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Total Branches</h3>
          <p class="text-3xl font-bold text-white">{{ totalBranches }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Total Employees</h3>
          <p class="text-3xl font-bold text-white">{{ totalEmployees }}</p>
          <p class="text-xs text-slate-500 mt-1">In your branch</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Active Employees</h3>
          <p class="text-3xl font-bold text-white">{{ activeEmployees }}</p>
        </div>
      </div>

      <!-- Employee Distribution -->
      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
        <h2 class="text-xl font-semibold text-white mb-6">Employee Distribution</h2>
        <div class="space-y-4">
          <div v-for="role in roleDistribution" :key="role.name" class="flex items-center gap-4">
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <span class="text-white font-medium">{{ role.name }}</span>
                <span class="text-slate-400 text-sm">{{ role.employees }} employees</span>
              </div>
              <div class="w-full bg-slate-700 rounded-full h-2">
                <div
                  class="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  :style="{ width: `${(role.employees / totalEmployees) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DSS: Unassigned Shifts -->
      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
        <div class="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 class="text-xl font-semibold text-white">DSS: Unassigned Shifts</h2>
            <p class="text-slate-400 text-sm">Employees who do not have any shift assignments yet.</p>
          </div>
          <router-link
            to="/hr/shift-assignment"
            class="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm"
          >
            Assign Shifts
          </router-link>
        </div>

        <div v-if="unassignedLoading" class="text-slate-400 text-sm">Checking employee schedules...</div>
        <div v-else-if="unassignedEmployees.length === 0" class="text-emerald-300 text-sm">
          All employees have at least one assigned shift.
        </div>
        <div v-else class="space-y-3">
          <div
            v-for="employee in unassignedEmployees"
            :key="employee.id"
            class="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3"
          >
            <div>
              <p class="text-white text-sm font-medium">{{ employee.fullName || employee.name || 'Unnamed' }}</p>
              <p class="text-slate-400 text-xs">{{ employee.role || 'Staff' }}</p>
            </div>
            <span class="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-full">
              No shifts assigned
            </span>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 class="text-xl font-semibold text-white mb-6">Recent Activity</h2>
        <div class="space-y-4">
          <div v-for="activity in recentActivity" :key="activity.id" class="flex items-start gap-4 pb-4 border-b border-slate-700 last:border-0">
            <div class="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-white text-sm">{{ activity.action }}</p>
              <p class="text-slate-400 text-xs mt-1">{{ activity.time }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { auth } from '@/config/firebaseConfig'
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { useRouter } from 'vue-router'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'
import { toast } from 'vue3-toastify'

export default {
  name: 'HRDashboard',
  components: { HRSidebar },
  setup() {
    const db = getFirestore(getApp())
    const router = useRouter()

    const totalBranches = ref(0)
    const totalEmployees = ref(0)
    const activeEmployees = ref(0)
    const roleDistribution = ref([])
    const recentActivity = ref([])
    const unassignedEmployees = ref([])
    const unassignedLoading = ref(false)

    const checkPasswordChange = async () => {
      const user = auth.currentUser
      if (!user) return

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (userDoc.exists() && userDoc.data().mustChangePassword) {
        toast.warning("You must change your password before continuing.")
        setTimeout(() => {
          router.push('/change-password')
        }, 1500)
      }
    }

    const loadDashboardData = async () => {
      const user = auth.currentUser
      if (!user) return

      const userDoc = await getDoc(doc(db, 'users', user.uid))
      if (!userDoc.exists()) return

      const hrData = userDoc.data()
      const hrBranchId = hrData.branchId

      if (!hrBranchId) {
        toast.error("Your account is missing a branch assignment.")
        return
      }

      // Step 1: Get clinic for HR’s branch
      const clinicDoc = await getDoc(doc(db, 'clinics', hrBranchId))
      if (!clinicDoc.exists()) {
        toast.error("Assigned branch not found in clinics.")
        return
      }
      const clinicData = clinicDoc.data()
      const ownerId = clinicData.ownerId

      if (!ownerId) {
        toast.error("Clinic is missing ownerId.")
        return
      }

      // Step 2: Count all branches under this owner
      const branchQuery = query(collection(db, 'clinics'), where('ownerId', '==', ownerId))
      const branchSnapshot = await getDocs(branchQuery)
      const branches = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      totalBranches.value = branches.length

      // Step 3: Employees only for HR’s branch
      const staffQuery = query(
        collection(db, 'users'),
        where('branchId', '==', hrBranchId),
        where('userType', '==', 'Staff')
      )
      const staffSnapshot = await getDocs(staffQuery)
      const staff = staffSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((user) => !user.archived)
      totalEmployees.value = staff.length
      activeEmployees.value = staff.filter(s => s.status === 'Active').length

      // Step 4: Employee distribution by role (HR’s branch)
      const roleMap = new Map()
      staff.forEach((member) => {
        const role = member.role || 'Staff'
        roleMap.set(role, (roleMap.get(role) || 0) + 1)
      })
      roleDistribution.value = Array.from(roleMap.entries())
        .map(([name, employees]) => ({ name, employees }))
        .sort((a, b) => b.employees - a.employees)

      // Step 4.5: DSS - Employees with no shift assignments
      unassignedLoading.value = true
      const unassigned = []
      for (const employee of staff) {
        const scheduleSnap = await getDocs(collection(db, 'users', employee.id, 'schedules'))
        if (scheduleSnap.empty) {
          unassigned.push(employee)
          continue
        }

        const hasShift = scheduleSnap.docs.some((snap) => {
          const assignments = snap.data()?.assignments || {}
          return Object.values(assignments).some((value) => {
            const normalized = String(value || '').trim()
            return normalized && normalized.toLowerCase() !== 'off'
          })
        })

        if (!hasShift) {
          unassigned.push(employee)
        }
      }
      unassignedEmployees.value = unassigned
      unassignedLoading.value = false

      // Step 5: Logs only for HR’s branch
      // ⚠️ Requires composite index: branchId + time
      const activityQuery = query(
        collection(db, 'activities'),
        where('actorId', '==', user.uid)
      )
      const activitySnapshot = await getDocs(activityQuery)
      recentActivity.value = activitySnapshot.docs
        .map((snap) => ({ id: snap.id, ...snap.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0
          const bTime = b.createdAt?.seconds || 0
          return bTime - aTime
        })
        .slice(0, 10)
        .map((activity) => ({
          id: activity.id,
          action: activity.action || 'Activity recorded',
          time: activity.createdAt?.toDate?.().toLocaleString() || 'Unknown time'
        }))
    }

    onMounted(async () => {
      await loadDashboardData()
      await checkPasswordChange()
    })

    return {
      totalBranches,
      totalEmployees,
      activeEmployees,
      roleDistribution,
      recentActivity,
      unassignedEmployees,
      unassignedLoading
    }
  }
}
</script>
