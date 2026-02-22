import { ref, computed, watch } from 'vue'
import { useAuth } from './useAuth'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/config/firebaseConfig'

export function usePermissions() {
  const { user } = useAuth()
  
  const userPermissions = ref([])
  const loading = ref(false)

  watch(user, async (newUser) => {
    if (!newUser) {
      userPermissions.value = []
      return
    }

    loading.value = true
    try {
      const userDoc = await getDoc(doc(db, 'users', newUser.uid))
      userPermissions.value = userDoc.exists() ? userDoc.data().permissions || [] : []
    } catch (error) {
      console.error('Error fetching permissions:', error)
      userPermissions.value = []
    } finally {
      loading.value = false
    }
  }, { immediate: true })

  const hasPermission = (permission) => {
    return Array.isArray(userPermissions.value) && userPermissions.value.includes(permission)
  }

  const userRole = computed(() => {
    return user.value?.role || 'guest'
  })

  return {
    userPermissions,
    hasPermission,
    userRole,
    loading
  }
}