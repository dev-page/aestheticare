<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '@/config/firebaseConfig'
import { doc, updateDoc } from 'firebase/firestore'
import { toast } from 'vue3-toastify'
import axios from 'axios'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'

const router = useRouter()

// State
const currentPassword = ref('')   // 🔹 Needed for reauthentication
const newPassword = ref('')
const confirmPassword = ref('')
const enteredOtp = ref('')
const generatedOtp = ref('')
const showOtp = ref(false)

const passwordVisible = ref(false)
const confirmPasswordVisible = ref(false)
const currentPasswordVisible = ref(false)

// Toggle eye icons
const togglePassword = () => (passwordVisible.value = !passwordVisible.value)
const toggleConfirmPassword = () => (confirmPasswordVisible.value = !confirmPasswordVisible.value)
const toggleCurrentPassword = () => (currentPasswordVisible.value = !currentPasswordVisible.value)

// Generate OTP
const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString()

// Send OTP via backend API
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

// Password validation
const validatePassword = (pwd) => {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/
  if (!regex.test(pwd)) {
    toast.error('Password must be at least 8 characters and contain uppercase, lowercase, number, and special character')
    return false
  }
  return true
}

// Handle password change flow
const handleChangePassword = async () => {
  if (!showOtp.value) {
    if (!currentPassword.value || !newPassword.value || !confirmPassword.value) {
      toast.error("Please fill in all password fields.")
      return
    }
    if (newPassword.value !== confirmPassword.value) {
      toast.error("Passwords do not match.")
      return
    }
    if (!validatePassword(newPassword.value)) {
      return
    }

    // Generate and send OTP
    generatedOtp.value = generateOtp()
    const result = await sendOtpEmail(auth.currentUser.email, generatedOtp.value)

    if (result.success) {
      showOtp.value = true
      toast.info("OTP sent to your email. Please verify.")
    } else {
      toast.error(result.error || "Failed to send OTP email.")
    }
    return
  }

  if (enteredOtp.value !== generatedOtp.value) {
    toast.error("Invalid OTP.")
    return
  }

  try {
    const user = auth.currentUser

    // 🔹 Reauthenticate first
    const credential = EmailAuthProvider.credential(user.email, currentPassword.value)
    await reauthenticateWithCredential(user, credential)

    // 🔹 Then update password
    await updatePassword(user, newPassword.value)

    await updateDoc(doc(db, "users", user.uid), { mustChangePassword: false })

    toast.success("Password changed successfully. Please log in again.")
    await auth.signOut()
    router.push('/login')
  } catch (err) {
    console.error(err)
    toast.error("Failed to change password: " + err.message)
  }
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen bg-slate-900 text-white">
    <h1 class="text-2xl font-bold mb-6">Change Password</h1>

    <div class="w-full max-w-sm space-y-4">
      <!-- Current Password -->
      <div class="relative">
        <input
          :type="currentPasswordVisible ? 'text' : 'password'"
          v-model="currentPassword"
          required
          placeholder=" "
          class="peer input h-16 px-4 pr-12 pt-5 w-full rounded bg-slate-800 text-white"
        />
        <label class="floating-label">Current Password</label>
        <button type="button" @click="toggleCurrentPassword"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 hover:text-gold-700" tabindex="-1">
          <svg v-if="!currentPasswordVisible" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.956 9.956 0 012.1-3.592M6.18 6.18A9.956 9.956 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18"/>
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
          </svg>
        </button>
      </div>

      <!-- New Password -->
      <div class="relative">
        <input
          :type="passwordVisible ? 'text' : 'password'"
          v-model="newPassword"
          required
          placeholder=" "
          class="peer input h-16 px-4 pr-12 pt-5 w-full rounded bg-slate-800 text-white"
        />
        <label class="floating-label">New Password</label>
        <button type="button" @click="togglePassword"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 hover:text-gold-700" tabindex="-1">
          <!-- Eye icons same as above -->
        </button>
      </div>

      <!-- Confirm Password -->
      <div class="relative">
        <input
          :type="confirmPasswordVisible ? 'text' : 'password'"
          v-model="confirmPassword"
          required
          placeholder=" "
          class="peer input h-16 px-4 pr-12 pt-5 w-full rounded bg-slate-800 text-white"
        />
        <label class="floating-label">Confirm Password</label>
        <button type="button" @click="toggleConfirmPassword"
          class="absolute right-4 top-1/2 -translate-y-1/2 text-rose-500 hover:text-gold-700" tabindex="-1">
          <!-- Eye icons same as above -->
        </button>
      </div>

      <!-- OTP -->
      <div v-if="showOtp">
        <label class="block text-sm mb-1">Enter OTP</label>
        <input v-model="enteredOtp" placeholder="Enter OTP" class="w-full p-2 rounded bg-slate-800 text-white" />
      </div>

      <button @click="handleChangePassword" class="w-full px-4 py-2 bg-blue-600 rounded">
        Change Password
      </button>
    </div>
  </div>
</template>