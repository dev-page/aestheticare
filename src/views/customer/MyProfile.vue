<template>
  <div class="profile-shell flex customer-theme min-h-screen">
    <CustomerSidebar />

    <main class="profile-main flex-1 flex items-center justify-center p-6 md:p-8">
      <div class="profile-panel w-full max-w-3xl">
        <div class="profile-avatar-block flex flex-col items-center mb-6">
          <div class="profile-avatar relative w-32 h-32 rounded-full overflow-hidden flex items-center justify-center">
            <img v-if="customer.profilePicture" :src="customer.profilePicture" alt="Customer profile" class="w-full h-full object-cover" />
            <span v-else class="profile-avatar-fallback">{{ fullName ? fullName.charAt(0) : 'U' }}</span>
          </div>
          <label class="profile-upload-label mt-3 cursor-pointer text-sm transition-colors">
            Upload Profile Picture
            <input type="file" @change="handleFileUpload" class="hidden" />
          </label>
        </div>

        <form @submit.prevent="saveCustomerProfile" class="space-y-4">
          <div>
            <label class="profile-field-label block mb-1">First Name</label>
            <input v-model="customer.firstName" type="text" class="profile-input w-full rounded-lg p-3" />
          </div>

          <div>
            <label class="profile-field-label block mb-1">Last Name</label>
            <input v-model="customer.lastName" type="text" class="profile-input w-full rounded-lg p-3" />
          </div>

          <div>
            <label class="profile-field-label block mb-1">Email</label>
            <input v-model="customer.email" type="email" class="profile-input w-full rounded-lg p-3" />
          </div>

          <div>
            <label class="profile-field-label block mb-1">Phone Number</label>
            <input
              v-model="customer.contactNumber"
              type="tel"
              inputmode="numeric"
              maxlength="10"
              @input="customer.contactNumber = sanitizePhone(customer.contactNumber)"
              class="profile-input w-full rounded-lg p-3"
            />
          </div>

          <div>
            <label class="profile-field-label block mb-1">Address</label>
            <textarea v-model="customer.address" rows="3" class="profile-input profile-textarea w-full rounded-lg p-3"></textarea>
          </div>

          <div>
            <label class="profile-field-label block mb-1">Bio</label>
            <textarea v-model="customer.bio" rows="4" class="profile-input profile-textarea w-full rounded-lg p-3"></textarea>
          </div>

          <button type="submit" class="profile-save-button w-full font-semibold py-3 rounded-lg transition-colors">
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

const sanitizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, 10)

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
    const phone = sanitizePhone(customer.value.contactNumber)
    if (phone && phone.length !== 10) {
      toast.error('Phone number must be exactly 10 digits.')
      return
    }
    await updateDoc(doc(db, 'users', user.uid), {
      firstName: customer.value.firstName || '',
      lastName: customer.value.lastName || '',
      email: customer.value.email || '',
      contactNumber: phone || '',
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

.profile-shell {
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(241, 212, 170, 0.34), transparent 26%),
    radial-gradient(circle at 82% 8%, rgba(198, 148, 108, 0.2), transparent 20%),
    linear-gradient(180deg, #fbf5e8 0%, #f8ecd9 52%, #f4e1c6 100%);
}

.profile-main {
  min-width: 0;
  background:
    radial-gradient(circle at top left, rgba(241, 212, 170, 0.24), transparent 24%),
    radial-gradient(circle at 84% 12%, rgba(198, 148, 108, 0.14), transparent 18%),
    linear-gradient(180deg, #fbf5e8 0%, #f8ecd9 52%, #f4e1c6 100%);
}

.profile-panel {
  width: 100%;
  max-width: 52rem;
  padding: 1.35rem;
  border-radius: 1.75rem;
  border: 1px solid rgba(230, 193, 150, 0.8);
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 44px rgba(87, 56, 35, 0.08);
}

.profile-title {
  margin: 0;
  color: #3d281d;
  font-family: "Playfair Display", "Times New Roman", serif;
  font-size: clamp(2rem, 3vw, 2.8rem);
  line-height: 1;
}

.profile-subtitle {
  margin: 0.75rem 0 0;
  color: rgba(76, 54, 40, 0.76);
  line-height: 1.7;
}

.profile-avatar-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 1.5rem 0;
}

.profile-avatar {
  width: 8rem;
  height: 8rem;
  overflow: hidden;
  border-radius: 999px;
  background: linear-gradient(135deg, #ead6b8 0%, #dcb489 48%, #c6946c 100%);
  border: 1px solid rgba(230, 193, 150, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-avatar-fallback {
  color: #fff8eb;
  font-size: 2rem;
  font-weight: 700;
}

.profile-upload-label {
  margin-top: 0.9rem;
  cursor: pointer;
  color: #8d5a3b;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 999px;
  border: 1px solid rgba(230, 193, 150, 0.8);
  padding: 0.75rem 1rem;
  background: #fff8ef;
  transition: transform 0.18s ease, filter 0.18s ease;
}

.profile-upload-label:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

.profile-form {
  display: grid;
  gap: 1rem;
}

.profile-field-label {
  display: block;
  margin-bottom: 0.45rem;
  color: #8c6d55;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.profile-input {
  border: 1px solid rgba(230, 193, 150, 0.9);
  background: rgba(255, 255, 255, 0.92);
  color: #342419;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.profile-input:focus {
  border-color: rgba(198, 148, 108, 0.9);
  box-shadow: 0 0 0 4px rgba(214, 169, 123, 0.16);
}

.profile-textarea {
  resize: none;
}

.profile-save-button {
  width: 100%;
  margin-top: 0.35rem;
  padding: 0.95rem 1.15rem;
  border-radius: 1rem;
  border: 1px solid rgba(126, 78, 53, 0.24);
  background: linear-gradient(120deg, #b57f5c 0%, #8d5a3b 48%, #6e4330 100%);
  color: #fff8eb;
  font-weight: 700;
  transition: transform 0.18s ease, filter 0.18s ease;
}

.profile-save-button:hover {
  transform: translateY(-1px);
  filter: brightness(1.03);
}

@media (min-width: 1280px) {
  .profile-content {
    padding: 1.7rem 2rem 2.2rem;
  }
}

@media (max-width: 767px) {
  .profile-content {
    padding: 1rem 1rem 1.5rem;
  }

  .profile-panel {
    padding: 1.1rem;
  }

  .profile-upload-label,
  .profile-save-button {
    width: 100%;
  }
}
</style>
