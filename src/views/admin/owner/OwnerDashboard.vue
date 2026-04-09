<script>
import { ref, onMounted, nextTick, computed } from 'vue'
import { auth } from '@/config/firebaseConfig'
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { onAuthStateChanged } from 'firebase/auth'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'
import DashboardSkeleton from '@/components/common/DashboardSkeleton.vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

export default {
  name: 'OwnerDashboard',
  components: { OwnerSidebar, DashboardSkeleton },
  setup() {
    const db = getFirestore(getApp())
    const loading = ref(true)

    const totalBranches = ref(0)
    const totalEmployees = ref(0)
    const monthlyRevenue = ref(0)
    const totalClients = ref(0)
    const todayAppointments = ref(0)
    const unreadMessages = ref(0)
    const todaysRevenue = ref(0)
    const pendingRequests = ref(0)
    const lowStockCount = ref(0)

    const branches = ref([])
    const staff = ref([])
    const appointments = ref([])
    const transactions = ref([])
    const inventoryItems = ref([])
    const purchaseRequests = ref([])
    const messages = ref([])

    const revenueChartRef = ref(null)
    const employeeChartRef = ref(null)
    let revenueChartInstance = null
    let employeeChartInstance = null

    const chunkArray = (items, size = 10) => {
      const chunks = []
      for (let i = 0; i < items.length; i += size) {
        chunks.push(items.slice(i, i + size))
      }
      return chunks
    }

    const fetchByBranchIds = async (collectionName, branchIds) => {
      if (!branchIds.length) return []

      const chunks = chunkArray(branchIds)
      let results = []

      for (const chunk of chunks) {
        const collectionQuery = query(
          collection(db, collectionName),
          where('branchId', 'in', chunk)
        )
        const snapshot = await getDocs(collectionQuery)
        results = results.concat(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })))
      }

      return results
    }

    const toTimestampDate = (value) => (value?.toDate ? value.toDate() : null)
    const todayKey = () => {
      const today = new Date()
      const month = `${today.getMonth() + 1}`.padStart(2, '0')
      const day = `${today.getDate()}`.padStart(2, '0')
      return `${today.getFullYear()}-${month}-${day}`
    }

    const getEffectiveMaxStock = (item) => {
      const explicitMax = Number(item.maxStock || 0)
      if (explicitMax > 0) return explicitMax
      return Number(item.currentStock || 0)
    }

    const loadDashboardData = async () => {
      loading.value = true
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

        let staffData = []
        if (branchIds.length) {
          const chunks = chunkArray(branchIds)
          for (const chunk of chunks) {
            const staffQuery = query(
              collection(db, "users"),
              where("branchId", "in", chunk),
              where("userType", "==", "Staff")
            )
            const staffSnapshot = await getDocs(staffQuery)
            staffData = staffData.concat(
              staffSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
            )
          }
          staffData = staffData.filter((u) => !u.archived)
        }

        staff.value = staffData
        totalEmployees.value = staff.value.length

        const [clientsData, appointmentsData, transactionsData, inventoryData, purchaseRequestData, messageData] = await Promise.all([
          fetchByBranchIds('clients', branchIds),
          fetchByBranchIds('appointments', branchIds),
          fetchByBranchIds('transactions', branchIds),
          fetchByBranchIds('inventoryItems', branchIds),
          fetchByBranchIds('purchaseRequests', branchIds),
          fetchByBranchIds('messages', branchIds)
        ])

        appointments.value = appointmentsData
        transactions.value = transactionsData
        inventoryItems.value = inventoryData
        purchaseRequests.value = purchaseRequestData
        messages.value = messageData

        totalClients.value = clientsData.length
        unreadMessages.value = messages.value.filter((item) => !item.isRead).length
        todayAppointments.value = appointments.value.filter((item) => item.date === todayKey()).length
        todaysRevenue.value = transactions.value.reduce((sum, entry) => {
          const createdAt = toTimestampDate(entry.createdAt)
          const now = new Date()
          const isToday =
            createdAt &&
            createdAt.getFullYear() === now.getFullYear() &&
            createdAt.getMonth() === now.getMonth() &&
            createdAt.getDate() === now.getDate()

          return isToday ? sum + Number(entry.amount || 0) : sum
        }, 0)
        pendingRequests.value = purchaseRequests.value.filter(
          (item) => String(item.status || 'Pending').toLowerCase() === 'pending'
        ).length
        lowStockCount.value = inventoryItems.value.filter((item) => {
          const stock = Number(item.currentStock || 0)
          const minStock = Number(item.minStock || 0)
          const maxStock = Number(getEffectiveMaxStock(item) || 0)
          const explicitStatus = String(item.stockStatus || '').trim().toLowerCase()

          if (explicitStatus === 'low stock') return true
          if (explicitStatus === 'out of stock') return false
          if (minStock > 0) return stock > 0 && stock < minStock
          return maxStock > 0 ? stock < maxStock * 0.5 : false
        }).length

        monthlyRevenue.value = branches.value.reduce((sum, b) => sum + (b.revenue || 0), 0)
      } catch (error) {
        console.error("Error loading dashboard data:", error)
      } finally {
        loading.value = false
        await nextTick()
        renderRevenueChart()
        if (branches.value.length > 0) {
          renderEmployeeChart()
        }
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
              label: 'Revenue (PHP)',
              data: revenues,
              backgroundColor: 'rgba(255, 204, 41, 0.8)',
              borderColor: 'rgba(255, 230, 128, 1)',
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
  const palette = [
    '#ffd3ac',
    '#ccbeb1',
    '#664c36',
    '#331c08',
    '#c98700',
    '#e0a010',
    '#ffc62e',
    '#ffd866'
  ]
  const chartColors = labels.map((_label, index) => palette[index % palette.length])
  const borderColors = labels.map((_label, index) => palette[index % palette.length])

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
        borderWidth: 1,
        hoverBorderColor: '#ffffff',
        hoverBorderWidth: 2
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

    const upcomingAppointments = computed(() =>
      [...appointments.value]
        .filter((item) => {
          const status = String(item.status || '').trim().toLowerCase()
          return (item.date || '') >= todayKey() && status !== 'cancelled'
        })
        .sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`))
        .slice(0, 6)
    )

    const recentTransactions = computed(() =>
      [...transactions.value]
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 6)
    )

    const lowStockItems = computed(() =>
      [...inventoryItems.value]
        .filter((item) => {
          const stock = Number(item.currentStock || 0)
          const minStock = Number(item.minStock || 0)
          const maxStock = Number(getEffectiveMaxStock(item) || 0)
          const explicitStatus = String(item.stockStatus || '').trim().toLowerCase()

          if (explicitStatus === 'low stock') return true
          if (explicitStatus === 'out of stock') return false
          if (minStock > 0) return stock > 0 && stock < minStock
          return maxStock > 0 ? stock < maxStock * 0.5 : false
        })
        .slice(0, 6)
    )

    const recentPurchaseRequests = computed(() =>
      [...purchaseRequests.value]
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
        .slice(0, 6)
    )

    const formatCurrency = (value) =>
      new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        currencyDisplay: 'code'
      }).format(Number(value || 0))

    const createTimestampLabel = () => {
      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, '0')
      const dd = String(now.getDate()).padStart(2, '0')
      const hh = String(now.getHours()).padStart(2, '0')
      const min = String(now.getMinutes()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}_${hh}-${min}`
    }

    const escapeHtml = (value) =>
      String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

    const downloadBlob = (blob, filename) => {
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }

    const buildExportRows = () => {
      const branchRows = branches.value.map((branch) => ({
        section: 'Branches',
        label: `${branch.clinicBranch || 'Branch'}${branch.clinicLocation ? ` - ${branch.clinicLocation}` : ''}`,
        value: formatCurrency(branch.revenue || 0)
      }))

      const appointmentRows = upcomingAppointments.value.length
        ? upcomingAppointments.value.map((appointment) => ({
            section: 'Upcoming Appointments',
            label: appointment.clientName || 'Unknown Client',
            value: `${appointment.date || '-'} ${appointment.time || ''}`.trim()
          }))
        : [{ section: 'Upcoming Appointments', label: 'Status', value: 'No upcoming appointments.' }]

      const transactionRows = recentTransactions.value.length
        ? recentTransactions.value.map((transaction) => ({
            section: 'Recent Transactions',
            label: transaction.clientName || 'Walk-in Client',
            value: formatCurrency(transaction.amount)
          }))
        : [{ section: 'Recent Transactions', label: 'Status', value: 'No transactions yet.' }]

      const lowStockRows = lowStockItems.value.length
        ? lowStockItems.value.map((item) => ({
            section: 'Low Stock Items',
            label: item.name || 'Item',
            value: `${item.currentStock || 0} ${item.unit || 'units'}`
          }))
        : [{ section: 'Low Stock Items', label: 'Status', value: 'No low stock items.' }]

      const requestRows = recentPurchaseRequests.value.length
        ? recentPurchaseRequests.value.map((request) => ({
            section: 'Recent Purchase Requests',
            label: request.item || '-',
            value: request.status || 'Pending'
          }))
        : [{ section: 'Recent Purchase Requests', label: 'Status', value: 'No purchase requests yet.' }]

      return [
        { section: 'Summary', label: 'Total Branches', value: totalBranches.value },
        { section: 'Summary', label: 'Total Employees', value: totalEmployees.value },
        { section: 'Summary', label: 'Total Revenue', value: formatCurrency(monthlyRevenue.value) },
        { section: 'Summary', label: 'Total Clients', value: totalClients.value },
        { section: 'Summary', label: "Today's Appointments", value: todayAppointments.value },
        { section: 'Summary', label: "Today's Revenue", value: formatCurrency(todaysRevenue.value) },
        { section: 'Summary', label: 'Unread Inbox', value: unreadMessages.value },
        { section: 'Summary', label: 'Pending Purchase Requests', value: pendingRequests.value },
        { section: 'Summary', label: 'Low Stock Alerts', value: lowStockCount.value },
        ...branchRows,
        ...appointmentRows,
        ...transactionRows,
        ...lowStockRows,
        ...requestRows
      ]
    }

    const buildExportSections = () => ({
      summary: [
        { label: 'Total Branches', value: String(totalBranches.value) },
        { label: 'Total Employees', value: String(totalEmployees.value) },
        { label: 'Total Revenue', value: formatCurrency(monthlyRevenue.value) },
        { label: 'Total Clients', value: String(totalClients.value) },
        { label: "Today's Appointments", value: String(todayAppointments.value) },
        { label: "Today's Revenue", value: formatCurrency(todaysRevenue.value) },
        { label: 'Unread Inbox', value: String(unreadMessages.value) },
        { label: 'Pending Purchase Requests', value: String(pendingRequests.value) },
        { label: 'Low Stock Alerts', value: String(lowStockCount.value) },
      ],
      branches: branches.value.length
        ? branches.value.map((branch) => ({
            label: `${branch.clinicBranch || 'Branch'}${branch.clinicLocation ? ` - ${branch.clinicLocation}` : ''}`,
            value: formatCurrency(branch.revenue || 0),
            bar: monthlyRevenue.value > 0 ? Math.max(0, Math.min(100, ((branch.revenue || 0) / monthlyRevenue.value) * 100)) : 0,
          }))
        : [{ label: 'Status', value: 'No branch data available.', bar: 0 }],
      appointments: upcomingAppointments.value.length
        ? upcomingAppointments.value.map((appointment) => ({
            label: appointment.clientName || 'Unknown Client',
            value: `${appointment.date || '-'} ${appointment.time || ''}`.trim(),
          }))
        : [{ label: 'Status', value: 'No upcoming appointments.' }],
      transactions: recentTransactions.value.length
        ? recentTransactions.value.map((transaction) => ({
            label: transaction.clientName || 'Walk-in Client',
            value: formatCurrency(transaction.amount),
          }))
        : [{ label: 'Status', value: 'No transactions yet.' }],
      lowStock: lowStockItems.value.length
        ? lowStockItems.value.map((item) => ({
            label: item.name || 'Item',
            value: `${item.currentStock || 0} ${item.unit || 'units'}`,
          }))
        : [{ label: 'Status', value: 'No low stock items.' }],
      requests: recentPurchaseRequests.value.length
        ? recentPurchaseRequests.value.map((request) => ({
            label: request.item || '-',
            value: request.status || 'Pending',
          }))
        : [{ label: 'Status', value: 'No purchase requests yet.' }],
    })

    const buildDocumentHtml = () => {
      const sections = buildExportSections()
      const summaryCards = sections.summary.map((item) => `
        <div class="card">
          <div class="label">${escapeHtml(item.label)}</div>
          <div class="value">${escapeHtml(item.value)}</div>
        </div>
      `).join('')

      const branchRows = sections.branches.map((row) => `
        <tr>
          <td>${escapeHtml(row.label)}</td>
          <td>${escapeHtml(row.value)}</td>
          <td><div class="bar-track"><div class="bar-fill" style="width:${Number(row.bar || 0)}%"></div></div></td>
        </tr>
      `).join('')

      const simpleRows = (rows) => rows.map((row) => `
        <tr>
          <td>${escapeHtml(row.label)}</td>
          <td>${escapeHtml(row.value)}</td>
        </tr>
      `).join('')

      return `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>AesthetiCare Branch Overview</title>
            <style>
              @page { size: A4; margin: 18mm; }
              body { font-family: Arial, sans-serif; color: #111827; margin: 0; background: #fff; }
              .page { padding: 0; }
              .brand { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 2px solid #d4a64f; }
              .brand h1 { margin: 0; font-size: 26px; color: #111827; }
              .brand p { margin: 4px 0 0; color: #4b5563; }
              .stamp { text-align:right; color:#6b7280; font-size:12px; }
              .section { margin-top: 18px; page-break-inside: avoid; }
              .section h2 { font-size: 16px; margin: 0 0 10px; color: #111827; }
              .summary-grid { display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
              .card { border:1px solid #e5e7eb; border-radius: 12px; padding: 12px; background: #fafafa; }
              .card .label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #6b7280; }
              .card .value { font-size: 18px; font-weight: 700; margin-top: 6px; color: #111827; word-break: break-word; }
              table { width: 100%; border-collapse: collapse; }
              th, td { border: 1px solid #d1d5db; padding: 10px; text-align: left; vertical-align: top; }
              th { background: #f3f4f6; }
              .bar-track { width: 100%; height: 10px; border-radius: 999px; background: #e5e7eb; overflow: hidden; }
              .bar-fill { height: 100%; background: linear-gradient(90deg, #d4a64f, #a16207); }
              .muted { color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="page">
              <div class="brand">
                <div>
                  <h1>AesthetiCare</h1>
                  <p>Branch Overview Report</p>
                  <p class="muted">Monitor clinic locations, employees, and revenue performance</p>
                </div>
                <div class="stamp">
                  Generated<br />${escapeHtml(new Date().toLocaleString())}
                </div>
              </div>

              <div class="section">
                <h2>Summary</h2>
                <div class="summary-grid">${summaryCards}</div>
              </div>

              <div class="section">
                <h2>Branch Revenue</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Revenue</th>
                      <th>Share</th>
                    </tr>
                  </thead>
                  <tbody>${branchRows}</tbody>
                </table>
              </div>

              <div class="section">
                <h2>Upcoming Appointments</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Schedule</th>
                    </tr>
                  </thead>
                  <tbody>${simpleRows(sections.appointments)}</tbody>
                </table>
              </div>

              <div class="section">
                <h2>Recent Transactions</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>${simpleRows(sections.transactions)}</tbody>
                </table>
              </div>

              <div class="section">
                <h2>Low Stock Items</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Current Stock</th>
                    </tr>
                  </thead>
                  <tbody>${simpleRows(sections.lowStock)}</tbody>
                </table>
              </div>

              <div class="section">
                <h2>Recent Purchase Requests</h2>
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>${simpleRows(sections.requests)}</tbody>
                </table>
              </div>
            </div>
          </body>
        </html>
      `
    }

    const exportCsv = () => {
      const rows = buildExportRows()
      const csvLines = [
        ['Platform', 'AesthetiCare', 'Branch Overview'].join(','),
        ['Generated At', new Date().toLocaleString(), ''].join(','),
        'Section,Label,Value',
        ...rows.map((row) => [row.section, row.label, row.value]
          .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
          .join(','))
      ]
      downloadBlob(
        new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' }),
        `clinic-admin-dashboard_${createTimestampLabel()}.csv`
      )
    }

    const exportWord = () => {
      downloadBlob(
        new Blob([buildDocumentHtml()], { type: 'application/msword;charset=utf-8' }),
        `clinic-admin-dashboard_${createTimestampLabel()}.doc`
      )
    }

    const exportPdf = () => {
      const printWindow = window.open('', '_blank', 'width=900,height=700')
      if (!printWindow) return
      printWindow.document.open()
      printWindow.document.write(buildDocumentHtml())
      printWindow.document.close()
      printWindow.focus()
      printWindow.print()
    }

    return {
      loading,
      totalBranches,
      totalEmployees,
      monthlyRevenue,
      totalClients,
      todayAppointments,
      unreadMessages,
      todaysRevenue,
      pendingRequests,
      lowStockCount,
      branches,
      staff,
      revenueChartRef,
      employeeChartRef,
      upcomingAppointments,
      recentTransactions,
      lowStockItems,
      recentPurchaseRequests,
      formatCurrency,
      exportCsv,
      exportWord,
      exportPdf
    }
  }
}
</script>

<template>
  <div class="flex owner-theme bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 p-8">
      <DashboardSkeleton v-if="loading" />
      <div v-else>
      <!-- Header -->
      <div class="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Branch Overview</h1>
          <p class="text-slate-400">Monitor clinic locations, employees, and revenue performance</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button
            type="button"
            class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
            @click="exportCsv"
          >
            Export CSV
          </button>
          <button
            type="button"
            class="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
            @click="exportWord"
          >
            Export Word
          </button>
          <button
            type="button"
            class="rounded-lg bg-amber-600 px-4 py-2 text-sm text-white hover:bg-amber-500"
            @click="exportPdf"
          >
            Export PDF
          </button>
        </div>
      </div>

      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Total Branches</h3>
          <p class="text-3xl font-bold text-white">{{ totalBranches }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Total Employees</h3>
          <p class="text-3xl font-bold text-white">{{ totalEmployees }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Total Revenue</h3>
          <p class="text-3xl font-bold text-white">
            PHP {{ monthlyRevenue ? monthlyRevenue.toLocaleString("en-PH") : 0 }}
          </p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Total Clients</h3>
          <p class="text-3xl font-bold text-white">{{ totalClients }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Today's Appointments</h3>
          <p class="text-3xl font-bold text-white">{{ todayAppointments }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h3 class="text-slate-400 text-sm mb-1">Today's Revenue</h3>
          <p class="text-3xl font-bold text-emerald-400">{{ formatCurrency(todaysRevenue) }}</p>
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

      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 class="text-lg font-semibold text-white mb-2">Unread Inbox</h2>
          <p class="text-3xl font-bold text-white">{{ unreadMessages }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 class="text-lg font-semibold text-white mb-2">Pending Purchase Requests</h2>
          <p class="text-3xl font-bold text-orange-400">{{ pendingRequests }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 class="text-lg font-semibold text-white mb-2">Low Stock Alerts</h2>
          <p class="text-3xl font-bold text-yellow-400">{{ lowStockCount }}</p>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 class="text-xl font-semibold text-white mb-6">Upcoming Appointments</h2>
          <div class="space-y-3">
            <div
              v-for="appointment in upcomingAppointments"
              :key="appointment.id"
              class="p-3 bg-slate-700 rounded-lg flex items-center justify-between"
            >
              <div>
                <p class="text-white text-sm font-medium">{{ appointment.clientName || 'Unknown Client' }}</p>
                <p class="text-slate-400 text-xs">{{ appointment.service || 'Service not set' }}</p>
              </div>
              <p class="text-slate-300 text-sm">{{ appointment.date }} {{ appointment.time || '' }}</p>
            </div>
            <p v-if="upcomingAppointments.length === 0" class="text-slate-400 text-sm">No upcoming appointments.</p>
          </div>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 class="text-xl font-semibold text-white mb-6">Recent Transactions</h2>
          <div class="space-y-3">
            <div
              v-for="transaction in recentTransactions"
              :key="transaction.id"
              class="p-3 bg-slate-700 rounded-lg flex items-center justify-between"
            >
              <div>
                <p class="text-white text-sm font-medium">{{ transaction.clientName || 'Walk-in Client' }}</p>
                <p class="text-slate-400 text-xs">{{ transaction.method || 'N/A' }}</p>
              </div>
              <p class="text-emerald-400 text-sm font-semibold">{{ formatCurrency(transaction.amount) }}</p>
            </div>
            <p v-if="recentTransactions.length === 0" class="text-slate-400 text-sm">No transactions yet.</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 class="text-xl font-semibold text-white mb-6">Low Stock Items</h2>
          <div class="space-y-3">
            <div
              v-for="item in lowStockItems"
              :key="item.id"
              class="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
            >
              <div>
                <p class="text-white text-sm font-medium">{{ item.name }}</p>
                <p class="text-slate-400 text-xs">{{ item.supplier || '-' }}</p>
              </div>
              <p class="text-yellow-400 text-sm font-semibold">
                {{ item.currentStock || 0 }} {{ item.unit || 'units' }}
              </p>
            </div>
            <p v-if="lowStockItems.length === 0" class="text-slate-400 text-sm">No low stock items.</p>
          </div>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 class="text-xl font-semibold text-white mb-6">Recent Purchase Requests</h2>
          <div class="space-y-3">
            <div
              v-for="request in recentPurchaseRequests"
              :key="request.id"
              class="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
            >
              <div>
                <p class="text-white text-sm font-medium">{{ request.item || '-' }}</p>
                <p class="text-slate-400 text-xs">{{ request.supplier || '-' }}</p>
              </div>
              <span
                :class="[
                  'px-2 py-1 rounded-full text-xs font-medium',
                  String(request.status || 'Pending').toLowerCase() === 'pending'
                    ? 'bg-orange-500/20 text-orange-400'
                    : String(request.status || '').toLowerCase() === 'delivered'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-slate-600 text-slate-300'
                ]"
              >
                {{ request.status || 'Pending' }}
              </span>
            </div>
            <p v-if="recentPurchaseRequests.length === 0" class="text-slate-400 text-sm">No purchase requests yet.</p>
          </div>
        </div>
      </div>

      </div>
    </main>
  </div>
</template>
