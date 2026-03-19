<template>
  <div class="flex module-theme bg-slate-900 min-h-screen">
    <ReceptionistSidebar />

    <main class="flex-1 p-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Add Appointment</h1>
        <p class="text-slate-400">Schedule a new appointment for a registered client.</p>
      </div>

      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 max-w-3xl">
        <form class="space-y-6" @submit.prevent="submitAppointment">
          <div>
            <label class="block text-slate-400 text-sm mb-2">Client</label>
            <select
              v-model="form.clientId"
              required
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">Select client</option>
              <option v-for="client in clients" :key="client.id" :value="client.id">
                {{ client.fullName }} - {{ client.phone || client.email || 'No contact' }}
              </option>
            </select>
          </div>

          <div>
            <label class="block text-slate-400 text-sm mb-2">Practitioner</label>
            <select
              v-model="form.practitionerId"
              required
              class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="">Select practitioner</option>
              <option v-for="practitioner in availablePractitioners" :key="practitioner.id" :value="practitioner.id">
                {{ practitioner.fullName }} - {{ practitioner.email || practitioner.phoneNumber || 'No contact' }}
              </option>
            </select>
            <p v-if="form.date && availablePractitioners.length === 0" class="mt-2 text-xs text-amber-300">
              No practitioners are available for the selected date based on shift assignment.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-slate-400 text-sm mb-2">Date</label>
              <input v-model="form.date" type="date" required class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none" />
            </div>
            <div>
              <label class="block text-slate-400 text-sm mb-2">Time</label>
              <input v-model="form.time" type="time" required class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none" />
            </div>
          </div>

          <div>
            <label class="block text-slate-400 text-sm mb-2">Service</label>
            <input v-model="form.service" type="text" required placeholder="e.g. Consultation, Facial, Treatment" class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none" />
          </div>

          <div>
            <label class="block text-slate-400 text-sm mb-2">Notes</label>
            <textarea v-model="form.notes" rows="3" class="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-purple-500 focus:outline-none"></textarea>
          </div>

          <div class="flex items-center gap-3">
            <button
              type="submit"
              :disabled="isSubmitting"
              class="px-5 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 disabled:opacity-60 text-white text-sm"
            >
              {{ isSubmitting ? 'Saving...' : 'Save Appointment' }}
            </button>
            <router-link
              to="/receptionist/appointments"
              class="px-5 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 text-sm"
            >
              Cancel
            </router-link>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getFirestore, collection, addDoc, getDocs, query, where, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getApp } from 'firebase/app'
import ReceptionistSidebar from '@/components/sidebar/ReceptionistSidebar.vue'
import { toast } from 'vue3-toastify'
import { logActivity } from '@/utils/activityLogger'

export default {
  name: 'ReceptionistAddAppointment',
  components: { ReceptionistSidebar },
  setup() {
    const router = useRouter()
    const db = getFirestore(getApp())
    const auth = getAuth(getApp())

    const currentUserId = ref('')
    const currentBranchId = ref('')
    const clients = ref([])
    const practitioners = ref([])
    const practitionerSchedules = ref({})
    const isSubmitting = ref(false)

    const form = ref({
      clientId: '',
      practitionerId: '',
      date: '',
      time: '',
      service: '',
      notes: ''
    })

    const loadClients = async () => {
      if (!currentBranchId.value) return
      const snapshot = await getDocs(query(collection(db, 'clients'), where('branchId', '==', currentBranchId.value)))
      clients.value = snapshot.docs.map((snap) => ({ id: snap.id, ...snap.data() }))
    }

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

    const getWeekStartKey = (dateString) => {
      const match = String(dateString || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!match) return ''
      const year = Number(match[1])
      const month = Number(match[2])
      const day = Number(match[3])
      const date = new Date(year, month - 1, day)
      if (Number.isNaN(date.getTime())) return ''

      const currentDay = date.getDay()
      const diffToMonday = (currentDay + 6) % 7
      const monday = new Date(date)
      monday.setDate(date.getDate() - diffToMonday)

      const yyyy = monday.getFullYear()
      const mm = String(monday.getMonth() + 1).padStart(2, '0')
      const dd = String(monday.getDate()).padStart(2, '0')
      return `${yyyy}-${mm}-${dd}`
    }

    const getDayName = (dateString) => {
      const match = String(dateString || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
      if (!match) return ''
      const year = Number(match[1])
      const month = Number(match[2])
      const day = Number(match[3])
      const date = new Date(year, month - 1, day)
      if (Number.isNaN(date.getTime())) return ''
      return date.toLocaleDateString('en-US', { weekday: 'long' })
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

    const loadPractitionerSchedules = async (list) => {
      const pairs = await Promise.all(
        list.map(async (practitioner) => {
          const scheduleSnap = await getDocs(collection(db, 'users', practitioner.id, 'schedules'))
          const weekMap = {}

          scheduleSnap.docs.forEach((snap) => {
            const data = snap.data() || {}
            const weekKey = String(data.weekStart || snap.id || '').trim()
            if (!weekKey) return
            weekMap[weekKey] = data.assignments || {}
          })

          return [practitioner.id, weekMap]
        })
      )

      practitionerSchedules.value = Object.fromEntries(pairs)
    }

    const loadPractitioners = async () => {
      if (!currentBranchId.value) return
      const snapshot = await getDocs(query(collection(db, 'users'), where('branchId', '==', currentBranchId.value)))
      const list = snapshot.docs
        .map((snap) => ({ id: snap.id, ...snap.data() }))
        .filter((user) => {
          const role = String(user.role || '').trim().toLowerCase()
          const userType = String(user.userType || '').trim().toLowerCase()
          return role === 'practitioner' && userType === 'staff' && !user.archived
        })
        .map((user) => ({
          ...user,
          fullName:
            String(user.fullName || '').trim() ||
            `${String(user.firstName || '').trim()} ${String(user.lastName || '').trim()}`.trim() ||
            'Unnamed Practitioner'
        }))
        .sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || '')))
      practitioners.value = list
      await loadPractitionerSchedules(list)
    }

    const availablePractitioners = computed(() => {
      const hasDate = Boolean(String(form.value.date || '').trim())
      const hasTime = Boolean(String(form.value.time || '').trim())
      if (!hasDate) return practitioners.value

      const weekKey = getWeekStartKey(form.value.date)
      const dayName = getDayName(form.value.date)
      if (!weekKey || !dayName) return practitioners.value

      const appointmentMinutes = hasTime ? parseClockToMinutes(form.value.time) : null

      return practitioners.value.filter((practitioner) => {
        const assignments = practitionerSchedules.value?.[practitioner.id]?.[weekKey] || {}
        const shiftLabel = String(assignments?.[dayName] || '').trim()
        if (!shiftLabel) return false

        if (!hasTime || appointmentMinutes === null) {
          // Day-based availability only; time is optional refinement.
          return true
        }

        const shiftWindow = extractShiftWindowMinutes(shiftLabel)
        if (!shiftWindow) return true

        let { start, end } = shiftWindow
        let time = appointmentMinutes
        if (end < start) {
          end += 24 * 60
          if (time < start) time += 24 * 60
        }

        return time >= start && time <= end
      })
    })

    watch(
      availablePractitioners,
      (nextList) => {
        if (!form.value.practitionerId) return
        const stillValid = nextList.some((entry) => entry.id === form.value.practitionerId)
        if (!stillValid) form.value.practitionerId = ''
      },
      { immediate: true }
    )

    const submitAppointment = async () => {
      if (!currentBranchId.value || !currentUserId.value) {
        toast.error('Your account is not ready for appointment creation.')
        return
      }

      const selectedClient = clients.value.find((item) => item.id === form.value.clientId)
      if (!selectedClient) {
        toast.error('Please select a valid client.')
        return
      }
      const selectedPractitioner = availablePractitioners.value.find((item) => item.id === form.value.practitionerId)
      if (!selectedPractitioner) {
        toast.error('Please select a valid practitioner.')
        return
      }

      isSubmitting.value = true
      try {
        await addDoc(collection(db, 'appointments'), {
          clientId: selectedClient.id,
          clientName: selectedClient.fullName || `${selectedClient.firstName || ''} ${selectedClient.lastName || ''}`.trim(),
          practitionerId: selectedPractitioner.id,
          assignedPractitionerId: selectedPractitioner.id,
          practitionerName: selectedPractitioner.fullName,
          assignedPractitionerName: selectedPractitioner.fullName,
          service: form.value.service.trim(),
          date: form.value.date,
          time: form.value.time,
          notes: form.value.notes.trim(),
          status: 'Scheduled',
          branchId: currentBranchId.value,
          createdBy: currentUserId.value,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })

        await logActivity(db, {
          actorId: currentUserId.value,
          action: 'Added an appointment',
          details: `Scheduled ${selectedClient.fullName || 'client'} with ${selectedPractitioner.fullName || 'practitioner'} on ${form.value.date} ${form.value.time}`,
          module: 'Receptionist'
        })

        toast.success('Appointment created successfully.')
        router.push('/receptionist/appointments')
      } catch (error) {
        console.error(error)
        toast.error('Failed to create appointment.')
      } finally {
        isSubmitting.value = false
      }
    }

    onMounted(() => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) return

        currentUserId.value = user.uid
        const userSnap = await getDoc(doc(db, 'users', user.uid))
        currentBranchId.value = userSnap.exists() ? userSnap.data().branchId || '' : ''
        await loadClients()
        await loadPractitioners()
      })
    })

    return {
      form,
      clients,
      practitioners,
      availablePractitioners,
      isSubmitting,
      submitAppointment
    }
  }
}
</script>
