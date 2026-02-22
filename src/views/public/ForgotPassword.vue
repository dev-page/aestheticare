<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '@/config/firebaseConfig'
import { sendPasswordResetEmail } from 'firebase/auth'
import { collection, query, where, getDocs } from 'firebase/firestore'
import axios from 'axios'
import { toast } from 'vue3-toastify'

const router = useRouter()

const step = ref(1)
const email = ref('')
const otpInput = ref('')
const generatedOtp = ref('')
const newPassword = ref('')
const confirmPassword = ref('')

const cancelReset = () => {
  router.push('/login')
}

const sendOtp = async () => {
  if (!email.value) {
    toast.error('Please enter your email.')
    return
  }

  try {
    const userRef = collection(db, 'users')
    const q = query(userRef, where('email', '==', email.value.trim()))
    const querySnapshot = await getDocs(q)

    if (querySnapshot.empty) {
      toast.error('Email not found in our records.')
      return
    }

    generatedOtp.value = Math.floor(100000 + Math.random() * 900000).toString()
    await axios.post('http://localhost:3000/send-otp', {
      recipient: email.value,
      otp: generatedOtp.value,
    })
    toast.info('OTP sent to your email.')
    step.value = 2
  } catch (err) {
    console.error(err)
    toast.error('Error checking email.')
  }
}

const verifyOtp = () => {
  if (otpInput.value === generatedOtp.value) {
    toast.success('OTP verified! You can now reset your password.')
    step.value = 3
  } else {
    toast.error('Invalid OTP.')
  }
}

const resetPassword = async () => {
  if (!newPassword.value || newPassword.value !== confirmPassword.value) {
    toast.error('Passwords do not match.')
    return
  }
  try {
    await sendPasswordResetEmail(auth, email.value)
    toast.success('Password reset email sent. Please check your inbox.')
    step.value = 1
    email.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    otpInput.value = ''
    generatedOtp.value = ''
    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (err) {
    console.error(err)
    toast.error('Error resetting password.')
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-gold-100 via-cream-200 to-rose-100">
    <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
      <h2 class="text-xl font-semibold text-gold-700 mb-4">
        Recover Account
      </h2>

      <!-- Step 1: Enter Email -->
      <div v-if="step === 1" class="space-y-4">
        <p class="text-sm text-gray-600">Enter your registered email address to receive an OTP.</p>
        <input
          v-model="email"
          type="email"
          placeholder="Email Address"
          class="w-full border rounded px-3 py-2"
        />

        <div class="flex gap-2">
          <button
            @click="cancelReset"
            class="w-full py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            @click="sendOtp"
            class="w-full py-2 bg-gold-700 text-white rounded hover:bg-gold-800"
          >
            Send OTP
          </button>
        </div>
      </div>

      <!-- Step 2: Verify OTP -->
      <div v-if="step === 2" class="space-y-4">
        <p class="text-sm text-gray-600">We sent an OTP to <strong>{{ email }}</strong>. Enter it below to verify.</p>
        <input
          v-model="otpInput"
          type="text"
          maxlength="6"
          placeholder="Enter OTP"
          class="w-full border rounded px-3 py-2 text-center tracking-widest font-semibold"
        />

        <div class="flex gap-2">
          <button
            @click="cancelReset"
            class="w-full py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            @click="verifyOtp"
            class="w-full py-2 bg-gold-700 text-white rounded hover:bg-gold-800"
          >
            Verify OTP
          </button>
        </div>
      </div>

      <!-- Step 3: Reset Password -->
      <div v-if="step === 3" class="space-y-4">
        <p class="text-sm text-gray-600">Enter your new password below.</p>
        <input
          v-model="newPassword"
          type="password"
          placeholder="New Password"
          class="w-full border rounded px-3 py-2"
        />
        <input
          v-model="confirmPassword"
          type="password"
          placeholder="Confirm Password"
          class="w-full border rounded px-3 py-2"
        />

        <div class="flex gap-2">
          <button
            @click="cancelReset"
            class="w-full py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            @click="resetPassword"
            class="w-full py-2 bg-gold-700 text-white rounded hover:bg-gold-800"
          >
            Reset Password
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>