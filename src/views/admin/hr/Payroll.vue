<template>
  <div class="flex module-theme bg-slate-900 min-h-screen">
    <HRSidebar />

    <main class="flex-1 p-4 md:p-8">
      <div class="mb-6">
        <h1 class="text-2xl md:text-3xl font-bold text-white mb-1">Payroll Management</h1>
        <p class="text-slate-400 text-sm md:text-base">Create payroll entries and generate payslips for your branch staff.</p>
      </div>

      <div class="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 mb-6">
        <h2 class="text-lg font-semibold text-white mb-4">Create Payroll</h2>

        <div class="mb-4">
          <label class="block text-slate-400 mb-1">Employee</label>
          <select
            v-model="selectedEmployeeId"
            class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Select employee in your branch</option>
            <option v-for="emp in employees" :key="emp.id" :value="emp.id">
              {{ emp.fullName }} - {{ emp.role || 'Staff' }}{{ emp.employmentType ? ` (${emp.employmentType})` : '' }}
            </option>
          </select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-slate-400 mb-1">Hours Worked</label>
            <input
              type="number"
              v-model.number="hoursWorked"
              step="0.25"
              readonly
              class="w-full px-3 py-2 rounded-lg bg-slate-700/80 text-white border border-slate-600 focus:outline-none"
            />
            <p class="text-xs text-slate-400 mt-1">
              {{ loadingHours ? 'Calculating from attendance...' : 'Auto-calculated from attendance records.' }}
            </p>
          </div>
          <div>
            <label class="block text-slate-400 mb-1">Hourly Rate (PHP)</label>
            <input
              type="number"
              v-model.number="hourlyRate"
              min="0"
              step="0.01"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div v-if="selectedEmployeeIsPractitioner" class="mt-4 space-y-3">
          <div class="flex flex-col md:flex-row md:items-end gap-3">
            <div class="flex-1">
              <label class="block text-slate-400 mb-1">Commission Period Start</label>
              <input
                type="date"
                v-model="commissionRangeStart"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="flex-1">
              <label class="block text-slate-400 mb-1">Commission Period End</label>
              <input
                type="date"
                v-model="commissionRangeEnd"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm"
                @click="setCommissionRange('today')"
              >
                Today
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm"
                @click="setCommissionRange('week')"
              >
                This Week
              </button>
              <button
                type="button"
                class="px-3 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm"
                @click="setCommissionRange('month')"
              >
                This Month
              </button>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-slate-400 mb-1">Commission (Completed Appointments)</label>
              <input
                type="number"
                :value="commissionTotal"
                readonly
                class="w-full px-3 py-2 rounded-lg bg-slate-700/80 text-white border border-slate-600 focus:outline-none"
              />
              <p class="text-xs text-slate-400 mt-1">
                {{ loadingCommission ? 'Calculating commission...' : `Based on ${commissionCount} completed appointment(s).` }}
              </p>
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Commission Notes</label>
              <div class="text-sm text-slate-300 bg-slate-700/80 border border-slate-600 rounded-lg px-3 py-2">
                Commission is computed from completed appointments within the selected period.
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 mt-5">
          <button
            @click="savePayrollAndPayslip"
            :disabled="loading"
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {{ loading ? 'Saving...' : 'Save & Generate Payslip' }}
          </button>
          <button
            @click="resetForm"
            :disabled="loading"
            class="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
        </div>
      </div>

      <div class="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 overflow-x-auto">
        <h2 class="text-lg font-semibold text-white mb-4">Payroll History (Your Branch)</h2>

        <table class="w-full text-left min-w-[700px] border-collapse">
          <thead>
            <tr class="text-slate-400 uppercase text-xs sm:text-sm border-b border-slate-700">
              <th class="py-2 px-3 sm:py-3 sm:px-4">Employee</th>
              <th class="py-2 px-3 sm:py-3 sm:px-4">Type</th>
              <th class="py-2 px-3 sm:py-3 sm:px-4">Employment</th>
              <th class="py-2 px-3 sm:py-3 sm:px-4">Hours</th>
              <th class="py-2 px-3 sm:py-3 sm:px-4">Rate</th>
              <th class="py-2 px-3 sm:py-3 sm:px-4">Commission</th>
              <th class="py-2 px-3 sm:py-3 sm:px-4">Total Pay</th>
              <th class="py-2 px-3 sm:py-3 sm:px-4">Date</th>
            </tr>
          </thead>
          <tbody class="text-white">
            <tr v-for="entry in payrolls" :key="entry.id" class="hover:bg-slate-700 transition-colors">
              <td class="py-2 px-3 sm:py-3 sm:px-4 font-medium">{{ entry.employeeName }}</td>
              <td class="py-2 px-3 sm:py-3 sm:px-4">{{ entry.salaryType || '-' }}</td>
              <td class="py-2 px-3 sm:py-3 sm:px-4">{{ entry.employmentType || '-' }}</td>
              <td class="py-2 px-3 sm:py-3 sm:px-4">{{ entry.hoursWorked ?? '-' }}</td>
              <td class="py-2 px-3 sm:py-3 sm:px-4">{{ entry.hourlyRate != null ? formatCurrency(entry.hourlyRate) : '-' }}</td>
              <td class="py-2 px-3 sm:py-3 sm:px-4">{{ entry.commission != null ? formatCurrency(entry.commission) : '-' }}</td>
              <td class="py-2 px-3 sm:py-3 sm:px-4 font-semibold text-green-400">{{ formatCurrency(entry.totalPay) }}</td>
              <td class="py-2 px-3 sm:py-3 sm:px-4 text-slate-300">{{ formatDate(entry.createdAt || entry.date) }}</td>
            </tr>

            <tr v-if="payrolls.length === 0">
              <td colspan="8" class="py-6 text-center text-slate-400">No payroll records found for your branch.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getFirestore, collection, getDocs, addDoc, query, where, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { auth } from '@/config/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { toast } from 'vue3-toastify'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'
import { logActivity } from '@/utils/activityLogger'

export default {
  name: 'PayrollAndPayslipManagement',
  components: { HRSidebar },
  setup() {
    const db = getFirestore(getApp())

    const loading = ref(false)
    const currentUserId = ref('')
    const currentBranchId = ref('')

    const employees = ref([])
    const payrolls = ref([])

    const selectedEmployeeId = ref('')
    const hoursWorked = ref(0)
    const hourlyRate = ref(0)
    const loadingHours = ref(false)
    const commissionTotal = ref(0)
    const commissionCount = ref(0)
    const commissionRangeStart = ref('')
    const commissionRangeEnd = ref('')
    const loadingCommission = ref(false)

    const formatCurrency = (value) => {
      return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP'
      }).format(Number(value) || 0)
    }

    const formatDate = (value) => {
      if (!value) return '-'
      if (value?.toDate) return value.toDate().toLocaleDateString('en-PH')
      if (value?.seconds) return new Date(value.seconds * 1000).toLocaleDateString('en-PH')
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? '-' : parsed.toLocaleDateString('en-PH')
    }

    const toDateInputValue = (date) => {
      if (!date) return ''
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const parseDateInput = (value) => {
      if (!value) return null
      const parsed = new Date(`${value}T00:00:00`)
      return Number.isNaN(parsed.getTime()) ? null : parsed
    }

    const normalizeStatus = (value) => String(value || '').trim().toLowerCase()

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

    const roundToQuarterHour = (hours) => Math.round((Number(hours) || 0) * 4) / 4

    const computeWorkedHoursFromAttendance = async (employeeId) => {
      if (!employeeId || !currentBranchId.value) return 0

      let docs = []
      try {
        const byBranchAndEmployee = query(
          collection(db, 'attendance'),
          where('branchId', '==', currentBranchId.value),
          where('employeeId', '==', employeeId)
        )
        const snapshot = await getDocs(byBranchAndEmployee)
        docs = snapshot.docs
      } catch (_error) {
        const byBranch = query(collection(db, 'attendance'), where('branchId', '==', currentBranchId.value))
        const snapshot = await getDocs(byBranch)
        docs = snapshot.docs.filter((snap) => (snap.data()?.employeeId || '') === employeeId)
      }

      const totalMinutes = docs.reduce((sum, snap) => {
        const data = snap.data() || {}
        const inMinutes = parseClockToMinutes(data.timeIn)
        const outMinutes = parseClockToMinutes(data.timeOut)
        if (inMinutes === null || outMinutes === null) return sum

        let duration = outMinutes - inMinutes
        if (duration < 0) duration += 24 * 60
        return sum + Math.max(duration, 0)
      }, 0)

      return roundToQuarterHour(totalMinutes / 60)
    }

    const resetForm = () => {
      selectedEmployeeId.value = ''
      hoursWorked.value = 0
      hourlyRate.value = 0
      commissionTotal.value = 0
      commissionCount.value = 0
    }

    const loadEmployees = async () => {
      if (!currentBranchId.value) {
        employees.value = []
        return
      }

      const staffQuery = query(
        collection(db, 'users'),
        where('branchId', '==', currentBranchId.value),
        where('userType', '==', 'Staff')
      )

      const snapshot = await getDocs(staffQuery)
      const candidates = snapshot.docs
        .map((snap) => ({ id: snap.id, ...snap.data() }))
        .filter((emp) => emp.id !== currentUserId.value && emp.role !== 'HR' && !emp.archived)
        .map((emp) => ({
          id: emp.id,
          fullName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
          role: emp.role || 'Staff',
          isCommissionBased: emp.role === 'Practitioner',
          basePay: Number(emp.basePay || 0),
          employmentType: emp.employmentType || ''
        }))

      const withShiftAssignments = await Promise.all(
        candidates.map(async (emp) => {
          const scheduleSnap = await getDocs(collection(db, 'users', emp.id, 'schedules'))
          const hasAssignedShift = scheduleSnap.docs.some((docSnap) => {
            const assignments = docSnap.data()?.assignments || {}
            return Object.values(assignments).some((value) => String(value || '').trim() !== '')
          })
          return hasAssignedShift ? emp : null
        })
      )

      employees.value = withShiftAssignments.filter(Boolean)
      if (selectedEmployeeId.value && !employees.value.some((emp) => emp.id === selectedEmployeeId.value)) {
        selectedEmployeeId.value = ''
      }
    }

    const loadPayrolls = async () => {
      if (!currentBranchId.value) {
        payrolls.value = []
        return
      }

      const payrollQuery = query(collection(db, 'payrolls'), where('branchId', '==', currentBranchId.value))
      const snapshot = await getDocs(payrollQuery)

      payrolls.value = snapshot.docs
        .map((snap) => ({ id: snap.id, ...snap.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0
          const bTime = b.createdAt?.seconds || 0
          return bTime - aTime
        })
    }

    const selectedEmployeeIsPractitioner = computed(() => {
      const emp = employees.value.find((e) => e.id === selectedEmployeeId.value)
      return Boolean(emp?.isCommissionBased)
    })

    const setCommissionRange = (preset) => {
      const today = new Date()
      if (preset === 'today') {
        commissionRangeStart.value = toDateInputValue(today)
        commissionRangeEnd.value = toDateInputValue(today)
        return
      }

      if (preset === 'week') {
        const day = today.getDay()
        const diffToMonday = (day + 6) % 7
        const start = new Date(today)
        start.setDate(today.getDate() - diffToMonday)
        const end = new Date(start)
        end.setDate(start.getDate() + 6)
        commissionRangeStart.value = toDateInputValue(start)
        commissionRangeEnd.value = toDateInputValue(end)
        return
      }

      if (preset === 'month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1)
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        commissionRangeStart.value = toDateInputValue(start)
        commissionRangeEnd.value = toDateInputValue(end)
      }
    }

    const extractAppointmentDate = (appointment) => {
      const dateValue = appointment?.date
      if (dateValue) {
        const parsed = new Date(`${dateValue}T00:00:00`)
        if (!Number.isNaN(parsed.getTime())) return parsed
      }

      const candidates = [appointment?.completedAt, appointment?.paidAt, appointment?.updatedAt, appointment?.createdAt]
      for (const value of candidates) {
        if (!value) continue
        if (value?.toDate) return value.toDate()
        if (value?.seconds) return new Date(value.seconds * 1000)
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) return parsed
      }
      return null
    }

    const getAppointmentAmount = (appointment, transactionMap) => {
      const candidates = [
        appointment?.amountPaid,
        appointment?.amount,
        appointment?.price,
        appointment?.fee,
        appointment?.serviceFee
      ]
      for (const value of candidates) {
        const numeric = Number(value)
        if (Number.isFinite(numeric) && numeric > 0) return numeric
      }

      const txAmount = transactionMap?.get(appointment?.id)
      if (Number.isFinite(txAmount) && txAmount > 0) return txAmount
      return 0
    }

    const buildTransactionMap = async (appointmentIds) => {
      if (!appointmentIds.length || !currentBranchId.value) return new Map()
      try {
        const txQuery = query(
          collection(db, 'transactions'),
          where('branchId', '==', currentBranchId.value),
          where('type', '==', 'appointment_payment')
        )
        const snapshot = await getDocs(txQuery)
        const map = new Map()
        snapshot.docs.forEach((snap) => {
          const data = snap.data() || {}
          if (!appointmentIds.includes(data.appointmentId)) return
          if (String(data.status || '').toLowerCase() !== 'paid') return
          const amount = Number(data.amount || 0)
          if (!Number.isFinite(amount) || amount <= 0) return
          const existing = map.get(data.appointmentId) || 0
          map.set(data.appointmentId, existing + amount)
        })
        return map
      } catch (error) {
        console.error('Failed to load appointment transactions:', error)
        return new Map()
      }
    }

    const computeCommissionFromAppointments = async (employeeId) => {
      if (!employeeId || !currentBranchId.value) {
        commissionTotal.value = 0
        commissionCount.value = 0
        return
      }

      const start = parseDateInput(commissionRangeStart.value)
      const end = parseDateInput(commissionRangeEnd.value)
      if (!start || !end) {
        commissionTotal.value = 0
        commissionCount.value = 0
        return
      }

      loadingCommission.value = true
      try {
        const appointmentSnapshot = await getDocs(
          query(collection(db, 'appointments'), where('branchId', '==', currentBranchId.value))
        )
        const appointments = appointmentSnapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }))

        const filtered = appointments.filter((appointment) => {
          const practitionerId = appointment.assignedPractitionerId || appointment.practitionerId || ''
          if (practitionerId !== employeeId) return false
          if (normalizeStatus(appointment.status) !== 'completed') return false

          const dateValue = extractAppointmentDate(appointment)
          if (!dateValue) return false
          const time = dateValue.getTime()
          return time >= start.getTime() && time <= end.getTime()
        })

        const missingAmountIds = filtered
          .filter((appointment) => Number(appointment.amountPaid || appointment.amount || appointment.price || 0) <= 0)
          .map((appointment) => appointment.id)

        const transactionMap = await buildTransactionMap(missingAmountIds)

        const total = filtered.reduce((sum, appointment) => {
          return sum + getAppointmentAmount(appointment, transactionMap)
        }, 0)

        commissionTotal.value = Number(total.toFixed(2))
        commissionCount.value = filtered.length
      } catch (error) {
        console.error('Failed to compute commission:', error)
        toast.error('Failed to compute commission from appointments.')
        commissionTotal.value = 0
        commissionCount.value = 0
      } finally {
        loadingCommission.value = false
      }
    }

    watch(
      selectedEmployeeId,
      async (employeeId) => {
        if (!employeeId) {
          hoursWorked.value = 0
          return
        }

        const selectedEmployee = employees.value.find((emp) => emp.id === employeeId)
        hourlyRate.value = Number(selectedEmployee?.basePay || 0)
        loadingHours.value = true
        try {
          hoursWorked.value = await computeWorkedHoursFromAttendance(employeeId)
        } catch (error) {
          console.error('Error computing attendance hours:', error)
          toast.error('Failed to auto-compute hours from attendance.')
          hoursWorked.value = 0
        } finally {
          loadingHours.value = false
        }

        if (selectedEmployee?.isCommissionBased) {
          if (!commissionRangeStart.value || !commissionRangeEnd.value) {
            setCommissionRange('month')
          }
          await computeCommissionFromAppointments(employeeId)
        } else {
          commissionTotal.value = 0
          commissionCount.value = 0
        }
      }
    )

    watch([commissionRangeStart, commissionRangeEnd], async () => {
      if (!selectedEmployeeId.value) return
      if (!selectedEmployeeIsPractitioner.value) return
      await computeCommissionFromAppointments(selectedEmployeeId.value)
    })

    const savePayrollAndPayslip = async () => {
      if (!selectedEmployeeId.value) {
        toast.error('Please select an employee.')
        return
      }

      const employee = employees.value.find((e) => e.id === selectedEmployeeId.value)
      if (!employee) {
        toast.error('Selected employee is invalid.')
        return
      }

      let totalPay = 0
      const salaryType = employee.isCommissionBased ? 'Hourly + Commission' : 'Hourly'

      if (hourlyRate.value <= 0) {
        toast.error('Hourly rate must be greater than 0.')
        return
      }

      if (hoursWorked.value <= 0) {
        toast.error('No completed attendance hours found for this employee.')
        return
      }

      if (employee.isCommissionBased) {
        const start = parseDateInput(commissionRangeStart.value)
        const end = parseDateInput(commissionRangeEnd.value)
        if (!start || !end) {
          toast.error('Please select a valid commission period.')
          return
        }
      }

      const basePayTotal = Number(hoursWorked.value || 0) * Number(hourlyRate.value || 0)
      const commissionAmount = employee.isCommissionBased ? Number(commissionTotal.value || 0) : 0
      totalPay = basePayTotal + commissionAmount

      loading.value = true
      try {
        await addDoc(collection(db, 'payrolls'), {
          employeeId: employee.id,
          employeeName: employee.fullName,
          branchId: currentBranchId.value,
          employmentType: employee.employmentType || null,
          salaryType,
          hoursWorked: Number(hoursWorked.value || 0),
          hourlyRate: Number(hourlyRate.value || 0),
          commission: commissionAmount,
          totalPay,
          createdBy: currentUserId.value,
          createdAt: serverTimestamp()
        })

        await addDoc(collection(db, 'users', employee.id, 'payslips'), {
          employeeId: employee.id,
          employeeName: employee.fullName,
          jobTitle: employee.role,
          employmentType: employee.employmentType || null,
          salaryType,
          branchId: currentBranchId.value,
          payPeriod: new Date().toLocaleDateString('en-PH'),
          earnings: {
            hoursWorked: Number(hoursWorked.value || 0),
            hourlyRate: Number(hourlyRate.value || 0),
            commission: commissionAmount,
            total: totalPay
          },
          deductions: {},
          totalEarnings: totalPay,
          totalDeductions: 0,
          netPay: totalPay,
          dateGenerated: serverTimestamp(),
          createdBy: currentUserId.value
        })

        await logActivity(db, {
          module: 'HR',
          action: 'Generated payroll',
          details: `Generated ${salaryType.toLowerCase()} payroll for ${employee.fullName} (${formatCurrency(totalPay)}).`,
          targetUserId: employee.id,
          targetUserName: employee.fullName
        })

        toast.success('Payroll and payslip saved successfully.')
        resetForm()
        await loadPayrolls()
      } catch (error) {
        console.error('Error saving payroll/payslip:', error)
        toast.error('Failed to save payroll and payslip.')
      } finally {
        loading.value = false
      }
    }

    let unsubscribeAuth = null

    onMounted(() => {
      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (!user) {
          currentUserId.value = ''
          currentBranchId.value = ''
          employees.value = []
          payrolls.value = []
          return
        }

        currentUserId.value = user.uid
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        currentBranchId.value = userDoc.exists() ? (userDoc.data().branchId || '') : ''

        if (!currentBranchId.value) {
          employees.value = []
          payrolls.value = []
          toast.error('Your account has no branch assignment.', { toastId: 'missing-branch-assignment' })
          return
        }

        await loadEmployees()
        await loadPayrolls()
      })
    })

    onUnmounted(() => {
      if (unsubscribeAuth) unsubscribeAuth()
    })

    return {
      loading,
      employees,
      payrolls,
      selectedEmployeeId,
      hoursWorked,
      hourlyRate,
      loadingHours,
      commissionTotal,
      commissionCount,
      commissionRangeStart,
      commissionRangeEnd,
      loadingCommission,
      selectedEmployeeIsPractitioner,
      setCommissionRange,
      savePayrollAndPayslip,
      resetForm,
      formatCurrency,
      formatDate
    }
  }
}
</script>

