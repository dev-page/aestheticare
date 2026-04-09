<template>
  <div class="flex module-theme bg-slate-900 min-h-screen">
    <SuperAdminSidebar />

    <main class="flex-1 p-8">
      <div class="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-white mb-2">Center Appeals</h1>
          <p class="text-slate-400">Review suspension appeals submitted by clinic owners.</p>
        </div>

        <div class="flex gap-3">
          <input
            v-model="search"
            type="text"
            placeholder="Search center, owner, status..."
            class="w-72 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-slate-500"
          />
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800"
            :disabled="loading"
            @click="loadAppeals"
          >
            {{ loading ? 'Refreshing...' : 'Refresh' }}
          </button>
        </div>
      </div>

      <p v-if="error" class="mb-4 text-sm text-rose-400">{{ error }}</p>

      <section class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div class="px-4 py-3 border-b border-slate-700 text-sm text-slate-400">
          Total Appeals: <span class="text-slate-200 font-semibold">{{ filteredAppeals.length }}</span>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead class="border-b border-slate-700 bg-slate-800">
              <tr>
                <th class="text-left text-slate-300 px-4 py-3">Center</th>
                <th class="text-left text-slate-300 px-4 py-3">Owner</th>
                <th class="text-left text-slate-300 px-4 py-3">Status</th>
                <th class="text-left text-slate-300 px-4 py-3">Submitted</th>
                <th class="text-left text-slate-300 px-4 py-3">Decision</th>
                <th class="text-right text-slate-300 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td class="px-4 py-3 text-slate-300" colspan="6">Loading appeals...</td>
              </tr>

              <tr v-else-if="!filteredAppeals.length">
                <td class="px-4 py-3 text-slate-300" colspan="6">No center appeals found.</td>
              </tr>

              <tr v-for="appeal in filteredAppeals" :key="appeal.id" class="border-b border-slate-700/60 last:border-b-0">
                <td class="px-4 py-3 text-slate-200">
                  <div class="font-semibold">{{ appeal.centerName || 'Unnamed Center' }}</div>
                  <div class="text-xs text-slate-500">{{ appeal.centerId }}</div>
                </td>
                <td class="px-4 py-3 text-slate-300">
                  <div>{{ appeal.ownerName || '-' }}</div>
                  <div class="text-xs text-slate-500">{{ appeal.ownerEmail || '-' }}</div>
                </td>
                <td class="px-4 py-3">
                  <span class="px-2 py-1 rounded-md text-xs font-medium" :class="statusClass(appeal.status)">
                    {{ appeal.statusLabel }}
                  </span>
                </td>
                <td class="px-4 py-3 text-slate-300">{{ formatDateTime(appeal.submittedAt) }}</td>
                <td class="px-4 py-3 text-slate-300">
                  <p class="line-clamp-2">{{ appeal.decisionReason || appeal.reason || 'No decision note yet.' }}</p>
                </td>
                <td class="px-4 py-3 text-right">
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700"
                    @click="openAppeal(appeal)"
                  >
                    Review
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </div>

  <Modal
    :isOpen="showModal"
    panelClass="bg-slate-800 text-white w-full max-w-3xl"
    @close="closeAppeal"
  >
    <template #header>
      <h2 class="text-xl font-semibold">Review Center Appeal</h2>
    </template>

    <template #body>
      <div v-if="selectedAppeal" class="space-y-4 text-sm">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p class="text-slate-400 text-xs uppercase tracking-wide">Center</p>
            <p class="text-white mt-1">{{ selectedAppeal.centerName || 'Unnamed Center' }}</p>
          </div>
          <div>
            <p class="text-slate-400 text-xs uppercase tracking-wide">Owner</p>
            <p class="text-white mt-1">{{ selectedAppeal.ownerName || selectedAppeal.ownerEmail || '-' }}</p>
          </div>
          <div>
            <p class="text-slate-400 text-xs uppercase tracking-wide">Current Status</p>
            <p class="text-white mt-1">{{ selectedAppeal.currentStatus || '-' }}</p>
          </div>
          <div>
            <p class="text-slate-400 text-xs uppercase tracking-wide">Current Moderation</p>
            <p class="text-white mt-1">{{ selectedAppeal.currentModerationStatus || '-' }}</p>
          </div>
        </div>

        <div class="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <p class="text-slate-400 text-xs uppercase tracking-wide">Suspension Reason</p>
          <p class="mt-2 text-slate-200 whitespace-pre-line">{{ selectedAppeal.currentSuspensionReason || 'No suspension reason recorded.' }}</p>
        </div>

        <div class="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
          <p class="text-slate-400 text-xs uppercase tracking-wide">Appeal Reason</p>
          <p class="mt-2 text-slate-200 whitespace-pre-line">{{ selectedAppeal.reason || 'No appeal reason submitted.' }}</p>
        </div>

        <div class="space-y-2">
          <label class="block text-slate-400 text-xs uppercase tracking-wide">Decision Note</label>
          <textarea
            v-model.trim="decisionNote"
            rows="5"
            maxlength="1000"
            class="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
            placeholder="Write the decision reason for this appeal..."
          ></textarea>
          <p class="text-xs text-slate-500">{{ decisionNote.length }}/1000 characters</p>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-2 pt-2">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700"
            @click="closeAppeal"
          >
            Close
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-60"
            :disabled="saving"
            @click="approveAppeal"
          >
            {{ saving ? 'Saving...' : 'Approve Appeal' }}
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-rose-500/40 text-rose-300 hover:bg-rose-500/10 disabled:opacity-60"
            :disabled="saving"
            @click="rejectAppeal"
          >
            Reject Appeal
          </button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script>
import { computed, onMounted, ref } from 'vue'
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, deleteField } from 'firebase/firestore'
import { auth, db } from '@/config/firebaseConfig'
import SuperAdminSidebar from '@/components/sidebar/SuperAdminSidebar.vue'
import Modal from '@/components/common/Modal.vue'

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default {
  name: 'CenterAppeals',
  components: { SuperAdminSidebar, Modal },
  setup() {
    const loading = ref(false)
    const error = ref('')
    const search = ref('')
    const appeals = ref([])
    const showModal = ref(false)
    const selectedAppeal = ref(null)
    const decisionNote = ref('')
    const saving = ref(false)

    const statusClass = (status) => {
      const normalized = String(status || '').toLowerCase()
      if (normalized === 'approved') return 'bg-emerald-500/20 text-emerald-300'
      if (normalized === 'rejected') return 'bg-rose-500/20 text-rose-300'
      if (normalized === 'pending review') return 'bg-amber-500/20 text-amber-300'
      return 'bg-slate-500/20 text-slate-300'
    }

    const normalizeStatusLabel = (status) => String(status || '').trim() || 'Pending Review'

    const refreshAppealDoc = (appealId, updates) => {
      appeals.value = appeals.value.map((appeal) =>
        appeal.id === appealId
          ? {
              ...appeal,
              ...updates,
              statusLabel: normalizeStatusLabel(updates.status || appeal.status),
            }
          : appeal
      )
    }

    const loadAppeals = async () => {
      loading.value = true
      error.value = ''
      try {
        const snap = await getDocs(query(collection(db, 'centerAppeals'), orderBy('submittedAt', 'desc')))
        const rows = await Promise.all(
          snap.docs.map(async (docSnap) => {
            const data = docSnap.data() || {}
            let centerName = String(data.centerName || '').trim()
            let ownerName = String(data.ownerName || '').trim()
            let ownerEmail = String(data.ownerEmail || '').trim()
            let currentStatus = String(data.currentStatus || '').trim()
            let currentModerationStatus = String(data.currentModerationStatus || '').trim()
            let currentSuspensionReason = String(data.currentSuspensionReason || '').trim()

            if (data.centerId) {
              const clinicSnap = await getDoc(doc(db, 'clinics', data.centerId))
              if (clinicSnap.exists()) {
                const clinicData = clinicSnap.data() || {}
                centerName = centerName || clinicData.clinicName || clinicData.clinicBranch || 'Center'
                currentStatus = currentStatus || clinicData.status || ''
                currentModerationStatus = currentModerationStatus || clinicData.moderationStatus || ''
                currentSuspensionReason = currentSuspensionReason || clinicData.suspensionReason || ''
                if (!ownerEmail && clinicData.ownerId) {
                  const ownerSnap = await getDoc(doc(db, 'users', clinicData.ownerId))
                  if (ownerSnap.exists()) {
                    const ownerData = ownerSnap.data() || {}
                    ownerName =
                      ownerName ||
                      String(ownerData.fullName || '').trim() ||
                      `${String(ownerData.firstName || '').trim()} ${String(ownerData.lastName || '').trim()}`.trim()
                    ownerEmail = ownerEmail || ownerData.email || ''
                  }
                }
              }
            }

            return {
              id: docSnap.id,
              ...data,
              centerName: centerName || 'Center',
              ownerName,
              ownerEmail,
              currentStatus,
              currentModerationStatus,
              currentSuspensionReason,
              statusLabel: normalizeStatusLabel(data.status),
              submittedLabel: formatDateTime(data.submittedAt),
            }
          })
        )

        appeals.value = rows.filter(Boolean)
      } catch (err) {
        console.error('Failed to load appeals:', err)
        error.value = 'Failed to load center appeals.'
      } finally {
        loading.value = false
      }
    }

    const filteredAppeals = computed(() => {
      const keyword = String(search.value || '').trim().toLowerCase()
      if (!keyword) return appeals.value
      return appeals.value.filter((appeal) => {
        const haystack = [
          appeal.centerName,
          appeal.ownerName,
          appeal.ownerEmail,
          appeal.status,
          appeal.reason,
          appeal.currentSuspensionReason,
        ]
          .join(' ')
          .toLowerCase()
        return haystack.includes(keyword)
      })
    })

    const openAppeal = (appeal) => {
      selectedAppeal.value = appeal
      decisionNote.value = String(appeal.decisionReason || '').trim()
      showModal.value = true
    }

    const closeAppeal = () => {
      showModal.value = false
      selectedAppeal.value = null
      decisionNote.value = ''
    }

    const notifyOwner = async (appeal, title, message) => {
      if (!appeal?.ownerId) return
      await addDoc(collection(db, 'notifications'), {
        recipientUserId: appeal.ownerId,
        senderId: auth.currentUser?.uid || 'superadmin',
        type: 'center_appeal',
        title,
        message,
        link: '/notifications',
        read: false,
        createdAt: serverTimestamp(),
      })
    }

    const approveAppeal = async () => {
      if (!selectedAppeal.value || saving.value) return
      saving.value = true
      try {
        const appeal = selectedAppeal.value
        const appealDecision = String(decisionNote.value || '').trim()
        const clinicRef = doc(db, 'clinics', appeal.centerId)
        const appealRef = doc(db, 'centerAppeals', appeal.id)
        const restorePayload = {
          status: 'Active',
          moderationStatus: 'Resolved',
          isPublished: true,
          updatedAt: serverTimestamp(),
          suspendedAt: deleteField(),
          suspensionEndsAt: deleteField(),
          suspensionReason: deleteField(),
          suspensionSource: deleteField(),
          appealStatus: 'Approved',
          appealReviewedAt: serverTimestamp(),
          appealReviewedBy: auth.currentUser?.uid || 'superadmin',
          appealDecisionReason: appealDecision,
        }

        await updateDoc(clinicRef, restorePayload)
        await updateDoc(appealRef, {
          status: 'Approved',
          reviewedAt: serverTimestamp(),
          reviewedBy: auth.currentUser?.uid || 'superadmin',
          decisionReason: appealDecision,
          updatedAt: serverTimestamp(),
        })
        await notifyOwner(
          appeal,
          'Suspension Appeal Approved',
          `${appeal.centerName || 'Your center'} has been restored after appeal review.`
        )

        refreshAppealDoc(appeal.id, {
          status: 'Approved',
          decisionReason: appealDecision,
          reviewedAt: new Date(),
          reviewedBy: auth.currentUser?.uid || 'superadmin',
        })
        closeAppeal()
      } catch (err) {
        console.error('Failed to approve appeal:', err)
        error.value = err?.message || 'Failed to approve appeal.'
      } finally {
        saving.value = false
      }
    }

    const rejectAppeal = async () => {
      if (!selectedAppeal.value || saving.value) return
      saving.value = true
      try {
        const appeal = selectedAppeal.value
        const appealDecision = String(decisionNote.value || '').trim()
        await updateDoc(doc(db, 'centerAppeals', appeal.id), {
          status: 'Rejected',
          reviewedAt: serverTimestamp(),
          reviewedBy: auth.currentUser?.uid || 'superadmin',
          decisionReason: appealDecision,
          updatedAt: serverTimestamp(),
        })
        await updateDoc(doc(db, 'clinics', appeal.centerId), {
          appealStatus: 'Rejected',
          appealReviewedAt: serverTimestamp(),
          appealReviewedBy: auth.currentUser?.uid || 'superadmin',
          appealDecisionReason: appealDecision,
          updatedAt: serverTimestamp(),
        })
        await notifyOwner(
          appeal,
          'Suspension Appeal Rejected',
          `${appeal.centerName || 'Your center'} appeal was reviewed and not approved.`
        )

        refreshAppealDoc(appeal.id, {
          status: 'Rejected',
          decisionReason: appealDecision,
          reviewedAt: new Date(),
          reviewedBy: auth.currentUser?.uid || 'superadmin',
        })
        closeAppeal()
      } catch (err) {
        console.error('Failed to reject appeal:', err)
        error.value = err?.message || 'Failed to reject appeal.'
      } finally {
        saving.value = false
      }
    }

    onMounted(loadAppeals)

    return {
      loading,
      error,
      search,
      appeals,
      filteredAppeals,
      showModal,
      selectedAppeal,
      decisionNote,
      saving,
      statusClass,
      formatDateTime,
      openAppeal,
      closeAppeal,
      approveAppeal,
      rejectAppeal,
      loadAppeals,
    }
  }
}
</script>
