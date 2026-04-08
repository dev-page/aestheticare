<template>
  <div class="owner-theme bg-slate-900 min-h-screen flex flex-col">
    <EmployeeTopbar
      title=""
      :plan-label="planLabel"
      :is-expired="isExpired"
      :sidebar-collapsed="sidebarCollapsed"
      :panel-key="panelKey"
      :badge-label="badgeLabel"
      :badge-tone="badgeTone"
      :badge-variant="badgeVariant"
      :badge-status-label="badgeStatusLabel"
      :show-badge-status="showBadgeStatus"
      :use-sidebar-offset="true"
    />

    <div class="flex flex-1 min-w-0">
      <component :is="sidebarComponent" v-if="sidebarComponent" />
      <main class="flex-1 p-8">
      <div class="mb-6 md:mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-white mb-2">Report an Issue</h1>
        <p class="text-slate-400 text-sm md:text-base">
          Help us improve by sharing any bugs, errors, or concerns you encounter.
        </p>
      </div>

      <section class="bg-slate-800 border border-slate-700 rounded-xl p-6 md:p-8 max-w-4xl mx-auto">
        <form class="space-y-5" @submit.prevent="submitReport">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs uppercase tracking-wide text-slate-400 mb-2">Reported By</label>
              <div class="px-4 py-3 rounded-lg bg-slate-900/70 border border-slate-700 text-slate-200 text-sm">
                {{ reporterName || 'User' }}
              </div>
            </div>
            <div>
              <label class="block text-xs uppercase tracking-wide text-slate-400 mb-2">Contact Email</label>
              <div class="px-4 py-3 rounded-lg bg-slate-900/70 border border-slate-700 text-slate-200 text-sm">
                {{ reporterEmail || 'No email available' }}
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs uppercase tracking-wide text-slate-400 mb-2">Subject</label>
            <input
              v-model.trim="subject"
              type="text"
              class="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              placeholder="Short summary of the issue"
              required
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs uppercase tracking-wide text-slate-400 mb-2">Category</label>
              <select
                v-model="category"
                class="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
                required
              >
                <option disabled value="">Select category</option>
                <option>Bug/Error</option>
                <option>Data Issue</option>
                <option>Performance</option>
                <option>Billing/Payments</option>
                <option>Feature Request</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label class="block text-xs uppercase tracking-wide text-slate-400 mb-2">Severity</label>
              <select
                v-model="severity"
                class="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white focus:border-amber-500 focus:outline-none"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label class="block text-xs uppercase tracking-wide text-slate-400 mb-2">Where did it happen?</label>
            <input
              v-model.trim="location"
              type="text"
              class="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              placeholder="Example: Owner Dashboard > Attendance"
            />
          </div>

          <div>
            <label class="block text-xs uppercase tracking-wide text-slate-400 mb-2">Description</label>
            <textarea
              v-model.trim="description"
              rows="5"
              class="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              placeholder="Describe what happened, and what you expected."
              required
            ></textarea>
          </div>

          <div>
            <label class="block text-xs uppercase tracking-wide text-slate-400 mb-2">Steps to Reproduce (optional)</label>
            <textarea
              v-model.trim="steps"
              rows="3"
              class="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
              placeholder="Step 1... Step 2... Step 3..."
            ></textarea>
          </div>

          <div>
            <label class="block text-xs uppercase tracking-wide text-slate-400 mb-2">Upload Proof (optional)</label>
            <div class="flex flex-col gap-3 rounded-lg border border-dashed border-slate-600 bg-slate-900/40 p-4">
              <input
                type="file"
                accept="image/*"
                @change="handleFileChange"
                class="text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-amber-600/90 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-amber-500"
              />
              <p class="text-xs text-slate-500">PNG, JPG up to 5MB.</p>
              <div v-if="proofPreview" class="flex items-center gap-4">
                <img :src="proofPreview" alt="Proof preview" class="h-24 w-32 rounded-lg object-cover border border-slate-700" />
                <div class="text-sm text-slate-300">
                  <p class="font-semibold">{{ proofFile?.name }}</p>
                  <button type="button" class="text-amber-400 hover:text-amber-300 text-xs" @click="clearProof">
                    Remove file
                  </button>
                </div>
              </div>
              <p v-if="fileError" class="text-xs text-rose-400">{{ fileError }}</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="submit"
              :disabled="submitting"
              class="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {{ submitting ? 'Submitting...' : 'Submit Report' }}
            </button>
            <span class="text-xs text-slate-400">Reports are visible to the system administrator only.</span>
          </div>
        </form>
      </section>
      </main>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { getFirestore, addDoc, collection, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { onAuthStateChanged } from 'firebase/auth'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { auth, storage } from '@/config/firebaseConfig'
import { toast } from 'vue3-toastify'
import { useSubscription } from '@/composables/useSubscription'
import EmployeeTopbar from '@/components/common/EmployeeTopbar.vue'

import CustomerSidebar from '@/components/sidebar/CustomerSidebar.vue'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'
import EmployeeSidebar from '@/components/sidebar/EmployeeSidebar.vue'
import ReceptionistSidebar from '@/components/sidebar/ReceptionistSidebar.vue'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'
import FinanceSidebar from '@/components/sidebar/FinanceSidebar.vue'
import ManagerSidebar from '@/components/sidebar/ManagerSidebar.vue'
import PractitionerSidebar from '@/components/sidebar/PractitionerSidebar.vue'

export default {
  name: 'SupportReport',
  components: {
    EmployeeTopbar,
    CustomerSidebar,
    OwnerSidebar,
    EmployeeSidebar,
    ReceptionistSidebar,
    HRSidebar,
    FinanceSidebar,
    ManagerSidebar,
    PractitionerSidebar
  },
  setup() {
    const db = getFirestore(getApp())
    const router = useRouter()
    const { activePlan, isExpired, initSubscription } = useSubscription()

    const role = ref('')
    const userType = ref('')
    const branchId = ref('')
    const reporterName = ref('')
    const reporterEmail = ref('')
    const sidebarCollapsed = ref(false)

    const subject = ref('')
    const category = ref('')
    const severity = ref('Medium')
    const location = ref('')
    const description = ref('')
    const steps = ref('')
    const proofFile = ref(null)
    const proofPreview = ref('')
    const fileError = ref('')
    const submitting = ref(false)
    const panelKey = computed(() => {
      const roleValue = String(role.value || '').toLowerCase()
      const typeValue = String(userType.value || '').toLowerCase()

      if (typeValue === 'customer' || roleValue === 'customer') return 'customer'
      if (typeValue === 'staff') return 'employee'
      if (roleValue === 'clinic admin' || roleValue === 'clinicadmin' || roleValue === 'owner') return 'owner'
      if (roleValue === 'receptionist') return 'receptionist'
      if (roleValue === 'hr') return 'hr'
      if (roleValue === 'finance') return 'finance'
      if (roleValue === 'manager') return 'manager'
      if (roleValue === 'practitioner') return 'practitioner'
      return ''
    })

    const planLabel = computed(() => {
      const raw = String(activePlan.value || '').trim().toLowerCase()
      if (!raw) return 'Plan'
      if (raw.includes('free')) return 'Free Trial'
      if (raw.includes('basic')) return 'Basic'
      if (raw.includes('premium')) return 'Premium'
      return activePlan.value
    })

    const badgeLabel = computed(() => {
      if (panelKey.value === 'customer') {
        try {
          return new Intl.DateTimeFormat('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          }).format(new Date())
        } catch (_error) {
          return ''
        }
      }
      return ''
    })

    const badgeTone = computed(() => (panelKey.value === 'customer' ? 'neutral' : ''))
    const badgeVariant = computed(() => (panelKey.value === 'customer' ? 'date' : 'plan'))
    const showBadgeStatus = computed(() => panelKey.value !== 'customer')
    const badgeStatusLabel = computed(() => (isExpired.value ? 'Expired' : 'Active'))

    const sidebarComponent = computed(() => {
      const roleValue = String(role.value || '').toLowerCase()
      const typeValue = String(userType.value || '').toLowerCase()

      if (!roleValue && !typeValue) return null
      if (roleValue.includes('superadmin')) return null
      if (typeValue === 'customer' || roleValue === 'customer') return CustomerSidebar
      if (typeValue === 'staff') return EmployeeSidebar
      if (roleValue === 'clinic admin' || roleValue === 'clinicadmin' || roleValue === 'owner') return OwnerSidebar
      if (roleValue === 'receptionist') return ReceptionistSidebar
      if (roleValue === 'hr') return HRSidebar
      if (roleValue === 'finance') return FinanceSidebar
      if (roleValue === 'manager') return ManagerSidebar
      if (roleValue === 'practitioner') return PractitionerSidebar

      return CustomerSidebar
    })

    const clearProofPreview = () => {
      if (proofPreview.value) URL.revokeObjectURL(proofPreview.value)
      proofPreview.value = ''
    }

    const clearProof = () => {
      proofFile.value = null
      fileError.value = ''
      clearProofPreview()
    }

    const handleFileChange = (event) => {
      const file = event.target.files?.[0]
      fileError.value = ''

      if (!file) {
        clearProof()
        return
      }

      if (!file.type.startsWith('image/')) {
        fileError.value = 'Please upload a valid image file.'
        clearProof()
        return
      }

      if (file.size > 5 * 1024 * 1024) {
        fileError.value = 'Image size must be below 5MB.'
        clearProof()
        return
      }

      clearProofPreview()
      proofFile.value = file
      proofPreview.value = URL.createObjectURL(file)
    }

    const resetForm = () => {
      subject.value = ''
      category.value = ''
      severity.value = 'Medium'
      location.value = ''
      description.value = ''
      steps.value = ''
      clearProof()
    }

    const submitReport = async () => {
      if (!subject.value || !category.value || !description.value) {
        toast.error('Please complete the required fields before submitting.')
        return
      }

      const user = auth.currentUser
      if (!user) {
        toast.error('You must be logged in to submit a report.')
        return
      }

      submitting.value = true

      try {
        const ticketRef = doc(collection(db, 'supportTickets'))
        let proofPath = ''
        let proofUrl = ''

        if (proofFile.value) {
          proofPath = `support-tickets/${user.uid}/${ticketRef.id}/${proofFile.value.name}`
          const fileRef = storageRef(storage, proofPath)
          await uploadBytes(fileRef, proofFile.value)
          proofUrl = await getDownloadURL(fileRef)
        }

        await setDoc(ticketRef, {
          userId: user.uid,
          userEmail: reporterEmail.value || user.email || '',
          userName: reporterName.value || '',
          role: role.value || '',
          userType: userType.value || '',
          branchId: branchId.value || '',
          subject: subject.value,
          category: category.value,
          severity: severity.value,
          location: location.value,
          description: description.value,
          steps: steps.value,
          proofUrl,
          proofPath,
          status: 'Open',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        })

        await addDoc(collection(db, 'notifications'), {
          recipientRole: 'Superadmin',
          senderId: user.uid,
          type: 'support_issue',
          title: 'New Issue Report',
          message: `${subject.value || 'New report'}${reporterName.value ? ` • ${reporterName.value}` : ''}`,
          link: '/superadmin/tickets',
          read: false,
          createdAt: serverTimestamp()
        })

        await addDoc(collection(db, 'notifications'), {
          recipientUserId: user.uid,
          senderId: user.uid,
          type: 'support_issue',
          title: 'Report Submitted',
          message: `Subject: ${subject.value || 'Untitled'} — We received your report. Our team will review it and update you soon.`,
          link: '/notifications',
          read: false,
          createdAt: serverTimestamp()
        })

        toast.success('Your report has been submitted. Thank you!')
        resetForm()
      } catch (error) {
        console.error('Error submitting support report:', error)
        toast.error('Unable to submit your report right now.')
      } finally {
        submitting.value = false
      }
    }

    const syncSidebarCollapsed = () => {
      if (!panelKey.value) return
      sidebarCollapsed.value = localStorage.getItem(`sidebar:${panelKey.value}:collapsed`) === '1'
    }

    let sidebarHandler = null
    let unsubscribeAuth = null
    onMounted(() => {
      initSubscription()
      syncSidebarCollapsed()
      sidebarHandler = (event) => {
        const detail = event?.detail || {}
        if (detail.panelKey && detail.panelKey === panelKey.value) {
          sidebarCollapsed.value = Boolean(detail.collapsed)
        }
      }
      window.addEventListener('sidebar-collapsed-change', sidebarHandler)

      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (!user) return
        reporterEmail.value = user.email || ''

        const userSnap = await getDoc(doc(db, 'users', user.uid))
        if (!userSnap.exists()) return

        const data = userSnap.data()
        role.value = data.role || ''
        userType.value = data.userType || ''
        branchId.value = data.branchId || ''
        reporterName.value = `${data.firstName || ''} ${data.lastName || ''}`.trim()

        if (String(role.value || '').toLowerCase().includes('superadmin')) {
          router.replace('/superadmin/tickets')
        }
      })
    })

    watch(panelKey, () => {
      syncSidebarCollapsed()
    })

    onUnmounted(() => {
      if (unsubscribeAuth) unsubscribeAuth()
      if (sidebarHandler) {
        window.removeEventListener('sidebar-collapsed-change', sidebarHandler)
      }
      clearProofPreview()
    })

    return {
      reporterName,
      reporterEmail,
      subject,
      category,
      severity,
      location,
      description,
      steps,
      proofFile,
      proofPreview,
      fileError,
      submitting,
      sidebarComponent,
      panelKey,
      sidebarCollapsed,
      planLabel,
      isExpired,
      badgeLabel,
      badgeTone,
      badgeVariant,
      badgeStatusLabel,
      showBadgeStatus,
      handleFileChange,
      clearProof,
      submitReport
    }
  }
}
</script>
