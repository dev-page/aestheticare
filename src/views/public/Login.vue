<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { auth, db } from '@/config/firebaseConfig'
import { signInWithEmailAndPassword, setPersistence, browserSessionPersistence, browserLocalPersistence, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, signOut } from 'firebase/auth'
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'vue3-toastify'
import { useAuth } from '@/composables/useAuth'
import { getSuspendedCenterAccess } from '@/utils/centerAccess'

const router = useRouter()
const route = useRoute()
const { user, isLoading } = useAuth()

const email = ref('')
const password = ref('')
const isRememberMe = ref(false)
const isSubmitting = ref(false)
const passwordVisible = ref(false)
const contentVisible = ref(true)
let redirectTimeout = null
const REDIRECT_DELAY = 1700

const EMAIL_REGEX = /^[A-Za-z0-9._]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

const roleRoutes = {
  Superadmin: "/superadmin/dashboard",
  Owner: "/owner/dashboard",
  "Clinic Admin": "/owner/dashboard",
  Manager: "/manager/dashboard",
  Receptionist: "/receptionist/dashboard",
  Practitioner: "/practitioner/dashboard",
  Admin: "/admin/dashboard",
  HR: "/hr/dashboard",
  Finance: "/finance/dashboard",
  Supply: "/supply/dashboard",
  Customer: "/customer/home"
}

const normalizeRoleKey = (value) => {
  const compact = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

  if (!compact) return 'Customer'
  if (compact === 'hr') return 'HR'
  if (compact === 'crm') return 'CRM'
  if (compact === 'clinicadmin' || compact === 'clinicadministrator') return 'Clinic Admin'
  if (compact === 'superadmin' || compact === 'systemadmin' || compact === 'sysadmin') {
    return 'Superadmin'
  }
  return `${compact.charAt(0).toUpperCase()}${compact.slice(1)}`
}

const resolveRedirectPath = async (userData) => {
  const userType = String(userData?.userType || '').trim().toLowerCase()
  if (userType === 'staff' && userData?.mustChangePassword === true) {
    return '/employee/change-password'
  }

  const role = normalizeRoleKey(userData?.role || userData?.customRoleName || userData?.userType)
  if (roleRoutes[role]) {
    return roleRoutes[role]
  }

  if (userType === 'staff') {
    return '/employee/dashboard'
  }

  return '/customer/home'
}

const togglePassword = () => { passwordVisible.value = !passwordVisible.value }

const handleEmailInput = (event) => {
  email.value = event.target.value
}

const handlePasswordInput = (event) => {
  password.value = event.target.value
}

const clearFormFields = () => {
  email.value = ''
  password.value = ''
  isRememberMe.value = false
}

const setProcessLoading = (active, label) => {
  window.dispatchEvent(new CustomEvent('app-process-loading', { detail: { active, label } }))
}

const startRedirectFlow = (redirectPath) => {
  setProcessLoading(true, 'Redirecting to your panel...')
  if (redirectTimeout) clearTimeout(redirectTimeout)
  redirectTimeout = setTimeout(async () => {
    await router.push(redirectPath)
    setProcessLoading(false)
  }, REDIRECT_DELAY)
}

const ensureCenterAccessAllowed = async (firebaseUser, userData) => {
  const suspendedCenter = await getSuspendedCenterAccess(firebaseUser.uid, userData)
  if (!suspendedCenter) return true

  await signOut(auth)
  clearFormFields()
  toast.error('Account suspended.')
  setProcessLoading(false)
  return false
}

const handleLogin = async () => {
  if (!email.value || !password.value) {
    toast.error('Email and password are required.')
    return
  }

  if (!EMAIL_REGEX.test(email.value)) {
    toast.error('Please enter a valid email address.')
    return
  }

  if (password.value.length < 8) {
    toast.error('Password must be at least 8 characters.')
    return
  }

  isSubmitting.value = true
  setProcessLoading(true, 'Redirecting to your panel...')

  try {
    await setPersistence(
      auth,
      isRememberMe.value ? browserLocalPersistence : browserSessionPersistence
    )

    const userCredentials = await signInWithEmailAndPassword(auth, email.value.trim(), password.value)
    await userCredentials.user.reload()

    const userRef = doc(db, 'users', userCredentials.user.uid)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      const userData = userSnap.data()

      if (userData.status === 'Pending') {
        toast.error('Your account is still pending verification. Please check your email for the OTP.')
        setProcessLoading(false)
        return
      }

      if (!(await ensureCenterAccessAllowed(userCredentials.user, userData))) {
        return
      }

      const redirectPath = await resolveRedirectPath(userData)

      clearFormFields()
      startRedirectFlow(redirectPath)
    }
  } catch (err) {
    console.error(err)
    const friendlyMessages = {
      'auth/user-not-found': 'No account found with this email.',
      'auth/invalid-credential': 'Invalid email or password.',
      'auth/too-many-requests': 'Too many failed login attempts. Please try again later.',
      'auth/network-request-failed': 'Connection error. Please check your internet and try again.'
    }
    toast.error(friendlyMessages[err.code] || 'Login failed. Please try again.')
    setProcessLoading(false)
  } finally {
    isSubmitting.value = false
  }
}

const handleForgotPassword = async () => {
  router.push('/forgot-password')
}

const handleGoogleLogin = async () => {
  try {
    const provider = new GoogleAuthProvider()
    setProcessLoading(true, 'Redirecting to your panel...')
    const userCredentials = await signInWithPopup(auth, provider)
    await userCredentials.user.reload()

    const userRef = doc(db, 'users', userCredentials.user.uid)
    let userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: userCredentials.user.email,
        role: 'Customer',
        status: 'Active',
        createdAt: serverTimestamp()
      })
      userSnap = await getDoc(userRef)
    }

    const redirectPath = await resolveRedirectPath(userSnap.data())
    if (!(await ensureCenterAccessAllowed(userCredentials.user, userSnap.data()))) {
      return
    }

    startRedirectFlow(redirectPath)
  } catch (err) {
    console.error(err)
    toast.error('Failed to login with Google.')
    setProcessLoading(false)
  }
}

const handleFacebookLogin = async () => {
  try {
    const provider = new FacebookAuthProvider()
    setProcessLoading(true, 'Redirecting to your panel...')
    const userCredentials = await signInWithPopup(auth, provider)
    await userCredentials.user.reload()

    const userRef = doc(db, 'users', userCredentials.user.uid)
    let userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      await setDoc(userRef, {
        email: userCredentials.user.email,
        role: 'Customer',
        status: 'Active',
        createdAt: serverTimestamp()
      })
      userSnap = await getDoc(userRef)
    }

    const redirectPath = await resolveRedirectPath(userSnap.data())
    if (!(await ensureCenterAccessAllowed(userCredentials.user, userSnap.data()))) {
      return
    }

    startRedirectFlow(redirectPath)
  } catch (err) {
    console.error(err)
    toast.error('Failed to login with Facebook.')
    setProcessLoading(false)
  }
}

onBeforeUnmount(() => {
  if (redirectTimeout) clearTimeout(redirectTimeout)
  setProcessLoading(false)
})

if (route.query.suspended) {
  toast.error('Account suspended.')
}

let leaveInProgress = false
onBeforeRouteLeave((to, from, next) => {
  if (leaveInProgress) {
    next()
    return
  }
  leaveInProgress = true
  contentVisible.value = false
  setTimeout(() => next(), 120)
})
</script>

<template>
  <div class="login-page min-h-[100dvh] overflow-x-hidden bg-gradient-to-br from-cream-100 via-gold-50 to-cream-200 text-charcoal-800">
    <div class="login-blob login-blob-left" aria-hidden="true"></div>
    <div class="login-blob login-blob-right" aria-hidden="true"></div>

    <nav class="login-nav fixed top-0 inset-x-0 z-50">
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 md:px-8">
        <router-link to="/" class="login-back-link">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <span class="hidden sm:inline">Back</span>
        </router-link>

        <span class="login-brand">AesthetiCare</span>

        <div class="w-10"></div>
      </div>
    </nav>

    <div class="relative z-10 mx-auto flex min-h-[100dvh] max-w-7xl items-center px-4 pb-10 pt-24 sm:px-6 md:px-8">
      <transition name="step-slide" appear>
        <div
          v-if="contentVisible"
          class="login-shell grid w-full grid-cols-1 overflow-hidden rounded-[2rem] border border-gold-200/60 bg-white/72 shadow-[0_24px_60px_rgba(54,34,22,0.14)] backdrop-blur-xl lg:grid-cols-[0.95fr_1.05fr]"
        >
          <aside class="login-visual-panel relative hidden items-center justify-center overflow-hidden lg:flex">
            <div class="visual-orb orb-1"></div>
            <div class="visual-orb orb-2"></div>
            <div class="visual-orb orb-3"></div>

            <div class="login-visual-copy">
              <p class="visual-kicker">Welcome back</p>
              <h1 class="visual-title">Elegant clinic operations start here.</h1>
              <p class="visual-copy">
                Sign in to continue your AesthetiCare experience with the same polished gold-and-cream visual language across the platform.
              </p>
              <div class="visual-points">
                <span>Secure sign in</span>
                <span>Fast access</span>
                <span>Clinic-ready flow</span>
              </div>
            </div>

            <div class="device-stack">
              <div class="device-layer layer-3"></div>
              <div class="device-layer layer-2"></div>
              <div class="device-layer layer-1"></div>
              <div class="device-top">
                <div class="device-chip"></div>
              </div>
            </div>

            <div class="space-dot dot-1"></div>
            <div class="space-dot dot-2"></div>
            <div class="space-dot dot-3"></div>
            <div class="space-comet comet-1"></div>
            <div class="space-comet comet-2"></div>
            <div class="side-bubble bubble-1"></div>
            <div class="side-bubble bubble-2"></div>
            <div class="side-bubble bubble-3"></div>
            <div class="side-bubble bubble-4"></div>
            <div class="side-bubble bubble-5"></div>
            <div class="side-bubble bubble-6"></div>
          </aside>

          <section class="login-form-panel relative z-10 flex items-center justify-center px-4 py-10 sm:px-8">
            <span class="form-side-bubble f-bubble-1 hidden lg:block" aria-hidden="true"></span>
            <span class="form-side-bubble f-bubble-2 hidden lg:block" aria-hidden="true"></span>
            <span class="form-side-bubble f-bubble-3 hidden lg:block" aria-hidden="true"></span>

            <form class="login-form w-full max-w-[490px] space-y-4">
              <div class="mb-1">
                <p class="form-kicker">Access Portal</p>
                <h2 class="login-title text-3xl sm:text-4xl leading-tight">Welcome Back</h2>
                <p class="form-subtitle text-sm mt-2">
                  Sign in to continue your AesthetiCare experience.
                </p>
              </div>

              <div class="relative">
                <input
                  :value="email"
                  type="email"
                  required
                  placeholder=" "
                  class="peer input h-16 px-4 pt-5"
                  @input="handleEmailInput"
                />
                <label class="floating-label">Email Address</label>
              </div>

              <div class="relative">
                <input
                  :type="passwordVisible ? 'text' : 'password'"
                  :value="password"
                  required
                  placeholder=" "
                  class="peer input h-16 px-4 pr-12 pt-5"
                  @input="handlePasswordInput"
                />
                <label class="floating-label">Password</label>

                <button type="button" @click="togglePassword" class="password-toggle" tabindex="-1" aria-label="Toggle password visibility">
                  <svg v-if="!passwordVisible" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.956 9.956 0 012.1-3.592M6.18 6.18A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                  </svg>
                  <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>

              <div class="flex items-center justify-between text-xs text-charcoal-600">
                <label class="flex items-center gap-2 remember-me">
                  <input type="checkbox" v-model="isRememberMe" class="accent-gold-700" />
                  Remember me
                </label>
                <button type="button" @click="handleForgotPassword" class="forgot-link">
                  Forgot password?
                </button>
              </div>

              <div class="space-y-2 pt-1">
                <button
                  @click="handleGoogleLogin"
                  type="button"
                  class="social-btn social-btn-light w-full"
                >
                  <svg class="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#4285F4" d="M24 9.5c3.54 0 6.73 1.23 9.23 3.26l6.9-6.9C35.9 2.38 30.28 0 24 0 14.64 0 6.63 5.38 2.69 13.22l8.03 6.24C12.74 13.01 17.93 9.5 24 9.5z"/>
                    <path fill="#34A853" d="M46.5 24.5c0-1.64-.15-3.22-.43-4.75H24v9h12.7c-.55 2.95-2.18 5.45-4.62 7.14l7.07 5.5C43.86 37.19 46.5 31.3 46.5 24.5z"/>
                    <path fill="#FBBC05" d="M10.72 28.46A14.8 14.8 0 0 1 9.95 24c0-1.55.27-3.05.77-4.46l-8.03-6.24A23.98 23.98 0 0 0 0 24c0 3.87.92 7.53 2.56 10.78l8.16-6.32z"/>
                    <path fill="#EA4335" d="M24 48c6.28 0 11.56-2.08 15.42-5.61l-7.07-5.5c-1.96 1.32-4.47 2.1-8.35 2.1-6.06 0-11.25-3.51-13.28-8.58l-8.16 6.32C6.6 42.63 14.62 48 24 48z"/>
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <button
                  @click="handleFacebookLogin"
                  type="button"
                  class="social-btn social-btn-blue w-full"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12 c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047 V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25 h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                  <span>Continue with Facebook</span>
                </button>
              </div>

              <div class="relative my-4">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-charcoal-200"></div>
                </div>
                <div class="relative flex justify-center text-xs">
                  <span class="px-2 bg-transparent text-charcoal-500">or</span>
                </div>
              </div>

              <button
                @click="handleLogin"
                type="button"
                :disabled="isSubmitting"
                class="sign-in-btn w-full"
              >
                {{ isSubmitting ? 'Signing In...' : 'Sign In' }}
              </button>

              <div class="text-center text-sm">
                <router-link
                  to="/register"
                  class="register-link"
                >
                  Don't have an account?
                  <span class="underline underline-offset-4">Register Here</span>
                </router-link>
              </div>
            </form>
          </section>
        </div>
      </transition>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  font-family: "Playfair Display", serif;
}

.login-page {
  position: relative;
}

.login-blob {
  position: absolute;
  border-radius: 999px;
  filter: blur(28px);
  opacity: 0.38;
  pointer-events: none;
}

.login-blob-left {
  top: -4rem;
  left: -5rem;
  width: 20rem;
  height: 20rem;
  background: radial-gradient(circle, rgba(214, 186, 152, 0.78) 0%, rgba(214, 186, 152, 0) 70%);
}

.login-blob-right {
  right: -6rem;
  bottom: -5rem;
  width: 24rem;
  height: 24rem;
  background: radial-gradient(circle, rgba(201, 162, 77, 0.54) 0%, rgba(201, 162, 77, 0) 70%);
}

.login-nav {
  background: rgba(255, 251, 244, 0.78);
  border-bottom: 1px solid rgba(198, 148, 108, 0.22);
  backdrop-filter: blur(16px);
  box-shadow: 0 6px 18px rgba(54, 34, 22, 0.08);
}

.login-back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: 0.9rem;
  padding: 0.45rem 0.7rem;
  color: #6f3f2a;
  transition: background 0.2s ease, color 0.2s ease;
}

.login-back-link:hover {
  color: #9f6946;
  background: rgba(255, 248, 235, 0.86);
}

.login-brand {
  font-family: "Bodoni Moda", "Playfair Display", serif;
  font-style: italic;
  font-weight: 600;
  font-size: 1.15rem;
  letter-spacing: 0.05em;
  background: linear-gradient(120deg, #3c2519 0%, #9f6946 42%, #c99673 70%, #744a33 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.login-shell {
  border: 1px solid rgba(198, 148, 108, 0.24);
  background: rgba(255, 251, 244, 0.7);
  backdrop-filter: blur(18px);
}

.login-visual-panel {
  min-height: 680px;
  background:
    radial-gradient(circle at 18% 20%, rgba(230, 193, 150, 0.35), transparent 42%),
    linear-gradient(145deg, #f8e5bd 0%, #e6c196 45%, #c6946c 100%);
  background-size: 140% 140%;
  animation: visualFlow 16s ease-in-out infinite alternate;
  clip-path: polygon(0 0, 86% 0, 100% 100%, 0 100%);
}

.login-visual-copy {
  position: absolute;
  z-index: 3;
  left: clamp(1.5rem, 4vw, 2.5rem);
  top: clamp(1.5rem, 4vw, 2.5rem);
  max-width: 24rem;
  color: #fff8eb;
}

.visual-kicker {
  margin: 0 0 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 0.72rem;
  color: rgba(255, 248, 235, 0.82);
}

.visual-title {
  margin: 0;
  font-family: "Bodoni Moda", "Playfair Display", serif;
  font-style: italic;
  font-weight: 600;
  line-height: 0.95;
  letter-spacing: -0.03em;
  font-size: clamp(2.7rem, 4.2vw, 4.2rem);
  text-shadow: 0 10px 28px rgba(54, 34, 22, 0.22);
}

.visual-copy {
  margin-top: 1rem;
  font-size: 0.98rem;
  line-height: 1.7;
  color: rgba(255, 248, 235, 0.9);
}

.visual-points {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.visual-points span {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.45rem 0.75rem;
  border: 1px solid rgba(255, 248, 235, 0.28);
  background: rgba(255, 248, 235, 0.12);
  color: #fff8eb;
  font-size: 0.74rem;
  font-weight: 600;
}

.login-form-panel {
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(241, 212, 170, 0.24), transparent 32%),
    linear-gradient(180deg, rgba(255, 251, 244, 0.94), rgba(250, 241, 227, 0.98));
}

.login-form {
  position: relative;
}

.form-kicker {
  margin: 0 0 0.4rem;
  color: #a56b44;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 0.72rem;
}

.login-title {
  font-family: "Bodoni Moda", "Playfair Display", serif;
  font-style: italic;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: #6f3f2a;
  background: linear-gradient(120deg, #4a2c1e 0%, #996341 40%, #c89066 72%, #7b4e35 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.form-subtitle {
  color: rgba(84, 58, 41, 0.82);
}

.visual-orb {
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(255, 248, 235, 0.34);
  pointer-events: none;
  animation: orbFloat 13s ease-in-out infinite;
}

.orb-1 {
  width: 360px;
  height: 360px;
  top: -140px;
  right: -120px;
}

.orb-2 {
  width: 280px;
  height: 280px;
  bottom: -110px;
  right: 20px;
}

.orb-3 {
  width: 220px;
  height: 220px;
  top: 18%;
  left: -90px;
}

.device-stack {
  position: relative;
  width: min(82%, 420px);
  height: 280px;
  transform: rotate(-12deg);
  z-index: 2;
  animation: stackFloat 6.8s ease-in-out infinite;
}

.device-layer {
  position: absolute;
  left: 40px;
  right: 10px;
  height: 160px;
  border-radius: 22px;
  border: 1px solid rgba(255, 248, 235, 0.42);
  background: linear-gradient(140deg, rgba(255, 248, 235, 0.62), rgba(248, 229, 189, 0.3));
  box-shadow: 0 12px 28px rgba(54, 34, 22, 0.14);
  animation: layerShimmer 5.2s ease-in-out infinite;
}

.layer-1 {
  top: 92px;
}

.layer-2 {
  top: 122px;
  left: 58px;
  opacity: 0.82;
}

.layer-3 {
  top: 152px;
  left: 76px;
  opacity: 0.6;
}

.device-top {
  position: absolute;
  top: 54px;
  left: 28px;
  right: 0;
  height: 170px;
  border-radius: 24px;
  border: 1px solid rgba(255, 248, 235, 0.62);
  background: linear-gradient(160deg, rgba(255, 248, 235, 0.9), rgba(214, 175, 127, 0.78));
  box-shadow: 0 20px 36px rgba(54, 34, 22, 0.2);
}

.device-chip {
  width: 44px;
  height: 26px;
  border-radius: 12px;
  background: rgba(255, 248, 235, 0.7);
  border: 1px solid rgba(198, 148, 108, 0.36);
  margin: 18px auto 0;
}

.space-dot {
  position: absolute;
  border-radius: 999px;
  background: rgba(255, 248, 235, 0.7);
  border: 1px solid rgba(198, 148, 108, 0.5);
  animation: dotPulse 2.8s ease-in-out infinite;
}

.dot-1 {
  width: 14px;
  height: 14px;
  top: 70px;
  left: 50px;
}

.dot-2 {
  width: 10px;
  height: 10px;
  bottom: 92px;
  left: 100px;
}

.dot-3 {
  width: 8px;
  height: 8px;
  top: 126px;
  right: 90px;
}

.space-comet {
  position: absolute;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 248, 235, 0), rgba(255, 248, 235, 0.95));
  animation: cometDrift 4.4s ease-in-out infinite;
}

.comet-1 {
  width: 82px;
  top: 108px;
  left: 72px;
  --comet-rot: -26deg;
}

.comet-2 {
  width: 66px;
  bottom: 76px;
  right: 72px;
  --comet-rot: 24deg;
  animation-delay: 0.9s;
}

.side-bubble {
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(255, 248, 235, 0.78);
  background: radial-gradient(circle at 30% 28%, rgba(255, 250, 241, 0.95), rgba(225, 185, 142, 0.75));
  box-shadow: 0 10px 22px rgba(54, 34, 22, 0.16);
  animation: bubbleDrift 6.2s ease-in-out infinite;
  z-index: 3;
}

.form-side-bubble {
  position: absolute;
  left: 8px;
  border-radius: 999px;
  border: 1px solid rgba(226, 189, 149, 0.52);
  background: radial-gradient(circle at 30% 28%, rgba(255, 250, 241, 0.75), rgba(233, 206, 173, 0.42));
  box-shadow: 0 8px 18px rgba(54, 34, 22, 0.1);
  pointer-events: none;
  z-index: 1;
  animation: bubbleDriftSoft 7s ease-in-out infinite;
}

.f-bubble-1 {
  width: 44px;
  height: 44px;
  top: 22%;
  animation-delay: 0.5s;
}

.f-bubble-2 {
  width: 58px;
  height: 58px;
  top: 48%;
  left: -2px;
  animation-delay: 1.4s;
}

.f-bubble-3 {
  width: 40px;
  height: 40px;
  top: 74%;
  left: 12px;
  animation-delay: 2.1s;
}

.bubble-1 {
  width: 62px;
  height: 62px;
  right: 12px;
  top: 18%;
  animation-delay: 0s;
}

.bubble-2 {
  width: 46px;
  height: 46px;
  right: 36px;
  top: 38%;
  animation-delay: 1.2s;
}

.bubble-3 {
  width: 54px;
  height: 54px;
  right: 10px;
  top: 54%;
  animation-delay: 2s;
}

.bubble-4 {
  width: 68px;
  height: 68px;
  right: 18px;
  top: 70%;
  animation-delay: 0.6s;
}

.bubble-5 {
  width: 40px;
  height: 40px;
  right: 28px;
  top: 84%;
  animation-delay: 1.6s;
}

.bubble-6 {
  width: 34px;
  height: 34px;
  right: 54px;
  top: 26%;
  animation-delay: 2.6s;
}

.password-toggle {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #a56b44;
  transition: color 0.2s ease, transform 0.2s ease;
}

.password-toggle:hover {
  color: #8d5a3b;
  transform: translateY(-50%) scale(1.04);
}

.remember-me {
  color: #5d3728;
}

.forgot-link {
  color: #a56b44;
  font-size: 0.78rem;
  transition: color 0.2s ease;
}

.forgot-link:hover {
  color: #7b4e35;
  text-decoration: underline;
}

.social-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  border-radius: 1rem;
  padding: 0.9rem 1rem;
  font-size: 0.95rem;
  font-weight: 700;
  transition: transform 0.22s ease, background 0.22s ease, border-color 0.22s ease;
}

.social-btn:hover {
  transform: translateY(-1px);
}

.social-btn-light {
  border: 1px solid rgba(198, 148, 108, 0.24);
  background: rgba(255, 255, 255, 0.9);
  color: #5d3728;
}

.social-btn-light:hover {
  background: #ffffff;
}

.social-btn-blue {
  background: #1877F2;
  color: #ffffff;
}

.social-btn-blue:hover {
  background: #1669d3;
}

.sign-in-btn {
  min-height: 52px;
  border-radius: 1rem;
  border: 1px solid rgba(126, 78, 53, 0.22);
  background: linear-gradient(120deg, #b57f5c 0%, #8d5a3b 50%, #6e4330 100%);
  color: #fff8eb;
  font-size: 0.98rem;
  font-weight: 700;
  box-shadow: 0 14px 28px rgba(111, 63, 42, 0.18);
  transition: transform 0.22s ease, background 0.22s ease, opacity 0.22s ease;
}

.sign-in-btn:hover {
  transform: translateY(-1px);
  background: linear-gradient(120deg, #bd8965 0%, #94603d 50%, #7b4e35 100%);
}

.sign-in-btn:disabled {
  opacity: 0.62;
  cursor: not-allowed;
}

.register-link {
  color: #7b4e35;
  font-weight: 600;
}

.register-link:hover {
  color: #9f6946;
}

.input {
  width: 100%;
  border-radius: 0.95rem;
  background: rgba(255, 255, 255, 0.56);
  border: 1px solid rgba(232, 167, 58, 0.35);
  color: #333;
  line-height: 1.25rem;
  vertical-align: middle;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input::placeholder {
  color: transparent;
}

.floating-label {
  position: absolute;
  left: 1rem;
  top: 0.95rem;
  color: #8a5b3d;
  font-size: 0.95rem;
  line-height: 1;
  pointer-events: none;
  transition: all 0.2s ease;
}

.peer:placeholder-shown + .floating-label {
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.05rem;
  color: #9b7a5f;
}

.peer:focus + .floating-label,
.peer:not(:placeholder-shown) + .floating-label {
  top: 0.7rem;
  transform: translateY(0);
  font-size: 0.75rem;
  color: #8c5a3a;
}

.input:focus {
  border-color: #c9a24d;
  box-shadow: 0 0 0 3px rgba(201, 162, 77, 0.25);
}

.step-slide-enter-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.step-slide-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.step-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}

.step-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.login-content-block {
  opacity: 0;
  animation: loginContentIn 0.32s ease 0.08s forwards;
}

@keyframes visualFlow {
  0% { background-position: 0% 0%; }
  100% { background-position: 100% 100%; }
}

@keyframes orbFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes stackFloat {
  0%, 100% { transform: rotate(-12deg) translateY(0); }
  50% { transform: rotate(-10deg) translateY(-12px); }
}

@keyframes layerShimmer {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.08); }
}

@keyframes dotPulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.22); }
}

@keyframes cometDrift {
  0%, 100% { opacity: 0.72; transform: translateX(0) rotate(var(--comet-rot, 0deg)); }
  50% { opacity: 1; transform: translateX(10px) rotate(var(--comet-rot, 0deg)); }
}

@keyframes bubbleDrift {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.9; }
  50% { transform: translate3d(-6px, -12px, 0) scale(1.06); opacity: 1; }
}

@keyframes bubbleDriftSoft {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.6; }
  50% { transform: translate3d(4px, -8px, 0) scale(1.04); opacity: 0.82; }
}

@keyframes loginContentIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 1023px) {
  .login-visual-panel {
    display: none;
  }

  .login-shell {
    border-radius: 1.6rem;
  }
}

@media (max-width: 767px) {
  .login-title {
    font-size: 2rem;
  }

  .login-form-panel {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>
