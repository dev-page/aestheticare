<template>
  <div class="flex bg-slate-900 min-h-screen">
    <HRSidebar />
    
    <main class="flex-1 p-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">HR Dashboard</h1>
        <p class="text-slate-400">Overview of human resources across all branches</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2-2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-slate-400 text-sm mb-1">Total Branches</h3>
          <p class="text-3xl font-bold text-white">{{ totalBranches }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-slate-400 text-sm mb-1">Total Employees</h3>
          <p class="text-3xl font-bold text-white">{{ totalEmployees }}</p>
          <p class="text-xs text-slate-500 mt-1">Across all branches</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-slate-400 text-sm mb-1">Active Employees</h3>
          <p class="text-3xl font-bold text-white">{{ activeEmployees }}</p>
          <p class="text-xs text-green-500 mt-1">+5% from last month</p>
        </div>
      </div>

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

      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
        <h2 class="text-xl font-semibold text-white mb-6">Recent Activity</h2>
        <div class="space-y-4">
          <div v-for="activity in recentActivity" :key="activity.id" class="flex items-start gap-4 pb-4 border-b border-slate-700 last:border-0">
            <div class="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
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
import { getFirestore, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import HRSidebar from '@/components/sidebar/HRSidebar.vue'

export default {
  name: 'HRDashboard',
  components: {
    HRSidebar
  },
  setup() {
    const db = getFirestore(getApp())

    const totalBranches = ref(0)
    const totalEmployees = ref(0)
    const activeEmployees = ref(0)
    const branchDistribution = ref([])
    const recentActivity = ref([])

    const loadDashboardData = async () => {
      try {
        const branchSnapshot = await getDocs(collection(db, 'clinics'))
        const branches = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        const staffSnapshot = await getDocs(collection(db, 'users'))
        const staff = staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(u => u.userType === 'Staff')
      
        totalBranches.value = branches.length
        totalEmployees.value = staff.length
        activeEmployees.value = staff.filter(s => s.status === 'Active').length

        branchDistribution.value = branches.map(branch => ({
          name: branch.clinicBranch,
          employees: staff.filter(s => s.branch === branch.clinicBranch).length
        }))

        const logsQuery = query(collection(db, 'logs'), orderBy('time', 'desc'))
        const logsSnapshot = await getDocs(logsQuery)
        recentActivity.value = logsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          time: doc.data().time?.toDate().toLocaleString() || 'Unknown time'
        }))
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      }
    }

    onMounted(loadDashboardData)

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
