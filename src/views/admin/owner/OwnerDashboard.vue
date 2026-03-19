<script>
import { ref, onMounted } from 'vue'
import { auth } from '@/config/firebaseConfig'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { onAuthStateChanged } from 'firebase/auth'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default {
  name: 'OwnerDashboard',
  components: { OwnerSidebar },
  setup() {
    const db = getFirestore(getApp())

    const totalBranches = ref(0)
    const totalEmployees = ref(0)
    const monthlyRevenue = ref(0)

    const branches = ref([])
    const staff = ref([])
    const activityLogs = ref([])   // 🔹 Activity log state

    const revenueChartRef = ref(null)
    const employeeChartRef = ref(null)
    let revenueChartInstance = null
    let employeeChartInstance = null

    const loadDashboardData = async () => {
      try {
        const user = auth.currentUser
        if (!user) return

        const branchQuery = query(
          collection(db, "clinics"),
          where("ownerId", "==", user.uid)
        )

        const branchSnapshot = await getDocs(branchQuery)
        const branchData = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        branches.value = branchData
        totalBranches.value = branches.value.length

        const branchIds = branches.value.map(b => b.id)

        const staffSnapshot = await getDocs(collection(db, "users"))
        const staffData = staffSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.userType === 'Staff' && branchIds.includes(u.branchId) && !u.archived)

        staff.value = staffData
        totalEmployees.value = staff.value.length
        
        monthlyRevenue.value = branches.value.reduce((sum, b) => sum + (b.revenue || 0), 0)
        
        renderRevenueChart()
        if(branches.value.length > 0) {
          renderEmployeeChart()
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      }
    }
    const renderRevenueChart = () => {
      if(!revenueChartRef.value) return

      const labels = branches.value.map(b => `${b.clinicBranch} (${b.clinicLocation || 'Unknown'})`)
      const revenues = branches.value.map(b => b.revenue || 0)

      if(revenueChartInstance) revenueChartInstance.destroy()

      revenueChartInstance = new Chart(revenueChartRef.value, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'Revenue (₱)',
              data: revenues,
              backgroundColor: 'rgba(255, 215, 0, 0.7)',
              borderColor: 'rgba(255, 215, 0, 1)',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'Branch Performance', color: '#fff' }, // make title white
            legend: { labels: { color: '#fff' } } // legend text white
          },
          scales: {
            x: {
              ticks: { color: '#fff' }, // x-axis labels white
              grid: { color: 'rgba(255,255,255,0.1)' } // subtle grid lines
            },
            y: {
              ticks: { color: '#fff' }, // y-axis numbers white
              grid: { color: 'rgba(255,255,255,0.1)' }
            }
          }
        }
      })
    }

const renderEmployeeChart = () => {
  if (!employeeChartRef.value) return

  const roleCounts = {}
  let totalStaff = 0

  staff.value.forEach((member) => {
    const rawRole = String(member.role || '').trim()
    const normalizedRole = rawRole
      ? `${rawRole.charAt(0).toUpperCase()}${rawRole.slice(1).toLowerCase()}`
      : 'Unassigned'
    roleCounts[normalizedRole] = (roleCounts[normalizedRole] || 0) + 1
    totalStaff += 1
  })

  const labels = Object.keys(roleCounts)
  const data = Object.values(roleCounts)
  const chartColors = labels.map((_label, index) => {
    const hue = (index * 47) % 360
    return `hsla(${hue}, 70%, 55%, 0.75)`
  })
  const borderColors = labels.map((_label, index) => {
    const hue = (index * 47) % 360
    return `hsla(${hue}, 70%, 55%, 1)`
  })

  if (employeeChartInstance) employeeChartInstance.destroy()

  employeeChartInstance = new Chart(employeeChartRef.value, {
    type: 'pie',
    data: {
      labels: labels.length > 0 ? labels : ['No Data'],
      datasets: [{
        label: 'Employees by Role',
        data: data.length > 0 ? data : [1],
        backgroundColor: data.length > 0 ? chartColors : ['rgba(128,128,128,0.5)'],
        borderColor: data.length > 0 ? borderColors : ['rgba(128,128,128,1)'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: { display: true, text: 'Employees Distribution by Role', color: '#fff' },
        legend: { labels: { color: '#fff' } },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (data.length === 0) return 'No data'
              const value = context.raw
              const percentage = ((value / totalStaff) * 100).toFixed(1)
              return `${context.label}: ${value} (${percentage}%)`
            }
          }
        }
      }
    }
  })
}

    onMounted(() => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) return
        await loadDashboardData()
      })
    })

    return {
      totalBranches,
      totalEmployees,
      monthlyRevenue,
      branches,
      staff,
      activityLogs,
      revenueChartRef,
      employeeChartRef
    }
  }
}
</script>

<template>
  <div class="flex owner-theme bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 p-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Branch Overview</h1>
        <p class="text-slate-400">Monitor clinic locations, employees, and revenue performance</p>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Total Branches</h3>
          <p class="text-3xl font-bold text-white">{{ totalBranches }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Total Employees</h3>
          <p class="text-3xl font-bold text-white">{{ totalEmployees }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Monthly Revenue</h3>
          <p class="text-3xl font-bold text-white">
            ₱{{ monthlyRevenue ? monthlyRevenue.toLocaleString("en-PH") : 0 }}
          </p>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 class="text-xl font-semibold text-white mb-6">Branch Revenue Performance</h2>
          <canvas ref="revenueChartRef"></canvas>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 class="text-xl font-semibold text-white mb-6">Employees by Role</h2>
          <canvas ref="employeeChartRef" class="w-50 h-50"></canvas>
        </div>
      </div>

    </main>
  </div>
</template>
