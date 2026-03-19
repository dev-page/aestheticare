import { ref, computed, watch } from 'vue'
import { useAuth } from './useAuth'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/config/firebaseConfig'

export function usePermissions() {
  const { user } = useAuth()
  
  const userPermissions = ref([])
  const rolePermissions = ref([])
  const loading = ref(false)
  const roleKey = ref('')
  let unsubscribeUser = null
  let unsubscribeRole = null

  const normalizeRoleKey = (value) => {
    const compact = String(value || '').trim().toLowerCase().replace(/[\s_-]+/g, '')
    if (!compact) return ''
    if (compact === 'superadmin' || compact === 'systemadmin' || compact === 'sysadmin') return 'Superadmin'
    if (compact === 'hr') return 'HR'
    return `${compact.charAt(0).toUpperCase()}${compact.slice(1)}`
  }

  const CACHE_TTL_MS = 5 * 60 * 1000

  const loadCachedPermissions = (uid, role) => {
    try {
      if (uid) {
        const userCache = JSON.parse(localStorage.getItem(`permissions:user:${uid}`) || 'null')
        if (userCache && Array.isArray(userCache.data) && userCache.ts) {
          const isFresh = Date.now() - userCache.ts < CACHE_TTL_MS
          if (isFresh && userCache.data.length) {
            userPermissions.value = userCache.data
          }
        }
      }
      if (role) {
        const roleCache = JSON.parse(localStorage.getItem(`permissions:role:${role}`) || 'null')
        if (roleCache && Array.isArray(roleCache.data) && roleCache.ts) {
          const isFresh = Date.now() - roleCache.ts < CACHE_TTL_MS
          if (isFresh && roleCache.data.length) {
            rolePermissions.value = roleCache.data
          }
        }
      }
    } catch (_error) {
      // ignore cache errors
    }
  }

  const persistPermissions = (uid, role) => {
    try {
      if (uid) {
        localStorage.setItem(
          `permissions:user:${uid}`,
          JSON.stringify({ data: userPermissions.value || [], ts: Date.now() })
        )
      }
      if (role) {
        localStorage.setItem(
          `permissions:role:${role}`,
          JSON.stringify({ data: rolePermissions.value || [], ts: Date.now() })
        )
      }
    } catch (_error) {
      // ignore cache errors
    }
  }

  watch(user, async (newUser) => {
    if (!newUser) {
      userPermissions.value = []
      rolePermissions.value = []
      roleKey.value = ''
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('permissions:user:') || key.startsWith('permissions:role:')) {
            localStorage.removeItem(key)
          }
        })
      } catch (_error) {
        // ignore cache clear errors
      }
      if (unsubscribeUser) {
        unsubscribeUser()
        unsubscribeUser = null
      }
      if (unsubscribeRole) {
        unsubscribeRole()
        unsubscribeRole = null
      }
      return
    }

    loading.value = true
    if (unsubscribeUser) {
      unsubscribeUser()
      unsubscribeUser = null
    }

    unsubscribeUser = onSnapshot(
      doc(db, 'users', newUser.uid),
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() || {} : {}
        userPermissions.value = Array.isArray(data.permissions) ? data.permissions : []
        const nextRole = normalizeRoleKey(data.role || data.userType || '')
        if (nextRole !== roleKey.value) {
          roleKey.value = nextRole
          loadCachedPermissions(newUser.uid, roleKey.value)
          if (unsubscribeRole) {
            unsubscribeRole()
            unsubscribeRole = null
          }
          if (roleKey.value) {
            unsubscribeRole = onSnapshot(
              doc(db, 'rolePermissions', roleKey.value),
              (roleSnap) => {
                const roleData = roleSnap.exists() ? roleSnap.data() || {} : {}
                rolePermissions.value = Array.isArray(roleData.permissions)
                  ? roleData.permissions
                  : []
                persistPermissions(newUser.uid, roleKey.value)
              },
              (error) => {
                console.error('Error listening to role permissions:', error)
                rolePermissions.value = []
              }
            )
          } else {
            rolePermissions.value = []
          }
        }
        persistPermissions(newUser.uid, roleKey.value)
        loading.value = false
      },
      (error) => {
        console.error('Error fetching permissions:', error)
        userPermissions.value = []
        rolePermissions.value = []
        roleKey.value = ''
        loading.value = false
      }
    )
    const initialRole = normalizeRoleKey(newUser?.role || newUser?.userType || '')
    roleKey.value = initialRole
    loadCachedPermissions(newUser.uid, initialRole)
  }, { immediate: true })

  const effectivePermissions = computed(() => {
    const set = new Set([
      ...(Array.isArray(userPermissions.value) ? userPermissions.value : []),
      ...(Array.isArray(rolePermissions.value) ? rolePermissions.value : [])
    ])
    return Array.from(set)
  })

  const hasPermission = (permission) => {
    if (!permission) return true
    return effectivePermissions.value.includes(permission)
  }

  const userRole = computed(() => {
    return roleKey.value || user.value?.role || 'guest'
  })

  return {
    userPermissions,
    effectivePermissions,
    hasPermission,
    userRole,
    loading
  }
}
