<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '@/config/firebaseConfig'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { toast } from 'vue3-toastify'
import Modal from '@/components/common/Modal.vue'
import Terms from '@/components/common/Terms.vue'
import axios from 'axios'

const router = useRouter()

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const birthDate = ref('')

const isSubmitting = ref(false)
const passwordVisible = ref(false)
const confirmPasswordVisible = ref(false)
const showTerms = ref(false)
const termsAccepted = ref(false)

const otpSent = ref(false)
const otpInput = ref('')
const generatedOtp = ref('')
const userUid = ref('')

const togglePassword = () => (passwordVisible.value = !passwordVisible.value)
const toggleConfirmPassword = () => (confirmPasswordVisible.value = !confirmPasswordVisible.value)

const clearFormFields = () => {
  firstName.value = ''
  lastName.value = ''
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  birthDate.value = ''
  termsAccepted.value = false
}

const resetOtpState = () => {
  otpSent.value = false
  otpInput.value = ''
  generatedOtp.value = ''
  userUid.value = ''
}

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

const sendOtpEmail = async (toEmail, otp) => {
  try {
    const res = await axios.post('http://localhost:3000/send-otp', {
      recipient: toEmail,
      otp: otp,
    })
    if (res.data.success) {
      console.log('OTP email sent to:', toEmail)
    } else {
      toast.error('Failed to send OTP email')
    }
  } catch (err) {
    console.error('Error sending OTP email:', err)
    toast.error('Error sending OTP email')
  }
}

const register = async () => {
  if (password.value !== confirmPassword.value) {
    toast.error('Passwords do not match')
    return
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  if (!passwordRegex.test(password.value)) {
    toast.error('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character')
    return
  }

  if (!firstName.value || !lastName.value || !email.value || !password.value || !confirmPassword.value) {
    toast.error('Please fill all required fields')
    return
  }

  if (!termsAccepted.value) {
    toast.error('You must agree to the terms and conditions')
    return
  }

  const birth = new Date(birthDate.value)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }

  if (age < 18) {
    toast.error('You must be at least 18 years old to register')
    return
  }

  isSubmitting.value = true

  try {
    const userCredentials = await createUserWithEmailAndPassword(auth, email.value, password.value)
    const uid = userCredentials.user.uid
    userUid.value = uid

    await setDoc(doc(db, 'users', uid), {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      email: email.value.trim(),
      birthDate: birthDate.value ? new Date(birthDate.value) : null,
      role: 'Customer',
      status: 'Pending',
      createdAt: serverTimestamp(),
    })

    generatedOtp.value = generateOtp()
    await sendOtpEmail(email.value, generatedOtp.value)

    otpSent.value = true
    toast.info('OTP sent to your email. Please verify to complete registration.')

    clearFormFields()
  } catch (err) {
    console.error(err)
    const friendlyMessages = {
      'auth/email-already-in-use': 'An account with this email already exists.',
      'auth/invalid-email': 'Invalid email format.',
      'auth/weak-password': 'Password is too weak.',
    }
    toast.error(friendlyMessages[err.code] || 'Failed to register, please try again')
  } finally {
    isSubmitting.value = false
  }
}

const verifyOtp = async () => {
  if (!otpInput.value || otpInput.value.trim() === '') {
    toast.error('Please enter your OTP')
    return
  }

  if (otpInput.value === generatedOtp.value) {
    try {
      if (!userUid.value) {
        toast.error('User ID not found. Please register again.')
        return
      }

      await updateDoc(doc(db, 'users', userUid.value), {
        status: 'Active',
      })
      toast.success('Email verified! You can now log in.')
      clearFormFields()
      resetOtpState()
      otpSent.value = false

      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      console.error(err)
      toast.error('Failed to verify OTP, please try again')
    }
  } else {
    toast.error('Invalid OTP, please try again')
  }
}
</script>

<template>
  <div class="min-h-[100dvh] bg-gradient-to-br from-cream-50 via-cream-100 to-gold-100 overflow-x-hidden no-scrollbar relative">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-gold-200/40 blur-3xl"></div>
      <div class="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-cream-300/40 blur-3xl"></div>
    </div>

    <nav class="fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-cream-50/95 via-cream-100/95 to-gold-50/95 backdrop-blur-md border-b border-gold-200/70 shadow-[0_6px_18px_rgba(54,34,22,0.08)]">
      <div class="relative max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <router-link to="/" class="flex items-center gap-2 text-charcoal-700 hover:text-gold-700 transition-colors rounded-md px-2 py-1 hover:bg-gold-100/70">
          <svg class="hidden lg:block w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          <svg class="w-5 h-5 lg:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10.5l9-7 9 7M5.25 9.75V20.25H18.75V9.75" />
          </svg>
        </router-link>

        <span class="nav-brand absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-lg sm:text-xl tracking-wide">AesthetiCare</span>
        <div class="w-8"></div>
      </div>
    </nav>

    <div class="relative z-10 flex items-center justify-center px-4 pt-24 pb-12 text-sm">
      <div class="relative w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[60%_40%] rounded-3xl overflow-hidden bg-white/68 backdrop-blur-xl border border-gold-200/60 shadow-2xl shadow-gold-900/15">
        <div class="register-form-panel relative z-10 flex items-center justify-center px-4 pt-10 pb-10 sm:px-8">
          <span class="form-side-bubble f-bubble-1 hidden lg:block" aria-hidden="true"></span>
          <span class="form-side-bubble f-bubble-2 hidden lg:block" aria-hidden="true"></span>
          <span class="form-side-bubble f-bubble-3 hidden lg:block" aria-hidden="true"></span>

          <form class="space-y-4 w-full max-w-[560px]" @submit.prevent="register">
            <div class="mb-2">
              <h1 class="register-title text-3xl sm:text-4xl leading-tight">Create Account</h1>
              <p class="text-charcoal-600 text-sm mt-1">Build your AesthetiCare profile and start booking with confidence.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="relative">
                <input v-model="firstName" placeholder=" " required class="peer input h-16 px-4 pt-5" />
                <label class="floating-label">First Name</label>
              </div>
              <div class="relative">
                <input v-model="lastName" placeholder=" " required class="peer input h-16 px-4 pt-5" />
                <label class="floating-label">Last Name</label>
              </div>
            </div>

            <div class="relative">
              <input type="date" v-model="birthDate" class="peer input h-16 px-4 pt-6 birth-input" />
              <label class="floating-label floating-label-raised">Birth Date</label>
            </div>

            <div class="relative">
              <input v-model="email" type="email" required placeholder=" " class="peer input h-16 px-4 pt-5" />
              <label class="floating-label">Email Address</label>
            </div>

            <div class="relative">
              <input :type="passwordVisible ? 'text' : 'password'" v-model="password" required placeholder=" " class="peer input h-16 px-4 pr-12 pt-5" />
              <label class="floating-label">Password</label>
              <button type="button" @click="togglePassword" class="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 hover:text-gold-700" tabindex="-1">
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

            <div class="relative">
              <input :type="confirmPasswordVisible ? 'text' : 'password'" v-model="confirmPassword" required placeholder=" " class="peer input h-16 px-4 pr-12 pt-5" />
              <label class="floating-label">Confirm Password</label>
              <button type="button" @click="toggleConfirmPassword" class="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 hover:text-gold-700" tabindex="-1">
                <svg v-if="!confirmPasswordVisible" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.956 9.956 0 012.1-3.592M6.18 6.18A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
                </svg>
                <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>

            <label class="flex items-center gap-2 text-charcoal-600 text-sm">
              <input type="checkbox" v-model="termsAccepted" required class="accent-gold-700" />
              I agree to the <a href="#" @click.prevent="showTerms = true" class="text-gold-700 hover:underline">terms and conditions</a>
            </label>

            <button type="submit" :disabled="isSubmitting" class="w-full py-3 rounded-xl bg-gold-700 text-white font-semibold text-base hover:bg-gold-800 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100">
              {{ isSubmitting ? 'Registering...' : 'Create Account' }}
            </button>

            <div class="text-center text-sm">
              <router-link to="/login" class="text-gold-700 hover:text-gold-800 font-montserrat">
                Already have an account?
                <span class="underline underline-offset-4">Sign in here</span>
              </router-link>
            </div>
          </form>
        </div>

        <div class="register-visual relative hidden lg:flex items-center justify-center overflow-hidden">
          <div class="visual-orb orb-1"></div>
          <div class="visual-orb orb-2"></div>
          <div class="visual-orb orb-3"></div>

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
        </div>
      </div>

      <Modal panelClass="bg-white" :isOpen="otpSent" :title="'Verify OTP'" @close="otpSent = false" :showConfirm="false">
        <div class="space-y-4">
          <p class="text-sm text-charcoal-600">
            We've sent a One-Time Password (OTP) to your email. Please enter it below to verify your account.
          </p>

          <input v-model="otpInput" type="text" maxlength="6" placeholder="Enter 6-digit OTP" class="input h-12 px-3 text-center tracking-widest font-semibold" />

          <button @click="verifyOtp" class="w-full py-3 rounded-xl bg-gold-700 text-white font-semibold text-base hover:bg-gold-800 hover:scale-[1.02] active:scale-[0.98] transition">
            Verify OTP
          </button>
        </div>
      </Modal>

      <Modal panelClass="bg-white" :isOpen="showTerms" :title="'Terms and Conditions'" @close="showTerms = false" :showConfirm="false">
        <Terms />
      </Modal>
    </div>
  </div>
</template>

<style scoped>
.no-scrollbar {
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.nav-brand {
  font-family: "Playfair Display", "Times New Roman", serif;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: linear-gradient(120deg, #3c2519 0%, #9f6946 42%, #c99673 70%, #744a33 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.register-title {
  font-family: "Playfair Display", "Times New Roman", serif;
  font-weight: 700;
  letter-spacing: 0.02em;
  background: linear-gradient(120deg, #4a2c1e 0%, #996341 40%, #c89066 72%, #7b4e35 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.register-form-panel {
  overflow: hidden;
}

.form-side-bubble {
  position: absolute;
  right: 8px;
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
  right: -2px;
  animation-delay: 1.4s;
}

.f-bubble-3 {
  width: 40px;
  height: 40px;
  top: 74%;
  right: 12px;
  animation-delay: 2.1s;
}

.register-visual {
  background: radial-gradient(circle at 18% 20%, rgba(230, 193, 150, 0.35), transparent 42%),
    linear-gradient(145deg, #f8e5bd 0%, #e6c196 45%, #c6946c 100%);
  background-size: 140% 140%;
  animation: visualFlow 16s ease-in-out infinite alternate;
  clip-path: polygon(14% 0, 100% 0, 100% 100%, 0 100%);
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

.bubble-1 {
  width: 62px;
  height: 62px;
  left: 12px;
  top: 18%;
  animation-delay: 0s;
}

.bubble-2 {
  width: 46px;
  height: 46px;
  left: 36px;
  top: 38%;
  animation-delay: 1.2s;
}

.bubble-3 {
  width: 54px;
  height: 54px;
  left: 10px;
  top: 54%;
  animation-delay: 2s;
}

.bubble-4 {
  width: 68px;
  height: 68px;
  left: 18px;
  top: 70%;
  animation-delay: 0.6s;
}

.bubble-5 {
  width: 40px;
  height: 40px;
  left: 28px;
  top: 84%;
  animation-delay: 1.6s;
}

.bubble-6 {
  width: 34px;
  height: 34px;
  left: 54px;
  top: 26%;
  animation-delay: 2.6s;
}

.input {
  width: 100%;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(232, 167, 58, 0.35);
  color: #333;
  line-height: 1.25rem;
  vertical-align: middle;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.input:focus {
  border-color: #c9a24d;
  box-shadow: 0 0 0 3px rgba(201, 162, 77, 0.25);
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

.floating-label-raised {
  top: 0.7rem;
  transform: translateY(0);
  font-size: 0.75rem;
  color: #8c5a3a;
}

.birth-input {
  color: #6b4a34;
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
  50% { transform: translate3d(6px, -12px, 0) scale(1.06); opacity: 1; }
}

@keyframes bubbleDriftSoft {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.6; }
  50% { transform: translate3d(-4px, -8px, 0) scale(1.04); opacity: 0.82; }
}

@media (max-width: 1023px) {
  .register-visual {
    display: none;
  }
  .register-form-panel {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

@media (max-width: 767px) {
  .register-title {
    font-size: 2rem;
  }
}
</style>
