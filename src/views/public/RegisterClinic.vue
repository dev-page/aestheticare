<script setup>
import { ref, computed } from 'vue'
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
const birthDate = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

const contactNumber = ref('')
const clinicName = ref('')
const clinicLocation = ref('')

const isSubmitting = ref(false)
const passwordVisible = ref(false)
const confirmPasswordVisible = ref(false)
const showTerms = ref(false)
const termsAccepted = ref(false)

const otpSent = ref(false)
const otpInput = ref('')
const generatedOtp = ref('')
const userUid = ref('')

const calendarOpen = ref(false)
const calendarMonth = ref(new Date().getMonth())
const calendarYear = ref(new Date().getFullYear())
const monthMenuOpen = ref(false)
const yearMenuOpen = ref(false)

const monthNames = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]
const weekDays = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const yearOptions = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i)

const calendarLabelActive = computed(() => !!birthDate.value)
const displayBirthDate = computed(() =>
  birthDate.value ? new Date(birthDate.value).toLocaleDateString() : ''
)
const selectedMonthLabel = computed(() => monthNames[calendarMonth.value])

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(calendarYear.value, calendarMonth.value, 1)
  const lastDay = new Date(calendarYear.value, calendarMonth.value + 1, 0)

  // Leading blanks
  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push({ day: '', iso: `blank-${i}`, inCurrentMonth: false })
  }

  // Actual days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const iso = `${calendarYear.value}-${String(calendarMonth.value+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    days.push({
      day: d,
      iso,
      inCurrentMonth: true
    })
  }
  return days
})

const toggleCalendar = () => { calendarOpen.value = !calendarOpen.value }
const previousMonth = () => {
  if (calendarMonth.value === 0) {
    calendarMonth.value = 11
    calendarYear.value--
  } else {
    calendarMonth.value--
  }
}
const nextMonth = () => {
  if (calendarMonth.value === 11) {
    calendarMonth.value = 0
    calendarYear.value++
  } else {
    calendarMonth.value++
  }
}
const toggleMonthMenu = () => { monthMenuOpen.value = !monthMenuOpen.value }
const toggleYearMenu = () => { yearMenuOpen.value = !yearMenuOpen.value }
const selectMonth = (index) => {
  calendarMonth.value = index
  monthMenuOpen.value = false
}
const selectYear = (year) => {
  calendarYear.value = year
  yearMenuOpen.value = false
}

const selectDate = (dayObj) => {
  if (!dayObj.inCurrentMonth || !dayObj.day) return
  birthDate.value = `${calendarYear.value}-${String(calendarMonth.value+1).padStart(2,'0')}-${String(dayObj.day).padStart(2,'0')}`
  calendarOpen.value = false
}
const isSelectedDate = (dayObj) => {
  return birthDate.value && dayObj.iso === birthDate.value
}
const isToday = (dayObj) => {
  const today = new Date()
  return (
    dayObj.day === today.getDate() &&
    calendarMonth.value === today.getMonth() &&
    calendarYear.value === today.getFullYear()
  )
}


const togglePassword = () => (passwordVisible.value = !passwordVisible.value)
const toggleConfirmPassword = () => (confirmPasswordVisible.value = !confirmPasswordVisible.value)

const clearFormFields = () => {
  firstName.value = ''
  lastName.value = ''
  email.value = ''
  password.value = ''
  confirmPassword.value = ''
  birthDate.value = ''
  contactNumber.value = ''
  clinicName.value = ''
  clinicLocation.value = ''
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
    return res.data
  } catch (err) {
    console.error('Error sending OTP email:', err.response?.data || err.message)
    return { success: false, error: err.message }
  }
}

const registerClinic = async () => {
  if (!termsAccepted.value) {
    toast.error('You must agree to the terms and conditions')
    return
  }

  if (password.value !== confirmPassword.value) {
    toast.error('Passwords do not match')
    return
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  if (!passwordRegex.test(password.value)) {
    toast.error('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character')
    return
  }

  if (!firstName.value || !lastName.value || !email.value || !clinicName.value || !clinicLocation.value || !contactNumber.value || !password.value || !confirmPassword.value) {
    toast.error('Please fill all required fields')
    return
  }

  const phoneRegex = /^[0-9]{10}$/
  if (!phoneRegex.test(contactNumber.value)) {
    toast.error('Contact number must be 10 digits after +63')
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
    userUid.value = userCredentials.user.uid

    // 🔹 Immediately store data in Firestore with status "Pending"
    await setDoc(doc(db, 'users', userUid.value), {
      firstName: firstName.value.trim(),
      lastName: lastName.value.trim(),
      birthDate: birthDate.value ? new Date(birthDate.value) : null,
      email: email.value.trim(),
      contactNumber: `0${contactNumber.value.trim()}`,
      role: 'Owner',
      status: 'Pending',
      createdAt: serverTimestamp(),
    })

    await setDoc(doc(db, 'clinics', userUid.value), {
      branchId: userUid.value,
      clinicName: clinicName.value.trim(),
      clinicLocation: clinicLocation.value.trim(),
      clinicBranch: 'Main Branch',
      ownerId: userUid.value,
      createdAt: serverTimestamp(),
    })

    // 🔹 Generate and send OTP
    generatedOtp.value = generateOtp()
    const result = await sendOtpEmail(email.value, generatedOtp.value)

    if (result.success) {
      otpSent.value = true
      toast.info('OTP sent to your email. Please verify to activate your account.')
    } else {
      toast.error(result.error || 'Failed to send OTP email. Please try again.')
      resetOtpState()
    }
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

      // 🔹 Update status to "Active" after OTP verification
      await updateDoc(doc(db, 'users', userUid.value), {
        status: 'Active',
      })

      toast.success('Email verified! Your account is now active. You can log in.')
      clearFormFields()
      resetOtpState()
      otpSent.value = false

      setTimeout(() => {
        router.push("/login")
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
  <div class="min-h-[100dvh] lg:h-screen bg-gradient-to-br from-cream-50 via-cream-100 to-gold-100 overflow-x-hidden no-scrollbar lg:overflow-hidden relative">
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

    <div class="relative z-10 flex items-center justify-center px-4 pt-24 pb-8 lg:pt-20 lg:pb-2 lg:min-h-[calc(100dvh-4rem)] text-sm">
      <div class="register-clinic-card relative w-full max-w-6xl rounded-3xl overflow-hidden bg-white/68 backdrop-blur-xl border border-gold-200/60 shadow-2xl shadow-gold-900/15 lg:h-[calc(100dvh-5rem)]">
        <div class="compact-desktop register-form-panel relative z-10 flex items-center justify-center h-full px-4 pt-8 pb-8 lg:pt-3 lg:pb-3 sm:px-8">
          <span class="form-side-bubble f-bubble-1 hidden lg:block" aria-hidden="true"></span>
          <span class="form-side-bubble f-bubble-2 hidden lg:block" aria-hidden="true"></span>
          <span class="form-side-bubble f-bubble-3 hidden lg:block" aria-hidden="true"></span>

          <form class="space-y-4 w-full max-w-[560px] pt-3 lg:pt-5" @submit.prevent="registerClinic">
            <div class="intro-block mb-6">
              <h1 class="register-title text-3xl sm:text-4xl leading-tight">Create Account</h1>
              <p class="text-charcoal-600 text-sm mt-1">Build your AesthetiCare profile and start booking with confidence.</p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="relative">
                <input v-model="firstName" placeholder=" " required class="peer input h-16 pt-4 pb-2 px-3" />
                <label class="floating-label">First Name</label>
              </div>
              <div class="relative">
                <input v-model="lastName" placeholder=" " required class="peer input h-16 pt-4 pb-2 px-3" />
                <label class="floating-label">Last Name</label>
              </div>
            </div>

            <div class="relative">
              <div ref="calendarRef" class="calendar-wrapper" @click.stop>
                <button type="button" @click.stop="toggleCalendar" class="peer input h-16 pt-4 pb-2 px-3 pr-12 text-left birth-display"
                  :class="{ 'birth-display-active': calendarLabelActive }">
                  {{ displayBirthDate || 'mm/dd/yyyy' }}
                </button>
                <label class="floating-label" :class="{ 'floating-label-raised': calendarLabelActive }">Birth Date</label>
                <button type="button" @click.stop="toggleCalendar"
                  class="calendar-toggle absolute right-4 top-1/2 -translate-y-1/2 text-charcoal-700 hover:text-gold-700">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M8 7V3m8 4V3m-9 8h10m-11 9h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v11a2 2 0 002 2z" />
                  </svg>
                </button>

                <transition name="calendar-fade">
                  <div v-if="calendarOpen" class="calendar-popover">
                    <div class="calendar-header">
                      <button type="button" @click="previousMonth" class="calendar-nav-btn" aria-label="Previous month">&#8249;</button>
                      <div class="calendar-select-group">
                        <div class="calendar-select-wrap">
                          <button type="button" class="calendar-select" @click="toggleMonthMenu" :aria-expanded="monthMenuOpen">
                            {{ selectedMonthLabel }}
                          </button>
                          <div v-if="monthMenuOpen" class="calendar-menu">
                            <button
                              v-for="(month, index) in monthNames"
                              :key="month"
                              type="button"
                              class="calendar-menu-item"
                              :class="{ 'calendar-menu-item-active': index === calendarMonth }"
                              @click="selectMonth(index)"
                            >
                              {{ month }}
                            </button>
                          </div>
                        </div>

                        <div class="calendar-select-wrap">
                          <button type="button" class="calendar-select calendar-year-select" @click="toggleYearMenu" :aria-expanded="yearMenuOpen">
                            {{ calendarYear }}
                          </button>
                          <div v-if="yearMenuOpen" class="calendar-menu calendar-menu-year">
                            <button
                              v-for="year in yearOptions"
                              :key="year"
                              type="button"
                              class="calendar-menu-item"
                              :class="{ 'calendar-menu-item-active': year === calendarYear }"
                              @click="selectYear(year)"
                            >
                              {{ year }}
                            </button>
                          </div>
                        </div>
                      </div>
                      <button type="button" @click="nextMonth" class="calendar-nav-btn" aria-label="Next month">&#8250;</button>
                    </div>
                    <div class="calendar-weekdays">
                      <span v-for="day in weekDays" :key="day">{{ day }}</span>
                    </div>
                    <div class="calendar-grid">
                      <button
                        v-for="dayObj in calendarDays"
                        :key="dayObj.iso"
                        type="button"
                        @click="selectDate(dayObj)"
                        class="calendar-day"
                        :class="{
                          'calendar-day-other': !dayObj.inCurrentMonth,
                          'calendar-day-selected': isSelectedDate(dayObj),
                          'calendar-day-today': isToday(dayObj) && !isSelectedDate(dayObj),
                        }"
                      >
                        {{ dayObj.day }}
                      </button>
                    </div>
                  </div>
                </transition>
              </div>
            </div>

            <div class="relative">
              <input v-model="email" type="email" required placeholder=" " class="peer input h-16 pt-4 pb-2 px-3" />
              <label class="floating-label">Email Address</label>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="relative">
                <input :type="passwordVisible ? 'text' : 'password'" v-model="password" required placeholder=" " class="peer input h-16 pt-4 pb-2 px-3" />
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
                <input :type="confirmPasswordVisible ? 'text' : 'password'" v-model="confirmPassword" required placeholder=" " class="peer input h-16 pt-4 pb-2 px-3" />
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
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="relative">
                <input v-model="clinicName" placeholder=" " required class="peer input h-16 pt-4 pb-2 px-3" />
                <label class="floating-label">Clinic Name</label>
              </div>
              <div class="relative">
                <input v-model="clinicLocation" placeholder=" " required class="peer input h-16 pt-4 pb-2 px-3" />
                <label class="floating-label">Clinic Location</label>
              </div>
            </div>

            <div class="relative">
              <div class="flex items-center rounded-xl border border-[rgba(232,167,58,0.35)] bg-white/45 focus-within:border-gold-700">
                <span class="inline-flex items-center px-3 text-charcoal-700 select-none">+63</span>
                <input v-model="contactNumber" type="tel" placeholder=" " required class="peer flex-1 h-16 pt-4 pb-2 px-3 bg-transparent text-charcoal-700 placeholder-transparent focus:outline-none"/>
                <label class="floating-label contact-label">Contact Number</label>
              </div>
            </div>

            <label class="terms-row flex items-center gap-2 text-charcoal-600 text-sm">
              <input type="checkbox" v-model="termsAccepted" required class="accent-gold-700" />
              I agree to the <a href="#" @click.prevent="showTerms = true" class="text-gold-700 hover:underline">terms and conditions</a>
            </label>

            <button type="submit" :disabled="isSubmitting" class="cta-row h-14 lg:h-12 w-full py-3 rounded-xl bg-gold-700 text-white font-semibold text-base hover:bg-gold-800 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-60 disabled:cursor-not-allowed">
              {{ isSubmitting ? 'Registering...' : 'Create Account' }}
            </button>
          </form>
        </div>

        <div class="register-visual register-visual-pane relative items-center justify-center h-full overflow-hidden">
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

          <input v-model="otpInput" type="text" maxlength="6" placeholder="Enter 6-digit OTP" class="input otp-input h-12 px-3 text-center tracking-widest font-semibold" />

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

.register-clinic-card {
  display: grid;
  grid-template-columns: 1fr;
}

.register-form-panel {
  overflow: hidden;
}

.register-visual-pane {
  display: none;
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

.f-bubble-1 { width: 44px; height: 44px; top: 22%; animation-delay: 0.5s; }
.f-bubble-2 { width: 58px; height: 58px; top: 48%; right: -2px; animation-delay: 1.4s; }
.f-bubble-3 { width: 40px; height: 40px; top: 74%; right: 12px; animation-delay: 2.1s; }

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
.orb-1 { width: 360px; height: 360px; top: -140px; right: -120px; }
.orb-2 { width: 280px; height: 280px; bottom: -110px; right: 20px; }
.orb-3 { width: 220px; height: 220px; top: 18%; left: -90px; }

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
.layer-1 { top: 92px; }
.layer-2 { top: 122px; left: 58px; opacity: 0.82; }
.layer-3 { top: 152px; left: 76px; opacity: 0.6; }

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
.dot-1 { width: 14px; height: 14px; top: 70px; left: 50px; }
.dot-2 { width: 10px; height: 10px; bottom: 92px; left: 100px; }
.dot-3 { width: 8px; height: 8px; top: 126px; right: 90px; }

.space-comet {
  position: absolute;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 248, 235, 0), rgba(255, 248, 235, 0.95));
  animation: cometDrift 4.4s ease-in-out infinite;
}
.comet-1 { width: 82px; top: 108px; left: 72px; --comet-rot: -26deg; }
.comet-2 { width: 66px; bottom: 76px; right: 72px; --comet-rot: 24deg; animation-delay: 0.9s; }

.side-bubble {
  position: absolute;
  border-radius: 999px;
  border: 1px solid rgba(255, 248, 235, 0.78);
  background: radial-gradient(circle at 30% 28%, rgba(255, 250, 241, 0.95), rgba(225, 185, 142, 0.75));
  box-shadow: 0 10px 22px rgba(54, 34, 22, 0.16);
  animation: bubbleDrift 6.2s ease-in-out infinite;
  z-index: 3;
}
.bubble-1 { width: 62px; height: 62px; left: 12px; top: 18%; animation-delay: 0s; }
.bubble-2 { width: 46px; height: 46px; left: 36px; top: 38%; animation-delay: 1.2s; }
.bubble-3 { width: 54px; height: 54px; left: 10px; top: 54%; animation-delay: 2s; }
.bubble-4 { width: 68px; height: 68px; left: 18px; top: 70%; animation-delay: 0.6s; }
.bubble-5 { width: 40px; height: 40px; left: 28px; top: 84%; animation-delay: 1.6s; }
.bubble-6 { width: 34px; height: 34px; left: 54px; top: 26%; animation-delay: 2.6s; }

.input {
  width: 100%;
  padding: 1rem 1rem 0.5rem;
  line-height: 1.25rem;
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.45);
  border: 1px solid rgba(232, 167, 58, 0.35);
  color: #1c1c1c;
  outline: none;
  transition: all 0.2s;
}
.input:focus {
  border-color: #d4af37;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.2);
}
.otp-input::placeholder {
  color: #8c5a3a;
}

.calendar-wrapper {
  position: relative;
}

.birth-display {
  color: #9b7a5f;
}

.birth-display-active {
  color: #6b4a34;
}

.calendar-toggle {
  z-index: 3;
}

.calendar-popover {
  position: absolute;
  left: 0;
  right: 0;
  top: calc(100% + 0.5rem);
  z-index: 30;
  border-radius: 0.9rem;
  border: 1px solid rgba(232, 167, 58, 0.35);
  background: linear-gradient(180deg, rgba(255, 252, 245, 0.98), rgba(248, 234, 206, 0.98));
  box-shadow: 0 16px 36px rgba(54, 34, 22, 0.18);
  padding: 0.75rem;
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.55rem;
}

.calendar-month-title {
  font-family: "Playfair Display", "Times New Roman", serif;
  font-size: 1rem;
  color: #6f3f2a;
  letter-spacing: 0.02em;
}

.calendar-select-group {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.calendar-select-wrap {
  position: relative;
}

.calendar-select {
  min-height: 2.1rem;
  border-radius: 0.6rem;
  border: 1px solid rgba(232, 167, 58, 0.4);
  background: rgba(255, 255, 255, 0.72);
  color: #6f3f2a;
  font-size: 0.86rem;
  font-weight: 600;
  line-height: 1;
  padding: 0.5rem 1.6rem 0.5rem 0.65rem;
  outline: none;
  display: inline-flex;
  align-items: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
  transition: all 0.2s ease;
  background-image:
    linear-gradient(45deg, transparent 50%, #8c5a3a 50%),
    linear-gradient(135deg, #8c5a3a 50%, transparent 50%);
  background-position:
    calc(100% - 12px) calc(50% - 2px),
    calc(100% - 7px) calc(50% - 2px);
  background-size: 5px 5px, 5px 5px;
  background-repeat: no-repeat;
}

.calendar-select:hover {
  border-color: rgba(212, 175, 55, 0.65);
}

.calendar-select:focus {
  border-color: #d4af37;
  box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.18);
}

.calendar-year-select {
  min-width: 5.4rem;
}

.calendar-menu {
  position: absolute;
  top: calc(100% + 0.32rem);
  left: 0;
  z-index: 35;
  min-width: 100%;
  max-height: 11.5rem;
  overflow-y: auto;
  border-radius: 0.65rem;
  border: 1px solid rgba(232, 167, 58, 0.4);
  background: linear-gradient(180deg, rgba(255, 252, 245, 0.99), rgba(248, 234, 206, 0.99));
  box-shadow: 0 10px 26px rgba(54, 34, 22, 0.2);
  padding: 0.2rem;
}

.calendar-menu-year {
  max-height: 12.5rem;
}

.calendar-menu-item {
  width: 100%;
  border-radius: 0.5rem;
  border: none;
  background: transparent;
  color: #6f3f2a;
  text-align: left;
  font-size: 0.82rem;
  padding: 0.42rem 0.52rem;
  transition: all 0.18s ease;
}

.calendar-menu-item:hover {
  background: rgba(255, 245, 228, 0.95);
}

.calendar-menu-item-active {
  background: linear-gradient(120deg, #9f6946 0%, #c99673 100%);
  color: #fff;
}

.calendar-nav-btn {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid rgba(232, 167, 58, 0.4);
  color: #8c5a3a;
  font-size: 1.35rem;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.62);
  transition: all 0.2s ease;
}

.calendar-nav-btn:hover {
  background: rgba(255, 245, 228, 0.96);
  color: #6f3f2a;
  border-color: rgba(212, 175, 55, 0.7);
}

.calendar-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.3rem;
  margin-bottom: 0.3rem;
}

.calendar-weekdays span {
  text-align: center;
  font-size: 0.72rem;
  color: #8c5a3a;
  font-weight: 600;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 0.3rem;
}

.calendar-day {
  height: 2rem;
  border-radius: 0.55rem;
  border: 1px solid transparent;
  color: #6b4a34;
  font-size: 0.82rem;
  background: rgba(255, 255, 255, 0.5);
  transition: all 0.18s ease;
}

.calendar-day:hover {
  border-color: rgba(232, 167, 58, 0.4);
  background: rgba(255, 245, 228, 0.95);
}

.calendar-day-other {
  opacity: 0.45;
}

.calendar-day-today {
  border-color: rgba(212, 175, 55, 0.55);
}

.calendar-day-selected {
  background: linear-gradient(120deg, #9f6946 0%, #c99673 100%);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 6px 16px rgba(111, 63, 42, 0.25);
}

.calendar-fade-enter-active,
.calendar-fade-leave-active {
  transition: all 0.2s ease;
}

.calendar-fade-enter-from,
.calendar-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

.floating-label {
  position: absolute;
  left: 0.75rem;
  top: 0.34rem;
  font-size: 0.67rem;
  color: #8c5a3a;
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
  top: 0.34rem;
  transform: translateY(0);
  font-size: 0.67rem;
  color: #8c5a3a;
}
.floating-label-raised {
  top: 0.38rem !important;
  transform: translateY(0);
  font-size: 0.68rem !important;
  color: #8c5a3a;
}
.contact-label {
  left: 3rem;
}

.terms-row {
  margin-top: 1.15rem !important;
}

.cta-row {
  margin-top: 1.35rem !important;
}

@keyframes visualFlow { 0% { background-position: 0% 0%; } 100% { background-position: 100% 100%; } }
@keyframes orbFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes stackFloat { 0%,100% { transform: rotate(-12deg) translateY(0); } 50% { transform: rotate(-10deg) translateY(-12px); } }
@keyframes layerShimmer { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.08); } }
@keyframes dotPulse { 0%,100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.22); } }
@keyframes cometDrift { 0%,100% { opacity: 0.72; transform: translateX(0) rotate(var(--comet-rot, 0deg)); } 50% { opacity: 1; transform: translateX(10px) rotate(var(--comet-rot, 0deg)); } }
@keyframes bubbleDrift { 0%,100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.9; } 50% { transform: translate3d(6px, -12px, 0) scale(1.06); opacity: 1; } }
@keyframes bubbleDriftSoft { 0%,100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.6; } 50% { transform: translate3d(-4px, -8px, 0) scale(1.04); opacity: 0.82; } }

@media (min-width: 1024px) {
  .register-clinic-card {
    grid-template-columns: 60% 40%;
  }
  .register-form-panel {
    align-items: flex-start;
  }
  .register-visual-pane {
    display: flex;
  }
  .compact-desktop .space-y-4 > * + * {
    margin-top: 0.5rem !important;
  }
  .compact-desktop .gap-4 {
    gap: 0.5rem !important;
  }
  .compact-desktop .h-16 {
    height: 3.2rem !important;
  }
  .compact-desktop .input {
    padding-top: 0.95rem !important;
    padding-bottom: 0.4rem !important;
  }
  .compact-desktop .intro-block {
    margin-top: 1.1rem !important;
  }
  .compact-desktop .terms-row {
    margin-top: 1.2rem !important;
  }
  .compact-desktop .cta-row {
    margin-top: 1.45rem !important;
  }
}

@media (max-width: 1023px) {
  .register-visual-pane {
    display: none;
  }
  .register-form-panel {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

@media (max-width: 640px) {
  .calendar-popover {

    padding: 0.65rem;
  }
  .calendar-select-group {
    gap: 0.35rem;
  }
  .calendar-select {
    font-size: 0.78rem;
    padding: 0.45rem 1.3rem 0.45rem 0.52rem;
  }
  .calendar-menu-item {
    font-size: 0.76rem;
  }
  .calendar-year-select {
    min-width: 4.8rem;
  }
  .calendar-day {
    height: 1.85rem;
    font-size: 0.77rem;
  }
}
</style>
