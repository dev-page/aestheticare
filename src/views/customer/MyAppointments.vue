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
              <td class="p-3">{{ appt.service }}</td>
              <td class="p-3">{{ appt.clinic }}</td>
              <td class="p-3">{{ appt.date }}</td>
              <td class="p-3">{{ appt.time }}</td>
              <td class="p-3">{{ appt.status }}</td>
              <td class="p-3 flex gap-2">
                <button @click="reschedule(appt)" class="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded">Reschedule</button>
                <button @click="cancel(appt)" class="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded">Cancel</button>
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
              <td class="p-3">{{ appt.service }}</td>
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
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { auth, db } from '@/config/firebaseConfig'
import { collection, doc, getDocs, query, updateDoc, where } from 'firebase/firestore'
import CustomerSidebar from '@/components/sidebar/CustomerSidebar.vue'
import { toast } from 'vue3-toastify'

const loading = ref(true)
const upcomingAppointments = ref([])
const pastAppointments = ref([])

const toDateTime = (date, time) => new Date(`${date}T${time || '00:00'}`)

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
      clinicMap.set(snap.id, data.clinicName || data.clinicBranch || 'Clinic')
    })

    const now = new Date()
    const all = appointmentsSnap.docs.map((snap) => {
      const data = snap.data()
      return {
        id: snap.id,
        ...data,
        clinic: clinicMap.get(data.branchId) || 'Clinic',
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

const cancel = async (appt) => {
  try {
    await updateDoc(doc(db, 'appointments', appt.id), { status: 'Cancelled' })
    toast.success('Appointment cancelled.')
    await loadAppointments()
  } catch (error) {
    console.error(error)
    toast.error('Failed to cancel appointment.')
  }
}

const reschedule = async (appt) => {
  const date = prompt('Enter new date (YYYY-MM-DD):', appt.date || '')
  if (!date) return
  const time = prompt('Enter new time (HH:mm):', appt.time || '')
  if (!time) return

  try {
    await updateDoc(doc(db, 'appointments', appt.id), {
      date,
      time,
      status: 'Scheduled',
    })
    toast.success('Appointment rescheduled.')
    await loadAppointments()
  } catch (error) {
    console.error(error)
    toast.error('Failed to reschedule appointment.')
  }
}

onMounted(loadAppointments)
</script>
