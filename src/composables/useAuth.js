import { ref } from 'vue'
import { auth } from '@/config/firebaseConfig'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { useRouter } from 'vue-router'

const user = ref(null)
const isLoading = ref(true)
const isLoggingOut = ref(false)

let unsubscribe = null

const initAuth = () => {
  if (unsubscribe) return // Already initialized

  unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    user.value = firebaseUser
    isLoading.value = false
  })
}

export function useAuth() {
  const router = useRouter()

  const setProcessLoading = (active, label) => {
    window.dispatchEvent(new CustomEvent('app-process-loading', { detail: { active, label } }))
  }
  
  const logout = async () => {
    isLoggingOut.value = true
    setProcessLoading(true, 'Logging out...')
    try {
      await new Promise((resolve) => setTimeout(resolve, 600))
      await signOut(auth)
      try {
        Object.keys(localStorage).forEach((key) => {
          if (
            key.startsWith('permissions:user:') ||
            key.startsWith('permissions:role:') ||
            key.startsWith('subscription:plan') ||
            key.startsWith('subscription:features:')
          ) {
            localStorage.removeItem(key)
          }
        })
      } catch (_error) {
        // ignore cache clear errors
      }
      await router.push('/login')
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      isLoggingOut.value = false
      setProcessLoading(false)
    } 
  }

  return {
    user,
    isLoading,
    isLoggingOut,
    logout,
    initAuth
  }
}
