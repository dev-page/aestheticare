<script setup>
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/config/firebaseConfig'
import { collection, query, where, getDocs } from 'firebase/firestore'
import axios from 'axios'
import { toast } from 'vue3-toastify'
import { resolveApiBaseUrl } from '@/utils/apiBaseUrl'

const router = useRouter()
const OTP_API_BASE = resolveApiBaseUrl(import.meta.env.VITE_OTP_API_BASE_URL, {
  devFallbackUrl: 'http://localhost:3000',
})

const step = ref(1)
const email = ref('')
const otpDigits = ref(Array(6).fill(''))
const generatedOtp = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const otpInputRefs = ref([])
const OTP_LENGTH = 6
const RESEND_COOLDOWN_SECONDS = 60
const resendCountdown = ref(0)
let resendTimer = null

const cancelReset = () => {
  router.push('/login')
}

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 32
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,32}$/

const passwordVisible = ref(false)
const confirmPasswordVisible = ref(false)

const togglePassword = () => { passwordVisible.value = !passwordVisible.value }
const toggleConfirmPassword = () => { confirmPasswordVisible.value = !confirmPasswordVisible.value }

const getBackendCandidates = () => {
  const candidates = [
    String(OTP_API_BASE || '').trim(),
  ].filter(Boolean)
  if (import.meta.env.DEV) {
    candidates.push('http://localhost:3000', 'http://localhost:3001')
  }
  return [...new Set(candidates)]
}

const postToBackend = async (path, payload) => {
  let lastError = null
  for (const baseUrl of getBackendCandidates()) {
    try {
      const response = await axios.post(`${baseUrl}${path}`, payload)
      return response
    } catch (err) {
      if (err?.response?.status === 404) {
        lastError = err
        continue
      }
      throw err
    }
  }
  throw lastError || new Error('Backend endpoint not found.')
}

const clearResendTimer = () => {
  if (!resendTimer) return
  clearInterval(resendTimer)
  resendTimer = null
}

const startResendCountdown = () => {
  clearResendTimer()
  resendCountdown.value = RESEND_COOLDOWN_SECONDS
  resendTimer = setInterval(() => {
    if (resendCountdown.value <= 1) {
      resendCountdown.value = 0
      clearResendTimer()
      return
    }
    resendCountdown.value -= 1
  }, 1000)
}

const requestOtp = async ({ advanceStep = true, successMessage = 'OTP sent to your email.' } = {}) => {
  if (!email.value) {
    toast.error('Please enter your email.')
    return false
  }

  try {
    const userRef = collection(db, 'users')
    const q = query(userRef, where('email', '==', email.value.trim()))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      toast.error('Email not found in our records.')
      return false
    }

    const authCheck = await postToBackend('/auth/check-user', {
      email: email.value.trim(),
    })
    if (authCheck?.data?.success && authCheck?.data?.exists === false) {
      toast.error('No account found for this email in authentication.')
      return false
    }

    generatedOtp.value = Math.floor(100000 + Math.random() * 900000).toString()
    await postToBackend('/send-otp', {
      recipient: email.value,
      otp: generatedOtp.value,
    })
    toast.info(successMessage)
    if (advanceStep) {
      step.value = 2
    }
    clearOtpInputs()
    focusOtpInput(0)
    startResendCountdown()
    return true
  } catch (err) {
    console.error(err)
    const providerError =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      'Failed to send OTP.'
    toast.error(providerError)
    return false
  }
}

const sendOtp = async () => {
  await requestOtp()
}

const resendOtp = async () => {
  if (resendCountdown.value > 0) return
  await requestOtp({
    advanceStep: false,
    successMessage: 'A new OTP has been sent to your email.'
  })
}

const verifyOtp = () => {
  if (otpCode.value === generatedOtp.value) {
    toast.success('OTP verified! You can now reset your password.')
    step.value = 3
  } else {
    toast.error('Invalid OTP.')
  }
}

const resetPassword = async () => {
  if (!newPassword.value || !confirmPassword.value) {
    toast.error('Please enter and confirm your new password.')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.error('Passwords do not match.')
    return
  }
  if (newPassword.value.length < PASSWORD_MIN_LENGTH || newPassword.value.length > PASSWORD_MAX_LENGTH) {
    toast.error('Password must be 8-32 characters.')
    return
  }
  if (!PASSWORD_REGEX.test(newPassword.value)) {
    toast.error('Password must include uppercase, lowercase, number, and special character (@$!%*?&).')
    return
  }
  try {
    const response = await postToBackend('/auth/reset-password', {
      email: email.value.trim(),
      newPassword: newPassword.value,
    })
    if (response?.data?.success) {
      toast.success('Password updated successfully. You can now log in.')
    } else {
      toast.error(response?.data?.error || 'Failed to reset password.')
      return
    }
    step.value = 1
    email.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    clearOtpInputs()
    generatedOtp.value = ''
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (err) {
    console.error(err)
    const providerError =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      'Error resetting password.'
    toast.error(providerError)
  }
}

const otpCode = computed(() => otpDigits.value.join(''))
const resendCountdownLabel = computed(() => {
  const minutes = String(Math.floor(resendCountdown.value / 60)).padStart(2, '0')
  const seconds = String(resendCountdown.value % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
})

const setOtpInputRef = (el, index) => {
  if (el) otpInputRefs.value[index] = el
}

const focusOtpInput = (index) => {
  if (index < 0 || index > OTP_LENGTH - 1) return
  nextTick(() => otpInputRefs.value[index]?.focus())
}

const clearOtpInputs = () => {
  otpDigits.value = Array(OTP_LENGTH).fill('')
}

const handleOtpInput = (index, event) => {
  const input = event?.target?.value || ''
  const digits = input.replace(/\D/g, '').slice(-1)
  otpDigits.value[index] = digits
  if (digits && index < OTP_LENGTH - 1) focusOtpInput(index + 1)
}

const handleOtpKeydown = (index, event) => {
  if (event.key === 'Backspace') {
    if (otpDigits.value[index]) {
      otpDigits.value[index] = ''
    } else if (index > 0) {
      otpDigits.value[index - 1] = ''
      focusOtpInput(index - 1)
    }
  }
  if (event.key === 'ArrowLeft' && index > 0) focusOtpInput(index - 1)
  if (event.key === 'ArrowRight' && index < OTP_LENGTH - 1) focusOtpInput(index + 1)
}

const handleOtpPaste = (event) => {
  const pastedDigits = event.clipboardData?.getData('text')?.replace(/\D/g, '').slice(0, OTP_LENGTH) || ''
  if (!pastedDigits) return
  pastedDigits.split('').forEach((digit, offset) => {
    if (offset < OTP_LENGTH) otpDigits.value[offset] = digit
  })
  const nextIndex = Math.min(pastedDigits.length, OTP_LENGTH - 1)
  focusOtpInput(nextIndex)
}

onBeforeUnmount(() => {
  clearResendTimer()
})
</script>

<template>
  <div class="forgot-page min-h-screen overflow-hidden bg-gradient-to-br from-cream-100 via-gold-50 to-cream-200 text-charcoal-800">
    <div class="forgot-blob forgot-blob-left" aria-hidden="true"></div>
    <div class="forgot-blob forgot-blob-right" aria-hidden="true"></div>

    <div class="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 md:px-8">
      <div class="grid w-full grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
        <section class="forgot-hero-panel">
          <p class="forgot-kicker">Account Recovery</p>
          <h1 class="forgot-title">Reset your password with a calm, secure flow.</h1>
          <p class="forgot-copy">
            Confirm your email, verify the one-time code we send, and create a new password without leaving the page.
          </p>

          <div class="forgot-points">
            <div class="forgot-point-card">
              <p class="forgot-point-label">Step 1</p>
              <p class="forgot-point-title">Email verification</p>
              <p class="forgot-point-copy">We confirm the address you entered exists in our records.</p>
            </div>
            <div class="forgot-point-card">
              <p class="forgot-point-label">Step 2</p>
              <p class="forgot-point-title">OTP validation</p>
              <p class="forgot-point-copy">Enter the six-digit code and continue with confidence.</p>
            </div>
            <div class="forgot-point-card">
              <p class="forgot-point-label">Step 3</p>
              <p class="forgot-point-title">Secure reset</p>
              <p class="forgot-point-copy">Set a strong password that meets the clinic safety rules.</p>
            </div>
          </div>

          <div class="forgot-trust-strip">
            <span class="forgot-trust-chip">OTP by email</span>
            <span class="forgot-trust-chip">60s resend cooldown</span>
            <span class="forgot-trust-chip">Strong password policy</span>
          </div>
        </section>

        <section class="forgot-form-shell">
          <div class="forgot-form-card">
            <div class="forgot-form-top">
              <div>
                <p class="forgot-form-eyebrow">Recover Account</p>
                <h2 class="forgot-form-title">
                  <span v-if="step === 1">Enter your email</span>
                  <span v-else-if="step === 2">Verify your OTP</span>
                  <span v-else>Set a new password</span>
                </h2>
              </div>
              <div class="forgot-step-pill">
                {{ step }} / 3
              </div>
            </div>

            <div class="forgot-step-tracker" aria-hidden="true">
              <span class="forgot-step-dot" :class="{ active: step >= 1 }"></span>
              <span class="forgot-step-line" :class="{ active: step >= 2 }"></span>
              <span class="forgot-step-dot" :class="{ active: step >= 2 }"></span>
              <span class="forgot-step-line" :class="{ active: step >= 3 }"></span>
              <span class="forgot-step-dot" :class="{ active: step >= 3 }"></span>
            </div>

            <div v-if="step === 1" class="forgot-step-content">
              <p class="forgot-step-copy">
                Enter your registered email address and we’ll send a verification code.
              </p>
              <label class="forgot-field">
                <span>Email Address</span>
                <input
                  v-model="email"
                  type="email"
                  placeholder="name@example.com"
                  class="forgot-input"
                />
              </label>
              <div class="forgot-action-row">
                <button @click="cancelReset" class="forgot-btn forgot-btn-secondary" type="button">
                  Cancel
                </button>
                <button @click="sendOtp" class="forgot-btn forgot-btn-primary" type="button">
                  Send OTP
                </button>
              </div>
            </div>

            <div v-if="step === 2" class="forgot-step-content">
              <p class="forgot-step-copy">
                We sent an OTP to <strong>{{ email }}</strong>. Enter it below to continue.
              </p>

              <div class="otp-boxes">
                <input
                  v-for="(_, index) in OTP_LENGTH"
                  :key="`forgot-otp-${index}`"
                  :ref="(el) => setOtpInputRef(el, index)"
                  v-model="otpDigits[index]"
                  type="text"
                  inputmode="numeric"
                  pattern="[0-9]*"
                  maxlength="1"
                  autocomplete="one-time-code"
                  class="otp-digit"
                  :class="{ 'otp-digit-filled': otpDigits[index] }"
                  @input="handleOtpInput(index, $event)"
                  @keydown="handleOtpKeydown(index, $event)"
                  @paste="handleOtpPaste"
                />
              </div>

              <div class="forgot-action-row">
                <button @click="cancelReset" class="forgot-btn forgot-btn-secondary" type="button">
                  Cancel
                </button>
                <button @click="verifyOtp" class="forgot-btn forgot-btn-primary" type="button">
                  Verify OTP
                </button>
              </div>

              <div class="forgot-resend-box">
                <button
                  @click="resendOtp"
                  type="button"
                  :disabled="resendCountdown > 0"
                  class="forgot-resend-btn"
                >
                  Resend OTP
                </button>
                <p class="forgot-resend-copy">
                  <span v-if="resendCountdown > 0">You can resend another OTP in {{ resendCountdownLabel }}.</span>
                  <span v-else>You can request another OTP now.</span>
                </p>
              </div>
            </div>

            <div v-if="step === 3" class="forgot-step-content">
              <p class="forgot-step-copy">
                Create a secure password you haven’t used before.
              </p>

              <label class="forgot-field">
                <span>New Password</span>
                <div class="forgot-password-field">
                  <input
                    v-model="newPassword"
                    :type="passwordVisible ? 'text' : 'password'"
                    placeholder="Enter new password"
                    class="forgot-input forgot-input-with-action"
                  />
                  <button type="button" class="forgot-eye-btn" @click="togglePassword" aria-label="Toggle password visibility">
                    <svg v-if="!passwordVisible" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.114-3.592m3.665-2.697A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.958 9.958 0 01-4.043 5.274M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                    </svg>
                  </button>
                </div>
              </label>

              <label class="forgot-field">
                <span>Confirm Password</span>
                <div class="forgot-password-field">
                  <input
                    v-model="confirmPassword"
                    :type="confirmPasswordVisible ? 'text' : 'password'"
                    placeholder="Confirm password"
                    class="forgot-input forgot-input-with-action"
                  />
                  <button type="button" class="forgot-eye-btn" @click="toggleConfirmPassword" aria-label="Toggle confirm password visibility">
                    <svg v-if="!confirmPasswordVisible" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.956 9.956 0 012.114-3.592m3.665-2.697A9.956 9.956 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.958 9.958 0 01-4.043 5.274M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                    </svg>
                  </button>
                </div>
              </label>

              <div class="forgot-password-rules">
                <p>Password must be 8-32 characters and include uppercase, lowercase, number, and special character (@$!%*?&).</p>
              </div>

              <div class="forgot-action-row">
                <button @click="cancelReset" class="forgot-btn forgot-btn-secondary" type="button">
                  Cancel
                </button>
                <button @click="resetPassword" class="forgot-btn forgot-btn-primary" type="button">
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  font-family: "Playfair Display", serif;
}

.forgot-page {
  position: relative;
}

.forgot-blob {
  position: absolute;
  border-radius: 999px;
  filter: blur(24px);
  opacity: 0.42;
  pointer-events: none;
}

.forgot-blob-left {
  width: 18rem;
  height: 18rem;
  top: -3rem;
  left: -4rem;
  background: radial-gradient(circle, rgba(214, 186, 152, 0.78) 0%, rgba(214, 186, 152, 0) 70%);
}

.forgot-blob-right {
  width: 22rem;
  height: 22rem;
  right: -5rem;
  bottom: -4rem;
  background: radial-gradient(circle, rgba(201, 162, 77, 0.54) 0%, rgba(201, 162, 77, 0) 70%);
}

.forgot-hero-panel,
.forgot-form-card {
  border: 1px solid rgba(198, 148, 108, 0.22);
  background: linear-gradient(180deg, rgba(255, 251, 244, 0.88) 0%, rgba(250, 241, 227, 0.92) 100%);
  box-shadow: 0 20px 48px rgba(54, 34, 22, 0.1);
  backdrop-filter: blur(14px);
}

.forgot-hero-panel {
  border-radius: 2rem;
  padding: clamp(1.5rem, 3.5vw, 2.4rem);
}

.forgot-kicker,
.forgot-form-eyebrow {
  margin: 0 0 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  font-size: 0.72rem;
  color: #a56b44;
}

.forgot-title {
  margin: 0;
  font-family: "Bodoni Moda", "Playfair Display", serif;
  font-style: italic;
  font-weight: 600;
  line-height: 0.96;
  letter-spacing: -0.03em;
  font-size: clamp(2.6rem, 5vw, 4.7rem);
  background: linear-gradient(120deg, #8a5237 0%, #c68457 52%, #a86444 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.forgot-copy {
  margin-top: 1rem;
  max-width: 42rem;
  font-size: 1rem;
  line-height: 1.7;
  color: rgba(84, 58, 41, 0.86);
}

.forgot-points {
  margin-top: 1.6rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.forgot-point-card {
  border-radius: 1.35rem;
  border: 1px solid rgba(214, 169, 123, 0.22);
  background: rgba(255, 248, 235, 0.72);
  padding: 1rem 1rem 0.95rem;
}

.forgot-point-label {
  margin: 0 0 0.35rem;
  font-size: 0.64rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: #a56b44;
}

.forgot-point-title {
  margin: 0;
  font-family: "Bodoni Moda", "Playfair Display", serif;
  font-size: 1.15rem;
  font-weight: 600;
  color: #3b281d;
}

.forgot-point-copy {
  margin: 0.45rem 0 0;
  font-size: 0.9rem;
  line-height: 1.55;
  color: rgba(74, 53, 40, 0.84);
}

.forgot-trust-strip {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.forgot-trust-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(198, 148, 108, 0.22);
  background: rgba(255, 248, 235, 0.84);
  color: #87593b;
  font-size: 0.78rem;
  font-weight: 600;
}

.forgot-form-shell {
  display: flex;
  align-items: stretch;
}

.forgot-form-card {
  width: 100%;
  border-radius: 2rem;
  padding: clamp(1.4rem, 3vw, 2rem);
}

.forgot-form-top {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.forgot-form-title {
  margin: 0;
  font-family: "Bodoni Moda", "Playfair Display", serif;
  font-style: italic;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.03em;
  font-size: clamp(1.85rem, 3vw, 2.45rem);
  color: #3b281d;
}

.forgot-step-pill {
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1px solid rgba(198, 148, 108, 0.24);
  background: rgba(255, 248, 235, 0.88);
  color: #87593b;
  padding: 0.5rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 700;
}

.forgot-step-tracker {
  margin-top: 1rem;
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.forgot-step-dot {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  border: 1px solid rgba(198, 148, 108, 0.38);
  background: rgba(255, 248, 235, 0.92);
}

.forgot-step-dot.active {
  background: linear-gradient(120deg, #b57f5c 0%, #8d5a3b 100%);
  border-color: transparent;
}

.forgot-step-line {
  flex: 1 1 auto;
  height: 1px;
  background: rgba(198, 148, 108, 0.18);
}

.forgot-step-line.active {
  background: linear-gradient(90deg, rgba(181, 127, 92, 0.7), rgba(141, 90, 59, 0.45));
}

.forgot-step-content {
  margin-top: 1.15rem;
}

.forgot-step-copy {
  margin: 0 0 1rem;
  color: rgba(74, 53, 40, 0.9);
  font-size: 0.98rem;
  line-height: 1.65;
}

.forgot-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 0.95rem;
}

.forgot-field > span {
  color: #7b4e35;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.forgot-input {
  width: 100%;
  border-radius: 1rem;
  border: 1px solid rgba(214, 186, 152, 0.8);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 237, 226, 0.96));
  color: #5d3728;
  padding: 0.95rem 1rem;
  outline: none;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.7);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.14s ease;
}

.forgot-input:focus {
  border-color: #c9a24d;
  box-shadow: 0 0 0 3px rgba(201, 162, 77, 0.2);
  transform: translateY(-1px);
}

.forgot-input-with-action {
  padding-right: 3.25rem;
}

.forgot-password-field {
  position: relative;
}

.forgot-eye-btn {
  position: absolute;
  right: 0.8rem;
  top: 50%;
  transform: translateY(-50%);
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid rgba(198, 148, 108, 0.22);
  color: #87593b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 248, 235, 0.8);
}

.forgot-action-row {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.forgot-btn {
  flex: 1 1 0;
  min-height: 52px;
  border-radius: 1rem;
  padding: 0.95rem 1.1rem;
  font-size: 0.94rem;
  font-weight: 700;
  transition: transform 0.22s ease, background 0.22s ease, color 0.22s ease, border-color 0.22s ease;
}

.forgot-btn:hover {
  transform: translateY(-1px);
}

.forgot-btn-secondary {
  border: 1px solid rgba(198, 148, 108, 0.32);
  background: rgba(255, 251, 244, 0.75);
  color: #7b4e35;
}

.forgot-btn-secondary:hover {
  background: rgba(255, 248, 235, 0.96);
}

.forgot-btn-primary {
  border: 1px solid rgba(126, 78, 53, 0.22);
  background: linear-gradient(120deg, #b57f5c 0%, #8d5a3b 50%, #6e4330 100%);
  color: #fff8eb;
  box-shadow: 0 14px 28px rgba(111, 63, 42, 0.18);
}

.forgot-btn-primary:hover {
  background: linear-gradient(120deg, #bd8965 0%, #94603d 50%, #7b4e35 100%);
}

.forgot-resend-box {
  margin-top: 0.9rem;
  border-radius: 1.25rem;
  border: 1px solid rgba(198, 148, 108, 0.18);
  background: rgba(255, 248, 235, 0.72);
  padding: 1rem;
}

.forgot-resend-btn {
  width: 100%;
  min-height: 48px;
  border-radius: 0.9rem;
  border: 1px solid rgba(181, 127, 92, 0.32);
  background: #fff8eb;
  color: #7b4e35;
  font-weight: 700;
}

.forgot-resend-btn:disabled {
  cursor: not-allowed;
  border-color: rgba(156, 163, 175, 0.4);
  background: rgba(243, 244, 246, 0.9);
  color: #9ca3af;
}

.forgot-resend-copy {
  margin: 0.65rem 0 0;
  text-align: center;
  font-size: 0.8rem;
  color: rgba(74, 53, 40, 0.78);
}

.forgot-password-rules {
  margin-top: 0.9rem;
  border-radius: 1.1rem;
  border: 1px solid rgba(198, 148, 108, 0.16);
  background: rgba(255, 248, 235, 0.7);
  padding: 0.9rem 1rem;
  color: rgba(74, 53, 40, 0.8);
  font-size: 0.82rem;
  line-height: 1.55;
}

.otp-boxes {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.55rem;
  max-width: 22rem;
  margin: 0 auto;
}

.otp-digit {
  height: 3.15rem;
  border-radius: 0.95rem;
  border: 1px solid rgba(214, 186, 152, 0.8);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 237, 226, 0.96));
  color: #6f3f2a;
  text-align: center;
  font-size: 1.35rem;
  font-weight: 700;
  line-height: 1;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.14s, background 0.2s;
}

.otp-digit:focus {
  border-color: #c9a24d;
  box-shadow: 0 0 0 3px rgba(201, 162, 77, 0.22);
  transform: translateY(-1px);
}

.otp-digit-filled {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(245, 237, 226, 0.96));
}

@media (max-width: 1023px) {
  .forgot-hero-panel {
    padding: 1.3rem;
  }

  .forgot-points {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 767px) {
  .forgot-title {
    font-size: clamp(2.2rem, 12vw, 3.3rem);
  }

  .forgot-form-card {
    padding: 1.2rem;
  }

  .forgot-form-top {
    align-items: start;
  }

  .forgot-action-row {
    flex-direction: column;
  }

  .otp-boxes {
    gap: 0.4rem;
  }

  .otp-digit {
    height: 2.9rem;
    font-size: 1.2rem;
  }
}
</style>
