<script>
import { ref, onMounted, computed } from 'vue'
import { getFirestore, collection, updateDoc, doc, getDocs, serverTimestamp, query, where } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'
import Modal from '@/components/common/Modal.vue'
import { toast } from 'vue3-toastify'
import Swal from 'sweetalert2'

export default {
  name: 'Branch Info',
  components: { OwnerSidebar, Modal },
  setup() {
    // Branch list
    const db = getFirestore(getApp());
    const auth = getAuth(getApp());
    const branches = ref([]);
    const showEditModal = ref(false);

    const currentBranch = ref({ 
      id: null,
      clinicBranch: '',
      revenue: 0,
      status: 'Active',
      clinicLocation: '',
    });
    const archivedBranches = computed(() => branches.value.filter((branch) => branch.status === 'Inactive'))
    const activeBranches = computed(() => branches.value.filter((branch) => branch.status !== 'Inactive'))

    const loadBranches = async () => {
      const user = auth.currentUser
      if (!user) {
        branches.value = []
        return
      }

      const clinicsQuery = query(
        collection(db, "clinics"),
        where("ownerId", "==", user.uid)
      )
      const snapshot = await getDocs(clinicsQuery)
      branches.value = snapshot.docs.map((docSnap) => {
        const data = docSnap.data() || {}
        const rawStatus = String(data.status || '').trim()
        return {
          id: docSnap.id,
          ...data,
          status: rawStatus || 'Active',
        }
      })
    };

    onMounted(loadBranches);

    const openEditModal = (branch) => {
      currentBranch.value = { ...branch }
      showEditModal.value = true
    };

    const archiveBranch = async (branch) => {
        if (!branch?.id) {
            toast.error('Invalid branch ID')
            return
        }

        const result = await Swal.fire({
            title: 'Archive Branch',
            text: `Archive ${branch.clinicBranch}? This will set the status to Inactive.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, archive it!',
            cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) {
            toast.info('Archive cancelled')
            return
        }

        try {
            const branchRef = doc(db, "clinics", branch.id)
            await updateDoc(branchRef, {
              status: 'Inactive',
              archivedAt: serverTimestamp()
            })
            branch.status = 'Inactive'
            toast.success('Branch archived successfully.')
        } catch (error) {
            console.error("Error archiving branch:", error)
            toast.error('Failed to archive branch. Please try again.')
        }
    }

    const unarchiveBranch = async (branch) => {
        if (!branch?.id) {
            toast.error('Invalid branch ID')
            return
        }

        const result = await Swal.fire({
            title: 'Unarchive Branch',
            text: `Unarchive ${branch.clinicBranch}? This will set the status to Active.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Yes, unarchive it!',
            cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) {
            toast.info('Unarchive cancelled')
            return
        }

        try {
            const branchRef = doc(db, "clinics", branch.id)
            await updateDoc(branchRef, {
              status: 'Active',
              updatedAt: serverTimestamp()
            })
            branch.status = 'Active'
            toast.success('Branch unarchived successfully.')
        } catch (error) {
            console.error("Error unarchiving branch:", error)
            toast.error('Failed to unarchive branch. Please try again.')
        }
    }

    const updateBranch = async () => {
        // Basic validation
        if (!currentBranch.value.clinicBranch || !currentBranch.value.clinicBranch.trim()) {
            toast.error('Branch name is required')
            return
        }

        if (!currentBranch.value.clinicLocation || !currentBranch.value.clinicLocation.trim()) {
            toast.error('Branch location is required')
            return
        }
        if (Number(currentBranch.value.revenue) < 0) {
            toast.error('Revenue cannot be negative.')
            return
        }

        try {
            const user = auth.currentUser
            if (!user) {
            toast.error('You must be logged in to update a branch')
            return
            }

            const ownerId = user.uid

            if (currentBranch.value.id) {
            // 🔹 Swal confirmation
            const result = await Swal.fire({
                title: 'Confirm Update',
                text: 'Are you sure you want to update this branch?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Yes, update!',
                cancelButtonText: 'Cancel'
            })

            if (!result.isConfirmed) {
                toast.info('Update cancelled')
                return
            }

            const branchRef = doc(db, "clinics", currentBranch.value.id)
            await updateDoc(branchRef, {
                clinicBranch: currentBranch.value.clinicBranch.trim(),
                clinicLocation: currentBranch.value.clinicLocation.trim(),
                revenue: currentBranch.value.revenue,
                status: currentBranch.value.status,
                ownerId: ownerId,
                updatedAt: serverTimestamp()
            })

            // Update local state
            const index = branches.value.findIndex((b) => b.id === currentBranch.value.id)
            if (index !== -1) {
                branches.value[index] = {
                ...currentBranch.value,
                clinicBranch: currentBranch.value.clinicBranch.trim(),
                clinicLocation: currentBranch.value.clinicLocation.trim(),
                ownerId: ownerId
                }
            }

            toast.success('Branch updated successfully.')
            showEditModal.value = false // close modal after update
            }
        } catch (error) {
            console.error("Error updating branch:", error)
            toast.error('Failed to update branch. Please try again.')
        }
    }

    const toggleStatus = async (branch) => {
        const action = branch.status === 'Active' ? 'deactivate' : 'reactivate'
        const newStatus = branch.status === 'Active' ? 'Inactive' : 'Active'

        const result = await Swal.fire({
            title: `Confirm ${action}`,
            text: `Are you sure you want to ${action} ${branch.clinicBranch}?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: `Yes, ${action}!`,
            cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) {
            toast.info(`${action.charAt(0).toUpperCase() + action.slice(1)} cancelled`)
            return
        }

        try {
            const branchRef = doc(db, "clinics", branch.id)
            await updateDoc(branchRef, { status: newStatus })
            branch.status = newStatus
            toast.success(`${branch.clinicBranch} has been ${action}d.`)
        } catch (error) {
            console.error("Error updating status:", error)
            toast.error(`Failed to ${action} branch.`)
        }
    }

    return {
      branches,
      activeBranches,
      archivedBranches,
      showEditModal,
      currentBranch,
      openEditModal,
      archiveBranch,
      unarchiveBranch,
      updateBranch,
      toggleStatus
    }
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row owner-theme bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 p-4 md:p-8">
      <!-- Header -->
      <div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-white mb-1">Branch Management</h1>
          <p class="text-slate-400 text-sm md:text-base">Monitor branch locations, employees, and revenue performance</p>
        </div>
      </div>

      <!-- Branch Table -->
      <div class="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 overflow-x-auto">
        <table class="w-full text-left min-w-[600px] sm:min-w-[700px] border-collapse">
          <thead>
            <tr class="text-slate-400 uppercase text-xs sm:text-sm border-b border-slate-700">
              <th class="py-2 px-2 sm:py-3 sm:px-4">Branch Name</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Location</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Revenue</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Status</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Actions</th>
            </tr>
          </thead>
          <tbody class="text-white">
            <tr
              v-for="branch in activeBranches"
              :key="branch.id"
              class="hover:bg-slate-700 transition-colors"
            >
              <td class="py-2 px-2 sm:py-3 sm:px-4 font-medium">{{ branch.clinicBranch }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">{{ branch.clinicLocation || 'N/A' }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">?{{ branch.revenue ? branch.revenue.toLocaleString() : 0 }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">
                <span
                @click="toggleStatus(branch)"
                  :class="[
                    'px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium cursor-pointer',
                    branch.status === 'Active'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-yellow-500/20 text-yellow-400'
                  ]"
                >
                  {{ branch.status }}
                </span>
              </td>
              <td class="py-2 px-2 sm:py-3 sm:px-4 flex flex-wrap gap-2">
                <button
                  @click="openEditModal(branch)"
                  class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded transition flex-1 sm:flex-none"
                >
                  Edit
                </button>
                <button
                  @click="archiveBranch(branch)"
                  class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition flex-1 sm:flex-none"
                >
                  Archive
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="mt-8 bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 overflow-x-auto">
        <div class="mb-4">
          <h2 class="text-lg sm:text-xl font-semibold text-white">Archived Branches</h2>
          <p class="text-slate-400 text-sm">Inactive branches archived by the owner.</p>
        </div>
        <table class="w-full text-left min-w-[600px] sm:min-w-[700px] border-collapse">
          <thead>
            <tr class="text-slate-400 uppercase text-xs sm:text-sm border-b border-slate-700">
              <th class="py-2 px-2 sm:py-3 sm:px-4">Branch Name</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Location</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Revenue</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Status</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Actions</th>
            </tr>
          </thead>
          <tbody class="text-white">
            <tr v-if="archivedBranches.length === 0">
              <td colspan="5" class="py-6 text-center text-slate-400">No archived branches yet.</td>
            </tr>
            <tr
              v-for="branch in archivedBranches"
              :key="branch.id"
              class="hover:bg-slate-700 transition-colors"
            >
              <td class="py-2 px-2 sm:py-3 sm:px-4 font-medium">{{ branch.clinicBranch }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">{{ branch.clinicLocation || 'N/A' }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">?{{ branch.revenue ? branch.revenue.toLocaleString() : 0 }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">
                <span class="px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium bg-yellow-500/20 text-yellow-400">
                  Inactive
                </span>
              </td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">
                <button
                  @click="unarchiveBranch(branch)"
                  class="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded transition"
                >
                  Unarchive
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Edit Branch Modal -->
      <Modal :isOpen="showEditModal" panelClass="bg-slate-800 text-white w-full max-w-md" @close="showEditModal = false">
        <template #header>
          <h2 class="text-xl font-semibold text-white">Edit Branch</h2>
        </template>

        <template #body>
          <form class="space-y-4">
            <div>
              <label class="block text-slate-400 mb-1">Branch Name</label>
              <input
                type="text"
                v-model="currentBranch.clinicBranch"
                placeholder="Enter branch name"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label class="block text-slate-400 mb-1">Location</label>
              <input
                type="text"
                v-model="currentBranch.clinicLocation"
                placeholder="Enter location"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Revenue</label>
              <input
                type="number"
                v-model.number="currentBranch.revenue"
                min="0"
                step="0.01"
                placeholder="Revenue"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Status</label>
              <select
                v-model="currentBranch.status"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </div>
          </form>
        </template>

        <template #footer>
          <div class="flex flex-col sm:flex-row justify-end sm:space-x-2 space-y-2 sm:space-y-0">
            <button @click="showEditModal = false" class="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded transition">
              Cancel
            </button>
            <button @click="updateBranch" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition">
              Update
            </button>
          </div>
        </template>
      </Modal>
    </main>
  </div>
</template>




