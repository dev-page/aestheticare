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
        <div class="mb-6">
          <h1 class="text-3xl font-bold text-white mb-2">Notifications</h1>
          <p class="text-slate-400">Latest updates and system activity.</p>
        </div>

        <p v-if="error" class="mb-4 text-sm text-rose-400">{{ error }}</p>

        <section class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-slate-700 text-sm text-slate-400 flex flex-wrap items-center justify-between gap-3">
            <span>Recent Notifications</span>
            <button
              type="button"
              class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              :disabled="!selectedIds.length"
              @click="deleteSelected"
            >
              <Icon icon="mdi:trash-can-outline" class="w-4 h-4" />
              Delete Selected
            </button>
          </div>
          <div v-if="loading" class="px-4 py-4">
            <PageSectionSkeleton variant="list" :rows="6" />
          </div>
          <div v-else-if="!notifications.length" class="px-4 py-6 text-slate-300 text-sm">
            No notifications yet.
          </div>
          <ul v-else class="divide-y divide-slate-700">
            <li class="px-4 py-3 flex items-center gap-3 text-xs text-slate-400">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-slate-500 bg-slate-900 text-amber-500"
                :checked="allSelected"
                @change="toggleSelectAll"
              />
              <span>Select all</span>
            </li>
            <li
              v-for="item in notifications"
              :key="item.id"
              class="px-4 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="flex items-start gap-3">
                <input
                  type="checkbox"
                  class="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-900 text-amber-500"
                  :checked="selectedIds.includes(item.id)"
                  @change="toggleSelected(item.id)"
                />
                <div>
                <p class="text-white font-medium">
                  {{ item.title || 'Notification' }}
                </p>
                <p class="text-slate-400 text-sm">{{ item.message || '-' }}</p>
                <p class="text-xs text-slate-500 mt-1">{{ item.createdLabel }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 mt-2 sm:mt-0">
                <span
                  v-if="!item.read"
                  class="px-2 py-1 rounded-full text-xs bg-amber-600/20 text-amber-300"
                >
                  New
                </span>
                <button
                  type="button"
                  class="inline-flex items-center justify-center rounded-lg border p-2 transition"
                  :class="item.read
                    ? 'border-slate-700 text-slate-500 bg-slate-800/60'
                    : 'border-amber-500/50 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20'"
                  :title="item.read ? 'Already read' : 'Mark as read'"
                  :disabled="item.read"
                  @click="markNotificationRead(item)"
                >
                  <Icon icon="mdi:check-circle-outline" class="w-4 h-4" />
                </button>
                <button
                  v-if="item.link"
                  type="button"
                  class="px-3 py-1.5 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-700"
                  @click="openNotification(item)"
                >
                  View
                </button>
              </div>
            </li>
          </ul>
        </section>
      </main>
    </div>
  </div>

  <Modal
    :isOpen="showNotificationModal"
    panelClass="bg-slate-800 text-white w-full max-w-xl"
    @close="closeNotificationModal"
  >
    <template #header>
      <h2 class="text-lg font-semibold">Notification</h2>
    </template>
    <template #body>
      <div v-if="selectedNotification" class="space-y-3 text-sm">
        <div>
          <p class="text-slate-400 text-xs uppercase tracking-wide">Title</p>
          <p class="text-white mt-1">{{ selectedNotification.title || 'Notification' }}</p>
        </div>
        <div>
          <p class="text-slate-400 text-xs uppercase tracking-wide">Description</p>
          <p class="text-white mt-1 whitespace-pre-line">{{ selectedNotification.message || '-' }}</p>
        </div>
        <div>
          <p class="text-slate-400 text-xs uppercase tracking-wide">Date & Time</p>
          <p class="text-white mt-1">{{ selectedNotification.createdLabel }}</p>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/config/firebaseConfig'
import { useSubscription } from '@/composables/useSubscription'
import EmployeeTopbar from '@/components/common/EmployeeTopbar.vue'
import PageSectionSkeleton from '@/components/common/PageSectionSkeleton.vue'
import { Icon } from '@iconify/vue'
import Modal from '@/components/common/Modal.vue'

import CustomerSidebar from '@/components/sidebar/CustomerSidebar.vue'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'
import EmployeeSidebar from '@/components/sidebar/EmployeeSidebar.vue'
import ReceptionistSidebar from '@/components/sidebar/ReceptionistSidebar.vue'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'
import FinanceSidebar from '@/components/sidebar/FinanceSidebar.vue'
import ManagerSidebar from '@/components/sidebar/ManagerSidebar.vue'
import PractitionerSidebar from '@/components/sidebar/PractitionerSidebar.vue'

export default {
  name: 'NotificationsPage',
  components: {
    EmployeeTopbar,
    PageSectionSkeleton,
    Icon,
    Modal,
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
    const router = useRouter()
    const { activePlan, isExpired, initSubscription } = useSubscription()

    const role = ref('')
    const userType = ref('')
    const sidebarCollapsed = ref(false)
    const sidebarHandler = ref(null)
    const notifications = ref([])
    const welcomeNotification = ref(null)
    const showNotificationModal = ref(false)
    const selectedNotification = ref(null)
    const loading = ref(true)
    const error = ref('')
    const currentUserId = ref('')
    let unsubscribeAuth = null
    let unsubscribeUser = null
      let unsubscribeRole = null

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
    const badgeStatusLabel = computed(() => (isExpired.value ? 'Expired' : ''))

    const formatDate = (value) => {
      if (!value) return '-'
      const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
      if (Number.isNaN(date.getTime())) return '-'
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }).format(date)
    }

    const mergeNotifications = (userDocs = [], roleDocs = []) => {
      const combined = [...userDocs, ...roleDocs]
      if (welcomeNotification.value) {
        combined.push(welcomeNotification.value)
      }
      const map = new Map()
      combined.forEach((item) => {
        map.set(item.id, item)
      })
      notifications.value = Array.from(map.values())
        .filter((item) => !item.deleted)
        .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
    }

    const startNotificationsListener = (userId, roleValue) => {
      loading.value = true
      error.value = ''
      const baseQuery = (filters) =>
        query(collection(db, 'notifications'), ...filters)

      unsubscribeUser = onSnapshot(
        baseQuery([where('recipientUserId', '==', userId)]),
        (snapshot) => {
          userDocsCache.value = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() || {}
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0)
            return {
              id: docSnap.id,
              ...data,
              createdLabel: formatDate(createdAt),
              createdAtMs: createdAt?.getTime?.() || 0
            }
          })
          mergeNotifications(userDocsCache.value, roleDocsCache.value)
          loading.value = false
        },
        (err) => {
          console.error('Failed to load notifications:', err)
          error.value = 'Unable to load notifications.'
          loading.value = false
        }
      )

      if (roleValue) {
        unsubscribeRole = onSnapshot(
        baseQuery([where('recipientRole', '==', roleValue)]),
        (snapshot) => {
          roleDocsCache.value = snapshot.docs.map((docSnap) => {
            const data = docSnap.data() || {}
            const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt || 0)
              return {
                id: docSnap.id,
                ...data,
                createdLabel: formatDate(createdAt),
                createdAtMs: createdAt?.getTime?.() || 0
              }
            })
          mergeNotifications(userDocsCache.value, roleDocsCache.value)
        },
          (err) => {
            console.error('Failed to load role notifications:', err)
            error.value = 'Unable to load notifications.'
          }
        )
      }
    }

    const userDocsCache = ref([])
    const roleDocsCache = ref([])

    const syncSidebarCollapsed = () => {
      if (!panelKey.value) return
      sidebarCollapsed.value = localStorage.getItem(`sidebar:${panelKey.value}:collapsed`) === '1'
    }

    const markNotificationRead = async (item) => {
      if (!item) return
      if (item.isWelcome) {
        try {
          await updateDoc(doc(db, 'users', currentUserId.value), {
            welcomeNotificationRead: true
          })
          if (welcomeNotification.value) {
            welcomeNotification.value = {
              ...welcomeNotification.value,
              read: true
            }
            mergeNotifications(userDocsCache.value, roleDocsCache.value)
          }
        } catch (_error) {
          // ignore
        }
      }
      if (!item.isWelcome && !item.read) {
        try {
          await updateDoc(doc(db, 'notifications', item.id), { read: true })
        } catch (_error) {
          // ignore
        }
      }
    }

    const openNotification = async (item) => {
      await markNotificationRead(item)
      selectedNotification.value = item
      showNotificationModal.value = true
    }

    const closeNotificationModal = () => {
      showNotificationModal.value = false
      selectedNotification.value = null
    }


    const selectedIds = ref([])
    const allSelected = computed(() => notifications.value.length > 0 && selectedIds.value.length === notifications.value.length)

    const toggleSelected = (id) => {
      if (!id) return
      if (selectedIds.value.includes(id)) {
        selectedIds.value = selectedIds.value.filter((value) => value !== id)
      } else {
        selectedIds.value = [...selectedIds.value, id]
      }
    }

    const toggleSelectAll = () => {
      if (allSelected.value) {
        selectedIds.value = []
      } else {
        selectedIds.value = notifications.value.map((item) => item.id)
      }
    }

    const deleteSelected = async () => {
      const ids = selectedIds.value.slice()
      if (!ids.length) return
      const includesWelcome = ids.some((id) => String(id).startsWith('welcome-'))
      const deletableIds = notifications.value
        .filter((item) => ids.includes(item.id) && item.recipientUserId === currentUserId.value)
        .map((item) => item.id)
      if (!deletableIds.length && !includesWelcome) return
      await Promise.all(
        deletableIds.map((id) =>
          updateDoc(doc(db, 'notifications', id), {
            deleted: true,
            updatedAt: new Date()
          }).catch(() => {})
        )
      )
      if (includesWelcome && currentUserId.value) {
        await updateDoc(doc(db, 'users', currentUserId.value), {
          welcomeNotificationDeleted: true
        }).catch(() => {})
        welcomeNotification.value = null
        mergeNotifications(userDocsCache.value, roleDocsCache.value)
      }
      selectedIds.value = []
    }

    onMounted(() => {
      initSubscription()
      syncSidebarCollapsed()
      sidebarHandler.value = (event) => {
        const detail = event?.detail || {}
        if (detail.panelKey && detail.panelKey === panelKey.value) {
          sidebarCollapsed.value = Boolean(detail.collapsed)
        }
      }
      window.addEventListener('sidebar-collapsed-change', sidebarHandler.value)

      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        if (!user) return
        currentUserId.value = user.uid
        const userSnap = await getDoc(doc(db, 'users', user.uid))
        if (!userSnap.exists()) return
        const data = userSnap.data() || {}
        role.value = data.role || ''
        userType.value = data.userType || ''
        if (data.welcomeNotificationSent && !data.welcomeNotificationDeleted) {
          const createdAt = data.welcomeNotificationAt?.toDate
            ? data.welcomeNotificationAt.toDate()
            : new Date()
          welcomeNotification.value = {
            id: `welcome-${user.uid}`,
            isWelcome: true,
            title: 'Welcome to AesthetiCare',
            message: 'Thanks for trusting us with your care. We are glad to have you here.',
            createdLabel: formatDate(createdAt),
            createdAtMs: createdAt?.getTime?.() || 0,
            read: Boolean(data.welcomeNotificationRead),
            deleted: false,
            link: '/notifications'
          }
        } else {
          welcomeNotification.value = null
        }
        mergeNotifications(userDocsCache.value, roleDocsCache.value)
        const rawRole = String(data.role || '').trim().toLowerCase()
        let roleKey = ''
        if (rawRole.includes('superadmin')) roleKey = 'Superadmin'
        else if (rawRole.includes('clinic admin') || rawRole === 'clinicadmin' || rawRole === 'owner') roleKey = 'Owner'
        else roleKey = String(data.role || '').trim()
        startNotificationsListener(user.uid, roleKey)
      })
    })

    onUnmounted(() => {
      if (unsubscribeAuth) unsubscribeAuth()
      if (unsubscribeUser) unsubscribeUser()
      if (unsubscribeRole) unsubscribeRole()
      if (sidebarHandler.value) {
        window.removeEventListener('sidebar-collapsed-change', sidebarHandler.value)
      }
    })

    return {
      notifications,
      loading,
      error,
      panelKey,
      sidebarCollapsed,
      sidebarComponent,
      planLabel,
      isExpired,
      badgeLabel,
      badgeTone,
      badgeVariant,
      badgeStatusLabel,
      showBadgeStatus,
      markNotificationRead,
      openNotification,
      showNotificationModal,
      selectedNotification,
      closeNotificationModal,
      selectedIds,
      allSelected,
      toggleSelected,
      toggleSelectAll,
      deleteSelected
    }
  }
}
</script>
