<script>
import { ref, onMounted } from 'vue'
import { getFirestore, collection, getDocs, updateDoc, doc } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'
import Modal from '@/components/common/Modal.vue'
import { toast } from 'vue3-toastify'
import Swal from 'sweetalert2'
import { auth } from '@/config/firebaseConfig'

export default {
  name: 'HREmployee',
  components: { HRSidebar, Modal },
  setup() {
    const db = getFirestore(getApp())
    const staffList = ref([])
    const showEditModal = ref(false)
    const currentUserId = ref(null)   // ✅ store current HR UID

    const currentStaff = ref({
      id: null,
      firstName: '',
      lastName: '',
      email: '',
      role: '',
      userType: 'Staff',
      status: '',
      archived: false
    })

    const loadStaff = async () => {
      const snapshot = await getDocs(collection(db, "users"))
      staffList.value = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.userType === 'Staff')
    }

    onMounted(() => {
      if (auth.currentUser) {
        currentUserId.value = auth.currentUser.uid
      }
      loadStaff()
    })

    const deactivateStaff = async (staff) => {
      if (staff.id === currentUserId.value) {
        toast.error("You cannot modify your own account.")
        return
      }

      if (staff.status === 'Active') {
        const result = await Swal.fire({
          title: 'Confirm Deactivation',
          text: `Deactivate ${staff.firstName} ${staff.lastName}?`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, deactivate',
          cancelButtonText: 'Cancel'
        })
        if (!result.isConfirmed) return

        await updateDoc(doc(db, "users", staff.id), { status: 'Inactive' })
        staff.status = 'Inactive'
        toast.success(`${staff.firstName} ${staff.lastName} deactivated.`)
      } else {
        await updateDoc(doc(db, "users", staff.id), { status: 'Active' })
        staff.status = 'Active'
        toast.success(`${staff.firstName} ${staff.lastName} reactivated.`)
        await loadStaff()
      }
    }

    const archiveStaff = async (staff) => {
      if (staff.id === currentUserId.value) {
        toast.error("You cannot archive your own account.")
        return
      }
      if (staff.status !== 'Inactive') {
        toast.error("Only inactive staff can be archived.")
        return
      }
      await updateDoc(doc(db, "users", staff.id), { archived: true })
      staff.archived = true
      toast.success(`${staff.firstName} ${staff.lastName} archived.`)
    }

    const unarchiveStaff = async (staff) => {
      if (staff.id === currentUserId.value) {
        toast.error("You cannot unarchive your own account.")
        return
      }
      if (!staff.archived) {
        toast.error("Staff is not archived.")
        return
      }
      await updateDoc(doc(db, "users", staff.id), { archived: false })
      staff.archived = false
      toast.success(`${staff.firstName} ${staff.lastName} unarchived.`)
    }

    return {
      staffList,
      showEditModal,
      currentStaff,
      currentUserId,
      deactivateStaff,
      archiveStaff,
      unarchiveStaff
    }
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row bg-slate-900 min-h-screen">
    <HRSidebar />
    <main class="flex-1 p-4 md:p-8">
      <h1 class="text-2xl md:text-3xl font-bold text-white mb-1">Staff Management</h1>
      <p class="text-slate-400 mb-6">Manage staff accounts and roles in your branch</p>

      <div class="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 overflow-x-auto">
        <table class="w-full text-left min-w-[600px] border-collapse">
          <thead>
            <tr class="text-slate-400 uppercase text-xs sm:text-sm border-b border-slate-700">
              <th class="py-2 px-4">Name</th>
              <th class="py-2 px-4">Email</th>
              <th class="py-2 px-4">Role</th>
              <th class="py-2 px-4">Status</th>
              <th class="py-2 px-4">Actions</th>
            </tr>
          </thead>
          <tbody class="text-white">
            <tr v-for="staff in staffList" :key="staff.id" class="hover:bg-slate-700 transition-colors">
              <td class="py-2 px-4 font-medium">{{ staff.firstName }} {{ staff.lastName }}</td>
              <td class="py-2 px-4">{{ staff.email }}</td>
              <td class="py-2 px-4">{{ staff.role }}</td>
              <td class="py-2 px-4">
                <span
                  @click="deactivateStaff(staff)"
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-medium cursor-pointer',
                    staff.status === 'Active'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  ]"
                >
                  {{ staff.status }}
                </span>
              </td>
              <td class="py-2 px-4 flex flex-wrap gap-2">
                <button
                  @click="deactivateStaff(staff)"
                  :disabled="staff.id === currentUserId"
                  class="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {{ staff.status === 'Active' ? 'Deactivate' : 'Activate' }}
                </button>

                <!-- Archive/Unarchive -->
                <button
                  v-if="!staff.archived"
                  @click="archiveStaff(staff)"
                  :disabled="staff.status !== 'Inactive' || staff.id === currentUserId"
                  class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Archive
                </button>
                <button
                  v-else
                  @click="unarchiveStaff(staff)"
                  :disabled="staff.id === currentUserId"
                  class="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Unarchive
                </button>
              </td>
            </tr>

            <tr v-if="staffList.length === 0">
              <td colspan="5" class="py-6 text-center text-slate-400">No Results Found</td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>
  </div>
</template>