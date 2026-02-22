<script>
import { ref, onMounted } from 'vue'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'
import { getApp } from 'firebase/app'
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
        const branchSnapshot = await getDocs(collection(db, "clinics"))
        const branchData = branchSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

        branches.value = branchData
        totalBranches.value = branches.value.length

        const staffSnapshot = await getDocs(collection(db, "users"))
        const staffData = staffSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(u => u.userType === 'Staff')

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
  staff.value.forEach(s => {
    const key = `${s.clinicBranch} - ${s.role}`
    roleCounts[key] = (roleCounts[key] || 0) + 1
  })

  const labels = Object.keys(roleCounts)
  const data = Object.values(roleCounts)

  if (employeeChartInstance) employeeChartInstance.destroy()

  // 🔹 If no data, show placeholder chart
  const chartData = labels.length > 0
    ? {
        labels,
        datasets: [
          {
            label: 'Employees by Role',
            data,
            backgroundColor: [
              'rgba(30, 144, 255, 0.7)',
              'rgba(255, 99, 132, 0.7)',
              'rgba(255, 206, 86, 0.7)',
              'rgba(75, 192, 192, 0.7)',
              'rgba(153, 102, 255, 0.7)'
            ],
            borderColor: [
              'rgba(30, 144, 255, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 206, 86, 1)',
              'rgba(75, 192, 192, 1)',
              'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
          }
        ]
      }
    : {
        labels: ['No Data'],
        datasets: [
          {
            label: 'Employees by Role',
            data: [1],
            backgroundColor: ['rgba(128,128,128,0.5)'],
            borderColor: ['rgba(128,128,128,1)'],
            borderWidth: 1
          }
        ]
      }

  employeeChartInstance = new Chart(employeeChartRef.value, {
    type: 'pie',
    data: chartData,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1,
      plugins: {
        title: {
          display: true,
          text: 'Employees Distribution by Branch & Role',
          color: '#fff'
        },
        legend: { labels: { color: '#fff' } }
      }
    }
  })
}

    onMounted(async () => {
      await loadDashboardData()
      renderRevenueChart()
      renderEmployeeChart()
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
  <div class="flex bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 p-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Branch Overview</h1>
        <p class="text-slate-400">Monitor clinic locations, staff, and revenue performance</p>
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