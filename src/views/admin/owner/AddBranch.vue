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

    const resetForm = () => {
      currentBranch.value = { id: null, name: '', revenue: 0, status: 'Active', location: '' }
    }

    const isFormEmpty = computed(() => {
      const b = currentBranch.value
      return !b.name?.trim() &&
             !b.location?.trim() &&
              (b.revenue || b.revenue === 0)
    })

    const saveBranch = async () => {
      if (!currentBranch.value.name || !currentBranch.value.name.trim()) {
        toast.error('Branch name is required')
        return
      }

      try {
        const result = await Swal.fire({
          title: 'Confirm Addition',
          text: `Are you sure you want to add the branch "${currentBranch.value.name.trim()}"?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#aaa',
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
          ownerId: ownerId,
          createdAt: serverTimestamp()
        })

        branches.value.push({
          id: docRef.id,
          ...currentBranch.value,
          clinicBranch: currentBranch.value.name.trim(),
          clinicLocation: currentBranch.value.location.trim(),
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
      saveBranch,
      resetForm,
      isFormEmpty
    }
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row bg-slate-900 min-h-screen">
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
            class="w-full px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-slate-400 mb-1">Location</label>
          <input
            type="text"
            v-model="currentBranch.location"
            placeholder="Enter location"
            class="w-full px-3 py-2 rounded-lg bg-slate-800 text-white border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label class="block text-slate-400 mb-1">Revenue</label>
          <input
            type="number"
            v-model="currentBranch.revenue"
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
