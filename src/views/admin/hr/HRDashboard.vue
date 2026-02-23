<template>
  <div class="flex bg-slate-900 min-h-screen">
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

      <!-- Branch Distribution -->
      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
        <h2 class="text-xl font-semibold text-white mb-6">Branch Distribution</h2>
        <div class="space-y-4">
          <div v-for="branch in branchDistribution" :key="branch.name" class="flex items-center gap-4">
            <div class="flex-1">
              <div class="flex items-center justify-between mb-2">
                <span class="text-white font-medium">{{ branch.name }}</span>
                <span class="text-slate-400 text-sm">{{ branch.employees }} employees</span>
              </div>
              <div class="w-full bg-slate-700 rounded-full h-2">
                <div
                  class="bg-purple-500 h-2 rounded-full transition-all duration-500"
                  :style="{ width: `${(branch.employees / totalEmployees) * 100}%` }"
                ></div>
              </div>
            </div>
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
import { getFirestore, collection, getDocs, query, where, doc, getDoc, orderBy } from 'firebase/firestore'
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
    const branchDistribution = ref([])
    const recentActivity = ref([])

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
      const staff = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      totalEmployees.value = staff.length
      activeEmployees.value = staff.filter(s => s.status === 'Active').length

      // Step 4: Branch distribution (only HR’s branch)
      branchDistribution.value = [{
        name: clinicData.clinicBranch || 'Assigned Branch',
        employees: staff.length
      }]

      // Step 5: Logs only for HR’s branch
      // ⚠️ Requires composite index: branchId + time
      const logsQuery = query(
        collection(db, 'logs'),
        where('branchId', '==', hrBranchId),
        orderBy('time', 'desc')
      )
      const logsSnapshot = await getDocs(logsQuery)
      recentActivity.value = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        time: doc.data().time?.toDate().toLocaleString() || 'Unknown time'
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
      branchDistribution,
      recentActivity
    }
  }
}
</script>