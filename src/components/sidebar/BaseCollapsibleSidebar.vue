<template>
  <div
    :style="{ width: collapsed ? '6rem' : '18rem' }"
    class="relative flex-shrink-0 transition-all duration-300"
  >
    <aside
      :style="{ width: collapsed ? '5rem' : '17rem' }"
      class="readonly-exempt fixed left-0 top-0 bottom-0 z-40 bg-[#1f120b] border border-[#3a2417] rounded-tr-2xl rounded-br-2xl shadow-2xl flex flex-col transition-all duration-300 overflow-hidden"
    >
      <div class="p-4 border-b border-[#3a2417]">
        <div class="flex items-center gap-3">
          <div v-if="!collapsed" class="min-w-0">
            <h2 class="text-white font-semibold text-lg truncate">{{ title }}</h2>
            <p class="text-[#c9b3a5] text-xs truncate">{{ subtitle }}</p>
          </div>
          <div class="ml-auto"></div>
        </div>
      </div>

      <nav class="sidebar-scroll flex-1 p-3 overflow-y-auto">
      <ul class="space-y-1">
        <li v-for="item in visibleItems" :key="item.key || item.to || item.label">
          <template v-if="isGroup(item)">
            <button
              @click="toggleGroup(item)"
              :class="[
                'group relative w-full flex items-center rounded-lg transition-colors',
                collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2.5',
                'text-[#e8d8cf] hover:text-white hover:bg-[#3a2417]'
              ]"
              :title="collapsed ? item.label : ''"
            >
                <span
                :class="[
                  'h-8 w-8 rounded-lg border flex items-center justify-center',
                  'bg-[#3a2417] border-[#5a3927] text-[#f3e7e0]'
                ]"
              >
                <Icon :icon="iconName(item.icon)" class="w-4 h-4" />
              </span>
              <span v-if="!collapsed" class="text-sm truncate">{{ item.label }}</span>
              <svg
                v-if="!collapsed"
                class="w-4 h-4 ml-auto transition-transform"
                :class="isGroupOpen(item) ? 'rotate-90' : ''"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
              </svg>
              <span
                v-if="collapsed"
                class="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-[#3a2417] border border-[#5a3927] text-[#f3e7e0] px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20"
              >
                {{ item.label }}
              </span>
            </button>

            <ul v-if="!collapsed && isGroupOpen(item)" class="mt-1 ml-4 space-y-1">
              <li v-for="child in item.children" :key="child.to">
                <router-link
                  :to="child.to"
                  :class="[
                    'group flex items-center gap-3 px-3 py-2 rounded-lg transition-colors',
                    isExactActive(child.to)
                      ? 'bg-[#6b3f27] text-white'
                      : 'text-[#e8d8cf] hover:text-white hover:bg-[#3a2417]'
                  ]"
                >
                  <span
                    :class="[
                      'h-7 w-7 rounded-lg border flex items-center justify-center',
                      isExactActive(child.to)
                        ? 'bg-[#8b5a3c] text-white border-[#8b5a3c]'
                        : 'bg-[#3a2417] border-[#5a3927] text-[#f3e7e0]'
                    ]"
                  >
                    <Icon :icon="iconName(child.icon)" class="w-3.5 h-3.5" />
                  </span>
                  <span class="text-sm truncate">{{ child.label }}</span>
                </router-link>
              </li>
            </ul>
          </template>

          <template v-else>
            <router-link
              :to="item.to"
              :class="[
                'group relative flex items-center rounded-lg transition-colors',
                collapsed ? 'justify-center px-2 py-2' : 'gap-3 px-3 py-2.5',
                isActive(item.to)
                  ? 'bg-[#6b3f27] text-white'
                  : 'text-[#e8d8cf] hover:text-white hover:bg-[#3a2417]'
              ]"
              :title="collapsed ? item.label : ''"
            >
              <span
                :class="[
                  'relative h-8 w-8 rounded-lg border flex items-center justify-center',
                  isActive(item.to)
                    ? 'bg-[#8b5a3c] text-white border-[#8b5a3c]'
                    : 'bg-[#3a2417] border-[#5a3927] text-[#f3e7e0]'
                ]"
              >
                <Icon :icon="iconName(item.icon)" class="w-4 h-4" />
                <span
                  v-if="item.badge && Number(item.badge) > 0"
                  class="absolute -top-1 -right-1 h-4 min-w-[1rem] px-1 rounded-full bg-red-500 text-[10px] leading-4 text-white font-semibold flex items-center justify-center"
                >
                  {{ item.badge }}
                </span>
              </span>
              <span v-if="!collapsed" class="text-sm truncate">{{ item.label }}</span>
              <span
                v-if="!collapsed && item.badge && Number(item.badge) > 0"
                class="ml-auto rounded-full bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5"
              >
                {{ item.badge }}
              </span>
              <span
                v-if="collapsed"
                class="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-[#3a2417] border border-[#5a3927] text-[#f3e7e0] px-2 py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity z-20"
              >
                {{ item.label }}
              </span>
            </router-link>
          </template>
        </li>
      </ul>
    </nav>

      <div class="p-3 border-t border-[#3a2417]">
        <div
          class="flex items-center rounded-lg border border-[#3a2417] bg-[#150d08]"
          :class="collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'"
        >
          <template v-if="isLoading">
            <div class="h-9 w-9 rounded-full bg-[#3a2417] border border-[#5a3927] animate-pulse"></div>
            <div v-if="!collapsed" class="min-w-0 flex-1 space-y-2">
              <div class="h-3 w-24 rounded bg-[#3a2417] animate-pulse"></div>
              <div class="h-3 w-32 rounded bg-[#3a2417] animate-pulse"></div>
            </div>
          </template>
          <template v-else>
            <div class="h-9 w-9 rounded-full bg-[#3a2417] border border-[#5a3927] text-white text-sm font-semibold flex items-center justify-center" :title="displayName">
              {{ userInitial }}
            </div>
            <div v-if="!collapsed" class="min-w-0">
              <p class="text-white text-sm font-medium truncate">{{ displayName }}</p>
              <p class="text-[#c9b3a5] text-xs truncate">{{ displayEmail }}</p>
            </div>
          </template>
        </div>

        <button
          @click="logout"
          :class="[
            'mt-2 w-full rounded-lg border border-[#5a3927] text-[#f0e2d8] hover:bg-[#3a2417] hover:text-white transition-colors',
            collapsed ? 'h-10 flex items-center justify-center' : 'px-3 py-2 flex items-center gap-2 justify-center'
          ]"
          :title="collapsed ? 'Logout' : ''"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          <span v-if="!collapsed">Logout</span>
        </button>
      </div>
    </aside>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth'
import { Icon } from '@iconify/vue'
import Swal from 'sweetalert2'
import { useAuth } from '@/composables/useAuth'
import { useSubscription } from '@/composables/useSubscription'
import { usePermissions } from '@/composables/usePermissions'

export default {
  name: 'BaseCollapsibleSidebar',
  components: { Icon },
  props: {
    title: { type: String, required: true },
    subtitle: { type: String, default: '' },
    items: {
      type: Array,
      default: () => []
    },
    panelKey: { type: String, required: true },
    defaultName: { type: String, default: 'User' },
    defaultEmail: { type: String, default: 'user@aestheticare.com' }
  },
  setup(props) {
    const router = useRouter()
    const route = useRoute()
    const db = getFirestore()
    const auth = getAuth()
    const { isLoading } = useAuth()
    const { hasFeature, initSubscription, activePlan, isLoading: subscriptionLoading } = useSubscription()
    const { hasPermission, effectivePermissions, loading: permissionsLoading } = usePermissions()

    const storageKey = `sidebar:${props.panelKey}:collapsed`
    const groupStorageKey = `sidebar:${props.panelKey}:groups`
    const collapsed = ref(localStorage.getItem(storageKey) === '1')
    const userStorageKey = `sidebar:${props.panelKey}:user`
    const displayName = ref(props.defaultName)
    const displayEmail = ref(props.defaultEmail)
    const openGroups = ref({})

    const userInitial = computed(() => {
      const source = String(displayName.value || '').trim()
      return source ? source.charAt(0).toUpperCase() : 'U'
    })

    const isGroup = (item) => Array.isArray(item?.children) && item.children.length > 0

    const getItemFeatures = (item) => {
      if (!item) return []
      if (Array.isArray(item.features)) return item.features
      if (item.feature) return [item.feature]
      return []
    }

    const getItemPermissions = (item) => {
      if (!item) return []
      if (Array.isArray(item.permissions)) return item.permissions
      if (item.permission) return [item.permission]
      if (item.to) {
        const routeMatch = router.getRoutes().find((route) => route.path === item.to)
        if (routeMatch?.meta?.requiresPermission) {
          return [routeMatch.meta.requiresPermission]
        }
      }
      return []
    }

    const isItemAllowed = (item) => {
      const required = getItemFeatures(item)
      const requiredPermissions = getItemPermissions(item)
      const featureAllowed = !required.length || required.every((feature) => hasFeature(feature))
      const permissionAllowed = !requiredPermissions.length || requiredPermissions.every((perm) => hasPermission(perm))
      return featureAllowed && permissionAllowed
    }

    const filterItems = (items = []) => {
      const filtered = []
      items.forEach((item) => {
        if (isGroup(item)) {
          if (!isItemAllowed(item)) return
          const children = filterItems(item.children || [])
          if (!children.length) return
          filtered.push({ ...item, children })
          return
        }
        if (isItemAllowed(item)) {
          filtered.push(item)
        }
      })
      return filtered
    }

    const visibleItems = computed(() => {
      activePlan.value
      subscriptionLoading.value
      effectivePermissions.value
      if (subscriptionLoading.value || permissionsLoading.value) {
        return props.items
      }
      return filterItems(props.items)
    })

    const isActive = (path) => route.path === path || route.path.startsWith(`${path}/`)
    const isExactActive = (path) => route.path === path

    const isGroupActive = (group) => {
      if (!isGroup(group)) return false
      return group.children.some((child) => isActive(child.to))
    }

    const groupKey = (group) => String(group.key || group.label || '')

    const isGroupOpen = (group) => {
      const key = groupKey(group)
      return openGroups.value[key] === true || isGroupActive(group)
    }

    const persistGroups = () => {
      localStorage.setItem(groupStorageKey, JSON.stringify(openGroups.value))
    }

    const toggleGroup = (group) => {
      const key = groupKey(group)
      if (!key) return

      if (collapsed.value) {
        collapsed.value = false
        localStorage.setItem(storageKey, '0')
        openGroups.value[key] = true
        persistGroups()
        return
      }

      openGroups.value[key] = !isGroupOpen(group)
      persistGroups()
    }

    const toggleCollapsed = () => {
      collapsed.value = !collapsed.value
      localStorage.setItem(storageKey, collapsed.value ? '1' : '0')
      window.dispatchEvent(
        new CustomEvent('sidebar-collapsed-change', {
          detail: { panelKey: props.panelKey, collapsed: collapsed.value }
        })
      )
    }

    const iconName = (name) => {
      const key = String(name || '').toLowerCase()
      const map = {
        home: 'mdi:home-outline',
        dashboard: 'mdi:view-dashboard-outline',
        building: 'mdi:office-building-outline',
        map: 'mdi:map-marker-outline',
        users: 'mdi:account-group-outline',
        userplus: 'mdi:account-plus-outline',
        usercheck: 'mdi:account-check-outline',
        calendar: 'mdi:calendar-month-outline',
        clipboard: 'mdi:clipboard-text-outline',
        box: 'mdi:package-variant-closed',
        cart: 'mdi:cart-outline',
        tag: 'mdi:tag-outline',
        cash: 'mdi:cash-multiple',
        chart: 'mdi:chart-line',
        file: 'mdi:file-document-outline',
        inbox: 'mdi:inbox-arrow-down-outline',
        settings: 'mdi:cog-outline',
        clinic: 'mdi:medical-bag',
        idcard: 'mdi:card-account-details-outline',
        layout: 'mdi:view-dashboard-edit-outline',
        activity: 'mdi:pulse',
        archive: 'mdi:archive-outline',
        report: 'mdi:file-chart-outline',
        shield: 'mdi:shield-check-outline',
        profile: 'mdi:account-circle-outline',
        bell: 'mdi:bell-outline',
        plus: 'mdi:plus-circle-outline',
        search: 'mdi:magnify',
        money: 'mdi:currency-usd',
        video: 'mdi:video-outline'
      }

      return map[key] || 'mdi:circle-outline'
    }

    const loadCachedUserDetails = () => {
      try {
        const cached = JSON.parse(localStorage.getItem(userStorageKey) || '{}')
        if (cached?.name) displayName.value = cached.name
        if (cached?.email) displayEmail.value = cached.email
      } catch (_error) {
        // ignore cache parse errors
      }
    }

    const persistUserDetails = () => {
      localStorage.setItem(userStorageKey, JSON.stringify({ name: displayName.value, email: displayEmail.value }))
    }

    const loadUserDetails = async (user) => {
      if (!user) return
      displayEmail.value = user.email || displayEmail.value

      const userSnap = await getDoc(doc(db, 'users', user.uid))
      if (!userSnap.exists()) return

      const data = userSnap.data()
      const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim()
      displayName.value = fullName || displayName.value
      displayEmail.value = data.email || displayEmail.value
      persistUserDetails()
    }

    const logout = async () => {
      const result = await Swal.fire({
        title: 'Are you sure?',
        text: 'Do you really want to log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Yes, log me out',
        cancelButtonText: 'Cancel'
      })
      if (!result.isConfirmed) return

      openGroups.value = {}
      persistGroups()

      window.dispatchEvent(
        new CustomEvent('app-process-loading', {
          detail: { active: true, label: 'Logging out...' }
        })
      )

      try {
        await new Promise((resolve) => setTimeout(resolve, 600))
        await signOut(auth)
        await router.push('/login')
      } finally {
        window.dispatchEvent(
          new CustomEvent('app-process-loading', {
            detail: { active: false }
          })
        )
      }
    }

    let unsubscribe = null
    let sidebarToggleHandler = null

    onMounted(async () => {
      loadCachedUserDetails()
      sidebarToggleHandler = (event) => {
        const detail = event?.detail || {}
        if (!detail.panelKey) return
        if (detail.panelKey === props.panelKey) {
          toggleCollapsed()
        }
      }
      window.addEventListener('sidebar-toggle-request', sidebarToggleHandler)
      try {
        const parsed = JSON.parse(localStorage.getItem(groupStorageKey) || '{}')
        if (parsed && typeof parsed === 'object') openGroups.value = parsed
      } catch (_error) {
        openGroups.value = {}
      }

      visibleItems.value.forEach((item) => {
        if (isGroup(item) && isGroupActive(item)) {
          openGroups.value[groupKey(item)] = true
        }
      })

      persistGroups()

      initSubscription()

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        await loadUserDetails(user)
      })
    })

    watch(
      () => route.path,
      () => {
        visibleItems.value.forEach((item) => {
          if (isGroup(item) && isGroupActive(item)) {
            openGroups.value[groupKey(item)] = true
          }
        })
        persistGroups()
      }
    )

    onUnmounted(() => {
      if (unsubscribe) unsubscribe()
      if (sidebarToggleHandler) {
        window.removeEventListener('sidebar-toggle-request', sidebarToggleHandler)
      }
    })

    return {
      collapsed,
      displayName,
      displayEmail,
      userInitial,
      visibleItems,
      isGroup,
      isActive,
      isExactActive,
      isGroupActive,
      isGroupOpen,
      toggleGroup,
      toggleCollapsed,
      iconName,
      logout,
      isLoading
    }
  }
}
</script>

<style scoped>
.sidebar-scroll {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.sidebar-scroll::-webkit-scrollbar {
  display: none;
}
</style>
