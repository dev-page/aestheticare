<template>
  <div class="flex customer-theme bg-slate-900 min-h-screen">
    <CustomerSidebar />

    <main class="flex-1 p-8">
      <h1 class="text-2xl font-bold text-white mb-6">My Appointments</h1>

      <section>
        <h2 class="text-xl font-semibold text-purple-400 mb-4">Upcoming Appointments</h2>
        <div v-if="loading" class="text-slate-300">Loading appointments...</div>
        <table v-else class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-700 text-white">
              <th class="p-3">Service</th>
              <th class="p-3">Clinic</th>
              <th class="p-3">Date</th>
              <th class="p-3">Time</th>
              <th class="p-3">Status</th>
              <th class="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="appt in upcomingAppointments" :key="appt.id" class="border-b border-slate-600 text-slate-300">
              <td class="p-3">{{ formatAppointmentServices(appt) }}</td>
              <td class="p-3">{{ appt.clinic }}</td>
              <td class="p-3">{{ appt.date }}</td>
              <td class="p-3">{{ appt.time }}</td>
              <td class="p-3">{{ appt.status }}</td>
              <td class="p-3 flex gap-2">
                <button
                  @click="openRequestModal('reschedule', appt)"
                  class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="isRequestPending(appt, 'reschedule')"
                >
                  {{ isRequestPending(appt, 'reschedule') ? 'Pending Approval' : 'Reschedule' }}
                </button>
                <button
                  @click="openRequestModal('cancel', appt)"
                  class="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded disabled:opacity-60 disabled:cursor-not-allowed"
                  :disabled="isRequestPending(appt, 'cancel')"
                >
                  {{ isRequestPending(appt, 'cancel') ? 'Pending Approval' : 'Cancel' }}
                </button>
              </td>
            </tr>
            <tr v-if="!upcomingAppointments.length && !loading">
              <td colspan="6" class="p-4 text-slate-400 text-center">No upcoming appointments.</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section class="mt-10">
        <h2 class="text-xl font-semibold text-purple-400 mb-4">Past Appointments</h2>
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-700 text-white">
              <th class="p-3">Service</th>
              <th class="p-3">Clinic</th>
              <th class="p-3">Date</th>
              <th class="p-3">Time</th>
              <th class="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="appt in pastAppointments" :key="appt.id" class="border-b border-slate-600 text-slate-300">
              <td class="p-3">{{ formatAppointmentServices(appt) }}</td>
              <td class="p-3">{{ appt.clinic }}</td>
              <td class="p-3">{{ appt.date }}</td>
              <td class="p-3">{{ appt.time }}</td>
              <td class="p-3">{{ appt.status }}</td>
            </tr>
            <tr v-if="!pastAppointments.length && !loading">
              <td colspan="5" class="p-4 text-slate-400 text-center">No past appointments.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>

    <div v-if="requestModal.open" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 lg:items-center">
      <div class="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div class="flex items-start justify-between gap-4 border-b border-slate-800 px-6 py-5">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
              {{ requestModal.type === 'cancel' ? 'Cancellation Request' : 'Reschedule Request' }}
            </p>
            <h3 class="mt-1 text-2xl font-bold text-white">
              {{ requestModal.type === 'cancel' ? 'Request Appointment Cancellation' : 'Request Appointment Reschedule' }}
            </h3>
            <p class="mt-2 text-sm text-slate-400">
              {{ requestModal.appointment ? `${formatAppointmentServices(requestModal.appointment)} - ${requestModal.appointment.date} - ${requestModal.appointment.time}` : '' }}
            </p>
          </div>
          <button type="button" class="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white" @click="closeRequestModal">
            <span class="text-xl leading-none">&times;</span>
          </button>
        </div>

        <div class="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          <div class="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
            <p class="font-semibold">Clinic policy</p>
            <p class="mt-2 whitespace-pre-wrap">{{ requestPolicyText }}</p>
            <p class="mt-3 text-cyan-50/90">
              {{ requestModal.type === 'cancel'
                ? `If approved, the refundable amount will exclude the system commission and the request will be reviewed by clinic staff first.`
                : `Reschedule requests must still be approved before the appointment can move to the new date and time.` }}
            </p>
          </div>

          <div>
            <label class="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reason *</label>
            <textarea
              v-model.trim="requestModal.reason"
              rows="4"
              class="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Tell the clinic why you need this request."
            ></textarea>
          </div>

          <div v-if="requestModal.type === 'reschedule'" class="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div class="rounded-3xl border border-slate-700 bg-slate-950/80 p-4">
              <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <button
                  type="button"
                  class="rounded-full border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!canGoToPreviousRequestMonth"
                  @click="changeRequestCalendarMonth(-1)"
                >
                  Prev
                </button>
                <p class="text-lg font-bold text-white">{{ requestCalendarMonthLabel }}</p>
                <button
                  type="button"
                  class="rounded-full border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="!canGoToNextRequestMonth"
                  @click="changeRequestCalendarMonth(1)"
                >
                  Next
                </button>
              </div>

              <div class="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                <span v-for="day in requestCalendarWeekdays" :key="day">{{ day }}</span>
              </div>

              <div class="mt-3 grid grid-cols-7 gap-2">
                <button
                  v-for="day in requestCalendarDays"
                  :key="day.dateKey"
                  type="button"
                  class="relative flex min-h-[4.6rem] flex-col items-center justify-center rounded-2xl border px-2 py-2 transition"
                  :class="[
                    day.inCurrentMonth ? 'border-slate-700 bg-slate-900 text-white' : 'border-slate-800 bg-slate-950 text-slate-500',
                    day.isAvailable ? 'hover:border-cyan-500 hover:bg-cyan-500/10' : 'opacity-45',
                    day.isSelected ? 'border-cyan-400 bg-cyan-500/20 text-cyan-50 ring-1 ring-cyan-400' : '',
                  ]"
                  :disabled="!day.isAvailable"
                  @click="selectRequestDate(day.dateKey)"
                >
                  <span class="text-sm font-semibold">{{ day.dayNumber }}</span>
                  <span
                    class="mt-1 h-2 w-2 rounded-full"
                    :class="day.isAvailable ? (day.isSelected ? 'bg-cyan-300' : 'bg-emerald-400') : 'bg-slate-600'"
                  ></span>
                </button>
              </div>

              <p class="mt-4 text-sm text-slate-300">{{ requestSelectedDateLabel }}</p>
            </div>

            <div class="rounded-3xl border border-slate-700 bg-slate-950/80 p-4">
              <div class="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <p class="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Available Schedules</p>
                  <h4 class="mt-1 text-lg font-bold text-white">Choose a new time slot</h4>
                </div>
                <span class="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">
                  {{ requestBookingDurationMinutes }} mins
                </span>
              </div>

              <div v-if="requestModal.loadingAvailability" class="mt-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                Loading available schedules...
              </div>
              <div v-else-if="requestModal.availabilityError" class="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {{ requestModal.availabilityError }}
              </div>
              <div v-else-if="requestSlotsForSelectedDate.length" class="mt-4 grid max-h-80 grid-cols-1 gap-2 overflow-y-auto pr-1">
                <button
                  v-for="slot in requestSlotsForSelectedDate"
                  :key="slot.key"
                  type="button"
                  class="rounded-2xl border px-4 py-3 text-left transition"
                  :class="[
                    requestModal.requestedSlotKey === slot.key
                      ? 'border-cyan-400 bg-cyan-500/15 text-cyan-50'
                      : 'border-slate-700 bg-slate-900 text-slate-200 hover:border-cyan-500 hover:bg-cyan-500/10',
                  ]"
                  @click="selectRequestSlot(slot)"
                >
                  <div class="text-base font-semibold">Starts at {{ minutesToTime12(parseClockToMinutes(slot.time)) }}</div>
                  <div class="mt-1 text-xs text-slate-400">{{ slot.practitionerName }}</div>
                </button>
              </div>
              <div v-else class="mt-4 rounded-2xl border border-dashed border-slate-700 bg-slate-900 px-4 py-6 text-sm text-slate-400">
                {{ requestModal.requestedDate ? 'No available time slots on this date.' : 'Choose a date from the calendar to view available time slots.' }}
              </div>

              <div class="mt-4 space-y-2 border-t border-slate-800 pt-4 text-sm text-slate-300">
                <p>
                  Assigned Practitioner:
                  <span class="font-semibold text-white">
                    {{ requestModalPractitioner?.fullName || requestModal.appointment?.assignedPractitionerName || requestModal.appointment?.practitionerName || 'Assigned Practitioner' }}
                  </span>
                </p>
                <p>
                  Total duration:
                  <span class="font-semibold text-white">{{ requestBookingDurationMinutes }} mins</span>
                </p>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
            <p class="text-xs text-slate-400">
              The clinic will review this request before any refund or schedule change is finalized.
            </p>
            <div class="flex gap-3">
              <button
                type="button"
                class="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                @click="closeRequestModal"
              >
                Close
              </button>
              <button
                type="button"
                class="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
                @click="submitRequest"
              >
                {{ requestModal.type === 'cancel' ? 'Submit Cancellation' : 'Submit Reschedule' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { auth, db } from '@/config/firebaseConfig'
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import CustomerSidebar from '@/components/sidebar/CustomerSidebar.vue'
import { buildWeekScheduleMap, resolveWeekAssignments } from '@/utils/employeeSchedules'
import { toast } from 'vue3-toastify'

const loading = ref(true)
const upcomingAppointments = ref([])
const pastAppointments = ref([])
const clinicsById = ref({})
const requestModal = ref({
  open: false,
  type: 'cancel',
  appointment: null,
  reason: '',
  requestedDate: '',
  requestedTime: '',
  requestedSlotKey: '',
  loadingAvailability: false,
  availabilityError: '',
  calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
})
const requestModalPractitioner = ref(null)
const requestModalSchedules = ref({})
const requestModalAppointments = ref([])
const requestModalReservations = ref([])
const requestModalLoadSeq = ref(0)

const SLOT_STEP_MINUTES = 30
const SLOT_DAYS_LOOKAHEAD = 365
const requestCalendarWeekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toDateTime = (date, time) => new Date(`${date}T${time || '00:00'}`)

const normalizeAppointmentStatus = (value) => String(value || '').trim().toLowerCase()

const parseClockToMinutes = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return null

  const hhmm = raw.match(/^(\d{1,2}):(\d{2})$/)
  if (hhmm) {
    const hour = Number(hhmm[1])
    const minute = Number(hhmm[2])
    if (Number.isNaN(hour) || Number.isNaN(minute)) return null
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
    return hour * 60 + minute
  }

  const ampm = raw.match(/^(\d{1,2}):(\d{2})\s*([AaPp][Mm])$/)
  if (!ampm) return null

  let hour = Number(ampm[1])
  const minute = Number(ampm[2])
  const marker = ampm[3].toUpperCase()
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null
  if (marker === 'PM' && hour !== 12) hour += 12
  if (marker === 'AM' && hour === 12) hour = 0
  return hour * 60 + minute
}

const minutesToTime12 = (value) => {
  if (!Number.isFinite(value)) return ''
  const minutes = Math.max(0, Math.min(23 * 60 + 59, Math.round(value)))
  const rawHours = Math.floor(minutes / 60)
  const mins = String(minutes % 60).padStart(2, '0')
  const period = rawHours >= 12 ? 'PM' : 'AM'
  const hour12 = rawHours % 12 === 0 ? 12 : rawHours % 12
  return `${hour12}:${mins} ${period}`
}

const toDateInput = (date) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const parseDateInput = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return null
  const [year, month, day] = raw.split('-').map(Number)
  if (!year || !month || !day) return null
  const parsed = new Date(year, month - 1, day)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getWeekStartKey = (date) => {
  const currentDay = date.getDay()
  const diffToMonday = (currentDay + 6) % 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - diffToMonday)
  return toDateInput(monday)
}

const extractShiftWindowMinutes = (shiftLabel) => {
  const label = String(shiftLabel || '').trim()
  if (!label) return null
  const base = label.includes('||') ? String(label.split('||').pop() || '').trim() : label
  const [startRaw, endRaw] = base.split('-').map((part) => String(part || '').trim())
  if (!startRaw || !endRaw) return null
  const start = parseClockToMinutes(startRaw)
  const end = parseClockToMinutes(endRaw)
  if (start === null || end === null) return null
  return { start, end }
}

const getAppointmentDurationMinutes = (appointment) => {
  const explicitDuration = Number(
    appointment?.totalServiceDurationMinutes ||
    appointment?.consultationForServiceDurationMinutes ||
    appointment?.consultationDurationMinutes ||
    appointment?.durationMinutes ||
    0
  )
  if (Number.isFinite(explicitDuration) && explicitDuration > 0) return explicitDuration

  const serviceDurations = Array.isArray(appointment?.serviceDurations)
    ? appointment.serviceDurations.map((value) => Number(value || 0)).filter((value) => value > 0)
    : []
  if (serviceDurations.length) {
    return serviceDurations.reduce((sum, value) => sum + value, 0)
  }

  return 60
}

const buildBlockedRanges = (appointmentList = [], options = {}) => {
  const blocked = new Map()
  const blockingStatuses = new Set(['scheduled', 'approved', 'paid', 'completed', 'in progress', 'ongoing', 'held'])
  const skipAppointmentId = String(options.skipAppointmentId || '').trim()

  appointmentList.forEach((appointment) => {
    const appointmentId = String(appointment?.id || '').trim()
    if (skipAppointmentId && appointmentId === skipAppointmentId) return

    const date = String(appointment?.date || '').trim()
    const practitionerId = String(
      appointment?.assignedPractitionerId || appointment?.practitionerId || ''
    ).trim()
    const status = normalizeAppointmentStatus(appointment?.status)
    if (!date || !practitionerId || !blockingStatuses.has(status)) return

    const start = parseClockToMinutes(appointment?.time)
    if (start === null) return
    const appointmentDuration = getAppointmentDurationMinutes(appointment)
    const end = parseClockToMinutes(appointment?.endTime)
    const normalizedEnd =
      end !== null && end > start
        ? end
        : start + appointmentDuration

    const key = `${date}|${practitionerId}`
    const nextList = blocked.get(key) || []
    nextList.push({ start, end: normalizedEnd })
    blocked.set(key, nextList)
  })

  return blocked
}

const overlapsBlockedRange = (candidateStart, candidateEnd, blockedRanges = []) =>
  blockedRanges.some((range) => candidateStart < range.end && candidateEnd > range.start)

const requestBookingDurationMinutes = computed(() => Math.max(getAppointmentDurationMinutes(requestModal.value.appointment), 30))

const requestAssignedPractitionerId = computed(() =>
  String(requestModal.value.appointment?.assignedPractitionerId || requestModal.value.appointment?.practitionerId || '').trim()
)

const requestBranchId = computed(() =>
  String(requestModal.value.appointment?.branchId || '').trim()
)

const requestCalendarMonthLabel = computed(() =>
  requestModal.value.calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
)

const requestAvailableSlots = computed(() => {
  if (requestModal.value.type !== 'reschedule' || !requestModal.value.open) return []
  if (!requestAssignedPractitionerId.value || !requestBranchId.value) return []
  if (!requestModalSchedules.value || !Object.keys(requestModalSchedules.value).length) return []

  const slotDurationMinutes = Number(requestBookingDurationMinutes.value || 0)
  if (slotDurationMinutes <= 0) return []

  const blockedMap = buildBlockedRanges(
    [...requestModalAppointments.value, ...requestModalReservations.value],
    { skipAppointmentId: requestModal.value.appointment?.id }
  )
  const slots = []
  const today = new Date()
  const todayKey = toDateInput(today)
  const nowMinutes = today.getHours() * 60 + today.getMinutes()

  for (let offset = 0; offset < SLOT_DAYS_LOOKAHEAD; offset += 1) {
    const date = new Date(today)
    date.setDate(today.getDate() + offset)
    const dateKey = toDateInput(date)
    const weekKey = getWeekStartKey(date)
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
    const assignments = resolveWeekAssignments(requestModalSchedules.value, weekKey)
    const shiftLabel = String(assignments?.[dayName] || '').trim()
    if (!shiftLabel) continue

    const windowMinutes = extractShiftWindowMinutes(shiftLabel)
    if (!windowMinutes) continue

    let { start, end } = windowMinutes
    if (end < start) {
      end += 24 * 60
    }

    let slotStart = start
    if (dateKey === todayKey && slotStart <= nowMinutes) {
      slotStart = nowMinutes + SLOT_STEP_MINUTES
    }

    const blockedRanges = blockedMap.get(`${dateKey}|${requestAssignedPractitionerId.value}`) || []

    for (let minutes = slotStart; minutes + slotDurationMinutes <= end; minutes += SLOT_STEP_MINUTES) {
      const normalizedMinutes = minutes % (24 * 60)
      const time = minutesToTime12(normalizedMinutes)
      const key = `${dateKey}|${time}|${requestAssignedPractitionerId.value}`
      const endMinutes = normalizedMinutes + slotDurationMinutes
      if (overlapsBlockedRange(normalizedMinutes, endMinutes, blockedRanges)) {
        continue
      }
      slots.push({
        key,
        date: dateKey,
        time,
        practitionerName: requestModalPractitioner.value?.fullName || requestModal.value.appointment?.assignedPractitionerName || requestModal.value.appointment?.practitionerName || 'Assigned Practitioner',
      })
    }
  }

  return slots
})

const requestAvailableDates = computed(() => [...new Set(requestAvailableSlots.value.map((slot) => slot.date))])
const requestAvailableDateSet = computed(() => new Set(requestAvailableDates.value))

const requestSelectedDateLabel = computed(() => {
  const parsed = parseDateInput(requestModal.value.requestedDate)
  return parsed
    ? parsed.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'Choose a date from the calendar to view available time slots.'
})

const requestSlotsForSelectedDate = computed(() => {
  if (!requestModal.value.requestedDate) return []
  return requestAvailableSlots.value.filter((slot) => slot.date === requestModal.value.requestedDate)
})

const requestCalendarDays = computed(() => {
  const year = requestModal.value.calendarMonth.getFullYear()
  const month = requestModal.value.calendarMonth.getMonth()
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const gridStart = new Date(year, month, 1 - startOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart)
    date.setDate(gridStart.getDate() + index)
    const dateKey = toDateInput(date)
    return {
      dateKey,
      dayNumber: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
      isAvailable: requestAvailableDateSet.value.has(dateKey),
      isSelected: requestModal.value.requestedDate === dateKey,
    }
  })
})

const canGoToPreviousRequestMonth = computed(() => {
  const firstAllowed = new Date()
  firstAllowed.setDate(1)
  firstAllowed.setHours(0, 0, 0, 0)
  return (
    requestModal.value.calendarMonth.getFullYear() > firstAllowed.getFullYear()
    || (
      requestModal.value.calendarMonth.getFullYear() === firstAllowed.getFullYear()
      && requestModal.value.calendarMonth.getMonth() > firstAllowed.getMonth()
    )
  )
})

const canGoToNextRequestMonth = computed(() => {
  const lastAllowed = new Date()
  lastAllowed.setDate(lastAllowed.getDate() + Math.max(0, SLOT_DAYS_LOOKAHEAD - 1))
  lastAllowed.setHours(0, 0, 0, 0)
  return (
    requestModal.value.calendarMonth.getFullYear() < lastAllowed.getFullYear()
    || (
      requestModal.value.calendarMonth.getFullYear() === lastAllowed.getFullYear()
      && requestModal.value.calendarMonth.getMonth() < lastAllowed.getMonth()
    )
  )
})

const changeRequestCalendarMonth = (offset) => {
  const next = new Date(requestModal.value.calendarMonth)
  next.setMonth(next.getMonth() + offset)
  requestModal.value.calendarMonth = new Date(next.getFullYear(), next.getMonth(), 1)
}

const selectRequestDate = (dateKey) => {
  if (!requestAvailableDateSet.value.has(dateKey)) return
  requestModal.value.requestedDate = dateKey
  const selectedDate = parseDateInput(dateKey)
  if (selectedDate) {
    requestModal.value.calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  }
  const firstSlot = requestAvailableSlots.value.find((slot) => slot.date === dateKey)
  if (firstSlot) {
    requestModal.value.requestedTime = firstSlot.time
    requestModal.value.requestedSlotKey = firstSlot.key
    return
  }
  requestModal.value.requestedTime = ''
  requestModal.value.requestedSlotKey = ''
}

const selectRequestSlot = (slot) => {
  if (!slot?.key) return
  requestModal.value.requestedDate = slot.date
  requestModal.value.requestedTime = slot.time
  requestModal.value.requestedSlotKey = slot.key
  const selectedDate = parseDateInput(slot.date)
  if (selectedDate) {
    requestModal.value.calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
  }
}

const resetRequestModalState = () => {
  requestModalLoadSeq.value += 1
  requestModal.value = {
    open: false,
    type: 'cancel',
    appointment: null,
    reason: '',
    requestedDate: '',
    requestedTime: '',
    requestedSlotKey: '',
    loadingAvailability: false,
    availabilityError: '',
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  }
  requestModalPractitioner.value = null
  requestModalSchedules.value = {}
  requestModalAppointments.value = []
  requestModalReservations.value = []
}

const loadRescheduleAvailability = async (appointment, { autoSelect = true } = {}) => {
  const loadSeq = ++requestModalLoadSeq.value
  const branchId = String(appointment?.branchId || '').trim()
  const practitionerId = String(appointment?.assignedPractitionerId || appointment?.practitionerId || '').trim()

  requestModal.value.loadingAvailability = true
  requestModal.value.availabilityError = ''
  requestModalPractitioner.value = null
  requestModalSchedules.value = {}
  requestModalAppointments.value = []
  requestModalReservations.value = []

  try {
    if (!branchId || !practitionerId) {
      requestModal.value.availabilityError = 'This appointment does not include practitioner scheduling details.'
      return
    }

    const [scheduleSnap, appointmentsSnap, reservationsSnap, practitionerSnap] = await Promise.all([
      getDocs(collection(db, 'users', practitionerId, 'schedules')),
      getDocs(query(collection(db, 'appointments'), where('branchId', '==', branchId))),
      getDocs(query(collection(db, 'bookingReservations'), where('branchId', '==', branchId))),
      getDoc(doc(db, 'users', practitionerId)),
    ])

    if (loadSeq !== requestModalLoadSeq.value || !requestModal.value.open) return

    requestModalSchedules.value = buildWeekScheduleMap(
      scheduleSnap.docs.map((snap) => ({ id: snap.id, data: snap.data() || {} }))
    )
    requestModalAppointments.value = appointmentsSnap.docs.map((snap) => ({ id: snap.id, ...snap.data() }))
    requestModalReservations.value = reservationsSnap.docs.map((snap) => ({ id: snap.id, ...snap.data() }))
    const practitionerData = practitionerSnap.exists() ? practitionerSnap.data() || {} : {}
    requestModalPractitioner.value = {
      id: practitionerId,
      fullName:
        String(practitionerData.fullName || '').trim() ||
        `${String(practitionerData.firstName || '').trim()} ${String(practitionerData.lastName || '').trim()}`.trim() ||
        appointment?.assignedPractitionerName ||
        appointment?.practitionerName ||
        'Assigned Practitioner',
    }

    const parsedDate = parseDateInput(appointment?.date) || new Date()
    requestModal.value.calendarMonth = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), 1)

    if (autoSelect) {
      const currentRequestedDate = String(requestModal.value.requestedDate || '').trim()
      const currentRequestedTime = String(requestModal.value.requestedTime || '').trim()
      const existingSelection = currentRequestedDate && currentRequestedTime
        ? requestAvailableSlots.value.find((slot) => slot.date === currentRequestedDate && slot.time === currentRequestedTime)
        : null
      const firstSlot = existingSelection || requestAvailableSlots.value[0] || null
      if (firstSlot) {
        requestModal.value.requestedDate = firstSlot.date
        requestModal.value.requestedTime = firstSlot.time
        requestModal.value.requestedSlotKey = firstSlot.key
        const selectedDate = parseDateInput(firstSlot.date)
        if (selectedDate) {
          requestModal.value.calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        }
      }
    } else {
      const currentRequestedDate = String(requestModal.value.requestedDate || '').trim()
      const currentRequestedTime = String(requestModal.value.requestedTime || '').trim()
      const selection = currentRequestedDate && currentRequestedTime
        ? requestAvailableSlots.value.find((slot) => slot.date === currentRequestedDate && slot.time === currentRequestedTime)
        : null
      requestModal.value.requestedSlotKey = selection?.key || ''
      if (!selection && currentRequestedDate) {
        requestModal.value.requestedDate = ''
        requestModal.value.requestedTime = ''
      } else if (selection) {
        const selectedDate = parseDateInput(selection.date)
        if (selectedDate) {
          requestModal.value.calendarMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
        }
      }
    }
  } catch (error) {
    console.error(error)
    requestModal.value.availabilityError = 'Unable to load available schedules for rescheduling.'
  } finally {
    requestModal.value.loadingAvailability = false
  }
}

const formatAppointmentServices = (appointment) => {
  if (Array.isArray(appointment?.services) && appointment.services.length) {
    return appointment.services.join(', ')
  }
  return appointment?.service || 'Service not set'
}

const getClinicPolicy = (appointment, kind) => {
  const clinic = clinicsById.value[appointment?.branchId] || {}
  if (kind === 'cancel') {
    return (
      clinic.cancellationPolicy ||
      clinic.refundPolicy ||
      'Cancellation requests are reviewed by the clinic first. Approved cancellations are refunded without the system commission.'
    )
  }

  return (
    clinic.reschedulePolicy ||
    'Reschedule requests are reviewed by the clinic first. The new schedule will only take effect after approval.'
  )
}

const requestPolicyText = computed(() => {
  if (!requestModal.value.appointment) return ''
  return getClinicPolicy(requestModal.value.appointment, requestModal.value.type)
})

const isRequestPending = (appt, kind) => {
  const status = String(appt?.status || '').trim().toLowerCase()
  if (status.includes('requested')) return true
  if (kind === 'cancel') {
    return status === 'cancelled' || status === 'completed'
  }
  return status === 'cancelled' || status === 'completed'
}

const openRequestModal = async (type, appt) => {
  requestModal.value = {
    open: true,
    type,
    appointment: appt,
    reason: '',
    requestedDate: '',
    requestedTime: '',
    requestedSlotKey: '',
    loadingAvailability: type === 'reschedule',
    availabilityError: '',
    calendarMonth: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  }

  if (type === 'reschedule') {
    await loadRescheduleAvailability(appt, { autoSelect: true })
  }
}

const closeRequestModal = () => {
  resetRequestModalState()
}

const loadAppointments = async () => {
  const user = auth.currentUser
  if (!user) {
    upcomingAppointments.value = []
    pastAppointments.value = []
    loading.value = false
    return
  }

  loading.value = true
  try {
    const [appointmentsSnap, clinicsSnap] = await Promise.all([
      getDocs(query(collection(db, 'appointments'), where('customerId', '==', user.uid))),
      getDocs(collection(db, 'clinics')),
    ])

    const clinicMap = new Map()
    clinicsSnap.docs.forEach((snap) => {
      const data = snap.data()
      clinicMap.set(snap.id, {
        name: data.clinicName || data.clinicBranch || 'Clinic',
        cancellationPolicy: String(data.cancellationPolicy || '').trim(),
        reschedulePolicy: String(data.reschedulePolicy || '').trim(),
        refundPolicy: String(data.refundPolicy || '').trim(),
      })
    })
    clinicsById.value = Object.fromEntries(clinicMap.entries())

    const now = new Date()
    const all = appointmentsSnap.docs.map((snap) => {
      const data = snap.data()
      return {
        id: snap.id,
        ...data,
        clinic: clinicMap.get(data.branchId)?.name || 'Clinic',
      }
    })

    upcomingAppointments.value = all
      .filter((appt) => appt.status !== 'Cancelled' && toDateTime(appt.date, appt.time) >= now)
      .sort((a, b) => toDateTime(a.date, a.time) - toDateTime(b.date, b.time))

    pastAppointments.value = all
      .filter((appt) => appt.status === 'Cancelled' || toDateTime(appt.date, appt.time) < now)
      .sort((a, b) => toDateTime(b.date, b.time) - toDateTime(a.date, a.time))
  } catch (error) {
    console.error(error)
    toast.error('Failed to load appointments.')
  } finally {
    loading.value = false
  }
}

const submitRequest = async () => {
  const user = auth.currentUser
  if (!user) {
    toast.error('Please log in first.')
    return
  }

  const appt = requestModal.value.appointment
  if (!appt?.id) {
    toast.error('Please choose an appointment first.')
    return
  }

  const reason = String(requestModal.value.reason || '').trim()
  if (!reason) {
    toast.error('Please provide a reason.')
    return
  }

  if (requestModal.value.type === 'cancel') {
    try {
      const totalAmount = Number(appt.totalAmount || appt.amountPaid || appt.amount || 0)
      const commissionAmount = Number(appt.commissionAmount || 0)
      const refundableAmount = Math.max(0, totalAmount - commissionAmount)
      await updateDoc(doc(db, 'appointments', appt.id), {
        status: 'Cancellation Requested',
        cancellationReason: reason,
        cancellationRequestedAt: new Date().toISOString(),
        cancellationPolicySnapshot: getClinicPolicy(appt, 'cancel'),
        refundRequestedAmount: refundableAmount,
        refundCommissionAmount: commissionAmount,
        refundStatus: 'Pending Approval',
      })
      toast.success('Cancellation request submitted for review.')
      closeRequestModal()
      await loadAppointments()
    } catch (error) {
      console.error(error)
      toast.error('Failed to submit cancellation request.')
    }
    return
  }

  if (!requestModal.value.requestedDate || !requestModal.value.requestedTime) {
    toast.error('Please choose a new date and time.')
    return
  }

  try {
    await loadRescheduleAvailability(appt, { autoSelect: false })
    const selectedSlot = requestAvailableSlots.value.find(
      (slot) =>
        slot.date === requestModal.value.requestedDate &&
        slot.time === requestModal.value.requestedTime &&
        slot.key === requestModal.value.requestedSlotKey
    )

    if (!selectedSlot) {
      toast.error('That time slot is no longer available. Please choose another one.')
      return
    }

    await updateDoc(doc(db, 'appointments', appt.id), {
      status: 'Reschedule Requested',
      requestedDate: requestModal.value.requestedDate,
      requestedTime: requestModal.value.requestedTime,
      requestedPractitionerId: requestAssignedPractitionerId.value,
      requestedSlotKey: requestModal.value.requestedSlotKey,
      rescheduleReason: reason,
      rescheduleRequestedAt: new Date().toISOString(),
      reschedulePolicySnapshot: getClinicPolicy(appt, 'reschedule'),
    })
    toast.success('Reschedule request submitted for review.')
    closeRequestModal()
    await loadAppointments()
  } catch (error) {
    console.error(error)
    toast.error('Failed to submit reschedule request.')
  }
}

const cancel = async (appt) => {
  try {
    openRequestModal('cancel', appt)
  } catch (error) {
    console.error(error)
    toast.error('Failed to open cancellation modal.')
  }
}

const reschedule = async (appt) => {
  try {
    openRequestModal('reschedule', appt)
  } catch (error) {
    console.error(error)
    toast.error('Failed to open reschedule modal.')
  }
}

onMounted(loadAppointments)
</script>
