<script>
import { ref, computed } from 'vue'
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { toast } from 'vue3-toastify'
import Swal from 'sweetalert2'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'

export default {
  name: 'AddBranch',
  components: { OwnerSidebar },
  setup() {
    const db = getFirestore(getApp())
    const auth = getAuth(getApp())
    const branches = ref([])

    const currentBranch = ref({
      id: null,
      name: '',
      revenue: 0,
      status: 'Active',
      location: '',
    })
    const caviteLocations = [
      'Alfonso',
      'Amadeo',
      'Bacoor City',
      'Carmona',
      'Cavite City',
      'Dasmarinas City',
      'General Emilio Aguinaldo',
      'General Mariano Alvarez',
      'General Trias City',
      'Imus City',
      'Indang',
      'Kawit',
      'Magallanes',
      'Maragondon',
      'Mendez',
      'Naic',
      'Noveleta',
      'Rosario',
      'Silang',
      'Tagaytay City',
      'Tanza',
      'Ternate',
      'Trece Martires City'
    ]

    const resetForm = () => {
      currentBranch.value = { id: null, name: '', revenue: 0, status: 'Active', location: '' }
    }

    const isFormEmpty = computed(() => {
      const b = currentBranch.value
      return !b.name?.trim() &&
             !b.location?.trim() &&
              (b.revenue || b.revenue === 0)
    })

    const branchNameError = computed(() => {
      const rawName = currentBranch.value.name || ''
      const trimmed = rawName.trim()
      if (!trimmed) return 'Branch name is required.'
      if (!/^[A-Za-z][A-Za-z\s'.-]*$/.test(trimmed)) return 'Only letters, spaces, apostrophes, periods, and hyphens are allowed.'
      return ''
    })

    const handleBranchNameInput = (event) => {
      const value = event?.target?.value ?? ''
      const sanitized = value.replace(/[^A-Za-z\s'.-]/g, '')
      currentBranch.value.name = sanitized
    }

    const saveBranch = async () => {
      if (branchNameError.value) {
        toast.error(branchNameError.value)
        return
      }
      if (!currentBranch.value.location || !currentBranch.value.location.trim()) {
        toast.error('Please select a location in Cavite.')
        return
      }
      if (currentBranch.value.revenue < 0) {
        toast.error('Revenue cannot be negative.')
        return
      }

      try {
        const result = await Swal.fire({
          title: 'Confirm Addition',
          text: `Are you sure you want to add the branch "${currentBranch.value.name.trim()}"?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Yes, add!',
          cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) {
          toast.info('Branch addition cancelled')
          return
        }

        // ✅ Get ownerId from the logged-in user
        const ownerId = auth.currentUser?.uid
        if (!ownerId) {
          toast.error("No logged-in owner found.")
          return
        }

        const docRef = await addDoc(collection(db, "clinics"), {
          clinicBranch: currentBranch.value.name.trim(),
          clinicLocation: currentBranch.value.location.trim(),
          revenue: currentBranch.value.revenue,
          status: currentBranch.value.status,
          isPublished: false,
          ownerId: ownerId,
          createdAt: serverTimestamp()
        })

        branches.value.push({
          id: docRef.id,
          ...currentBranch.value,
          clinicBranch: currentBranch.value.name.trim(),
          clinicLocation: currentBranch.value.location.trim(),
          isPublished: false,
          ownerId: ownerId
        })

        toast.success('Branch added successfully.')
        resetForm()
      } catch (error) {
        console.error("Error saving branch:", error)
        toast.error('Failed to save branch. Please try again.')
      }
    }

    return {
      branches,
      currentBranch,
      caviteLocations,
      branchNameError,
      handleBranchNameInput,
      saveBranch,
      resetForm,
      isFormEmpty
    }
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row owner-theme bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 p-6 max-w-2xl mx-auto text-white">
      <!-- Page Header -->
      <h1 class="text-2xl font-bold mb-6">Add Branch</h1>

      <!-- Add Branch Form -->
    <div class="bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 border border-slate-700 max-w-2xl mx-auto">
      <form class="space-y-4">
        <div>
          <label class="block text-slate-400 mb-1">Branch Name</label>
          <input
            type="text"
            v-model="currentBranch.name"
            placeholder="Enter branch name"
            @input="handleBranchNameInput"
            :class="[
              'w-full px-3 py-2 rounded-lg bg-slate-800 text-white border focus:outline-none focus:ring-2',
              branchNameError ? 'border-red-500 focus:ring-red-500' : 'border-slate-700 focus:ring-blue-500'
            ]"
          />
          <p v-if="branchNameError" class="mt-1 text-xs text-red-400">{{ branchNameError }}</p>
        </div>

        <div>
          <label class="block text-slate-400 mb-1">Location</label>
          <select
            v-model="currentBranch.location"
            class="w-full px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Select city/municipality in Cavite</option>
            <option v-for="location in caviteLocations" :key="location" :value="location">
              {{ location }}
            </option>
          </select>
        </div>

        <div>
          <label class="block text-slate-400 mb-1">Revenue</label>
          <input
            type="number"
            v-model.number="currentBranch.revenue"
            min="0"
            step="0.01"
            placeholder="Revenue"
            class="w-full px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
            <label class="block text-slate-400 mb-1">Status</label>
            <input
                type="text"
                v-model="currentBranch.status"
                readonly
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 cursor-not-allowed"
            />
        </div>

        <!-- Action Buttons -->
        <div class="flex justify-end space-x-2 pt-4">
          <button type="reset" @click="resetForm" :disabled="isFormEmpty"
            class="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded transition
              disabled:opacity-50 disabled:cursor-not-allowed">
            Cancel
          </button>
          <button type="button" @click="saveBranch" 
            class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition">
            Add Branch
          </button>
        </div>
      </form>
    </div>
    </main>
  </div>
</template> 

