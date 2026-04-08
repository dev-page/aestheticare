<template>
  <div class="flex customer-theme bg-slate-900 min-h-screen">
    <CustomerSidebar />

    <main class="flex-1 flex items-center justify-center p-8">
      <div class="bg-[#2a180f] rounded-xl p-6 border border-[#4b2f1c] w-full max-w-3xl">
        <div class="flex flex-col items-center mb-6">
          <div class="relative w-32 h-32 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center">
            <img v-if="customer.profilePicture" :src="customer.profilePicture" alt="Customer profile" class="w-full h-full object-cover" />
            <span v-else class="text-white font-bold text-3xl">{{ fullName ? fullName.charAt(0) : 'U' }}</span>
          </div>
          <label class="mt-3 cursor-pointer text-sm text-amber-200 hover:text-amber-100 transition-colors">
            Upload Profile Picture
            <input type="file" @change="handleFileUpload" class="hidden" />
          </label>
        </div>

        <form @submit.prevent="saveCustomerProfile" class="space-y-4">
          <div>
            <label class="block text-amber-100 text-sm mb-1">First Name</label>
            <input v-model="customer.firstName" type="text" class="w-full rounded-lg p-3 bg-[#3a2417] border border-[#5a3927] text-cream-50" />
          </div>

          <div>
            <label class="block text-amber-100 text-sm mb-1">Last Name</label>
            <input v-model="customer.lastName" type="text" class="w-full rounded-lg p-3 bg-[#3a2417] border border-[#5a3927] text-cream-50" />
          </div>

          <div>
            <label class="block text-amber-100 text-sm mb-1">Email</label>
            <input v-model="customer.email" type="email" class="w-full rounded-lg p-3 bg-[#3a2417] border border-[#5a3927] text-cream-50" />
          </div>

          <div>
            <label class="block text-amber-100 text-sm mb-1">Phone Number</label>
            <input v-model="customer.contactNumber" type="tel" class="w-full rounded-lg p-3 bg-[#3a2417] border border-[#5a3927] text-cream-50" />
          </div>

          <div>
            <label class="block text-amber-100 text-sm mb-1">Address</label>
            <textarea v-model="customer.address" rows="3" class="w-full rounded-lg p-3 bg-[#3a2417] border border-[#5a3927] text-cream-50 resize-none"></textarea>
          </div>

          <div>
            <label class="block text-amber-100 text-sm mb-1">Bio</label>
            <textarea v-model="customer.bio" rows="4" class="w-full rounded-lg p-3 bg-[#3a2417] border border-[#5a3927] text-cream-50 resize-none"></textarea>
          </div>

          <button type="submit" class="w-full bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold py-3 rounded-lg transition-colors">
            Save Changes
          </button>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/config/firebaseConfig'
import CustomerSidebar from '@/components/sidebar/CustomerSidebar.vue'
import { toast } from 'vue3-toastify'

const customer = ref({
  firstName: '',
  lastName: '',
  email: '',
  contactNumber: '',
  address: '',
  bio: '',
  profilePicture: '',
})

const fullName = computed(() => `${customer.value.firstName || ''} ${customer.value.lastName || ''}`.trim())

const handleFileUpload = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (loadEvent) => {
    customer.value.profilePicture = loadEvent.target?.result || ''
  }
  reader.readAsDataURL(file)
}

const loadCustomerProfile = async () => {
  const user = auth.currentUser
  if (!user) return

  try {
    const userRef = doc(db, 'users', user.uid)
    const userSnap = await getDoc(userRef)
    if (userSnap.exists()) {
      customer.value = { ...customer.value, ...userSnap.data(), email: user.email || '' }
    } else {
      await setDoc(userRef, {
        ...customer.value,
        email: user.email || '',
        role: 'Customer',
        createdAt: serverTimestamp(),
      })
      customer.value.email = user.email || ''
    }
  } catch (error) {
    console.error(error)
    toast.error('Failed to load profile.')
  }
}

const saveCustomerProfile = async () => {
  const user = auth.currentUser
  if (!user) {
    toast.error('User not authenticated.')
    return
  }

  try {
    await updateDoc(doc(db, 'users', user.uid), {
      firstName: customer.value.firstName || '',
      lastName: customer.value.lastName || '',
      email: customer.value.email || '',
      contactNumber: customer.value.contactNumber || '',
      address: customer.value.address || '',
      bio: customer.value.bio || '',
      profilePicture: customer.value.profilePicture || '',
      updatedAt: serverTimestamp(),
    })
    toast.success('Profile updated successfully.')
  } catch (error) {
    console.error(error)
    toast.error('Failed to save profile.')
  }
}

onMounted(loadCustomerProfile)
</script>

<style scoped>
input[type="file"]::file-selector-button {
  display: none;
}
</style>
