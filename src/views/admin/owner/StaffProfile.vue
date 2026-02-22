<script>
import { ref, onMounted, computed } from 'vue'
import { getFirestore, collection, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'
import Modal from '@/components/common/Modal.vue'
import { toast } from 'vue3-toastify'
import Swal from 'sweetalert2'

export default {
  name: 'OwnerStaff',
  components: { OwnerSidebar, Modal },
  setup() {
    const db = getFirestore(getApp())
    const auth = getAuth(getApp())
    const staffList = ref([])
    const branches = ref([])

    const showEditModal = ref(false)
    const searchQuery = ref('')

    const currentStaff = ref({
      id: null,
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      role: '',
      branchId: '',
      userType: 'Staff',
      status: 'Active'
    })

    const roleOptions = ['HR', 'Manager', 'Cashier', 'Practitioner', 'CRM', 'Supply', 'Finance']

    const loadStaff = async () => {
      const snapshot = await getDocs(collection(db, "users"))
      const staffDocs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((user) => user.userType === 'Staff')
      staffList.value = staffDocs.map(staff => {
        const branch = branches.value.find(b => b.id === staff.branchId)
        return {
          ...staff,
          clinicBranch: branch ? branch.clinicBranch : '',
          clinicLocation: branch ? branch.clinicLocation : ''
        }
      })
    }

    const loadBranches = async () => {
      const snapshot = await getDocs(collection(db, "clinics"))
      branches.value = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        clinicBranch: doc.data().clinicBranch,
        clinicLocation: doc.data().clinicLocation}))
    }

    onMounted(async() => {
      await loadBranches()
      await loadStaff()

    })

    const openEditModal = (staff) => {
      currentStaff.value = { ...staff }
      showEditModal.value = true
    }

    const deactivateStaff = async (staff) => {
      const fullName = `${staff.firstName} ${staff.lastName}`
      if (staff.status === 'Active') {
        const result = await Swal.fire({
          title: 'Confirm Deactivation',
          text: `Are you sure you want to deactivate ${fullName}? They will not be able to log in.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, deactivate',
          cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) {
          toast.info("Deactivation cancelled.")
          return
        }

        try {
          const staffRef = doc(db, "users", staff.id)
          await updateDoc(staffRef, { status: 'Inactive' })
          staff.status = 'Inactive'
          toast.success(`${fullName} has been deactivated.`)
        } catch (error) {
          console.error(error)
          toast.error("Failed to deactivate staff.")
        }
      } else {
        try {
          const staffRef = doc(db, "users", staff.id)
          await updateDoc(staffRef, { status: 'Active' })
          staff.status = 'Active'
          toast.success(`${fullName} has been reactivated.`)
          await loadStaff()
        } catch (error) {
          console.error(error)
          toast.error("Failed to reactivate staff.")
        }
      }
    }

    const deleteStaff = async (staff) => {
      if (!staff?.id) {
        toast.error("Invalid staff record.")
        return
      }

      const fullName = `${staff.firstName} ${staff.lastName}`

      const result = await Swal.fire({
        title: 'Confirm Delete',
        text: `You are about to delete ${fullName}. This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel'
      })

      if (!result.isConfirmed) {
        toast.info("Deletion cancelled.")
        return
      }

      try {
        await deleteDoc(doc(db, "users", staff.id))
        staffList.value = staffList.value.filter((s) => s.id !== staff.id)
        toast.success(`Staff has been deleted successfully.`)
        await loadStaff()
      } catch (error) {
        console.error("Error deleting staff:", error)
        toast.error("Failed to delete staff.")
      }
    }

    const saveStaff = async () => {
      const { firstName, lastName, email, phoneNumber, role, clinicBranch, clinicLocation } = currentStaff.value
      const fullName = `${firstName} ${lastName}`

      if (!firstName.trim() || !lastName.trim() || !email.trim() || !phoneNumber.trim() || !role.trim() || !clinicBranch.trim() || !clinicLocation.trim()) {
        toast.error('All fields are required.')
        return
      }

      try {
        if (currentStaff.value.id) {
          const result = await Swal.fire({
            title: 'Confirm Update',
            text: `Do you want to update ${fullName}'s information?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Yes, update',
            cancelButtonText: 'Cancel'
          })

          if (!result.isConfirmed) {
            toast.info("Update cancelled.")
            return
          }

          const staffRef = doc(db, "users", currentStaff.value.id)
          await updateDoc(staffRef, { 
            firstName: currentStaff.value.firstName.trim(),
            lastName: currentStaff.value.lastName.trim(),
            email: currentStaff.value.email.trim(),
            phoneNumber: currentStaff.value.phoneNumber,
            role: currentStaff.value.role,
            branchId: currentStaff.value.branchId,
            status: currentStaff.value.status
          })
          toast.success(`${fullName}'s information updated successfully!`)
          await loadStaff()
        }
      } catch (err) {
        console.error(err)
        toast.error("Unexpected error while saving staff.")
      }

      showEditModal.value = false
    }

    const filteredStaffList = computed(() => {
      if (!searchQuery.value.trim()) return staffList.value
      const query = searchQuery.value.toLowerCase()
      return staffList.value.filter(staff =>
        (staff.clinicBranch && staff.clinicBranch.toLowerCase().includes(query)) ||
        (staff.clinicLocation && staff.clinicLocation.toLowerCase().includes(query))
      )
    })

    return {
      staffList,
      branches,
      showEditModal,
      currentStaff,
      openEditModal,
      deactivateStaff,
      deleteStaff,
      saveStaff,
      searchQuery,
      filteredStaffList
    }
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 p-4 md:p-8">
      <!-- Header -->
      <div class="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 class="text-2xl md:text-3xl font-bold text-white mb-1">Staff Management</h1>
          <p class="text-slate-400 text-sm md:text-base">Manage staff accounts and roles at both office and branch level</p>
        </div>
      </div>

      <!-- Search Filter -->
      <div class="mb-4">
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Search by branch or location..."
          class="w-full md:w-1/3 px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <!-- Staff Table -->
      <div class="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 overflow-x-auto">
        <table class="w-full text-left min-w-[500px] sm:min-w-[700px] border-collapse">
          <thead>
            <tr class="text-slate-400 uppercase text-xs sm:text-sm border-b border-slate-700">
              <th class="py-2 px-2 sm:py-3 sm:px-4">Name</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Email</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Phone Number</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Role</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Branch</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Location</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Status</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Actions</th>
            </tr>
          </thead>
          <tbody class="text-white">
            <tr v-for="staff in filteredStaffList" :key="staff.id" class="hover:bg-slate-700 transition-colors">
              <!-- Name column now combines firstName + lastName -->
              <td class="py-2 px-2 sm:py-3 sm:px-4 font-medium">{{ staff.firstName }} {{ staff.lastName }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">{{ staff.email }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">{{ staff.phoneNumber || '-' }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">{{ staff.role || '-' }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">{{ staff.clinicBranch }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">{{ staff.clinicLocation || '-' }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">
                <span
                  @click="deactivateStaff(staff)"
                  :class="[
                    'px-3 py-1 rounded-full text-xs font-medium cursor-pointer',
                    staff.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  ]"
                >
                  {{ staff.status }}
                </span>
              </td>
              <td class="py-2 px-2 sm:py-3 sm:px-4 flex flex-wrap gap-2">
                <button @click="openEditModal(staff)" class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded transition flex-1 sm:flex-none">
                  Edit
                </button>
                <button @click="deleteStaff(staff)" class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition flex-1 sm:flex-none">
                  Delete
                </button>
              </td>
            </tr>

            <tr v-if="staffList.length === 0">
              <td colspan="8" class="py-6 text-center text-slate-400">No Results Found</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Edit Modal -->
      <Modal :isOpen="showEditModal" panelClass="bg-slate-800 text-white w-full max-w-md" @close="showEditModal = false">
        <template #header>
          <h2 class="text-xl font-semibold text-white">Edit Staff</h2>
        </template>

        <template #body>
          <form class="space-y-4">
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-slate-400 mb-1">First Name</label>
                <input type="text" v-model="currentStaff.firstName" placeholder="First Name"
                  class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>

              <div>
                <label class="block text-slate-400 mb-1">Last Name</label>
                <input type="text" v-model="currentStaff.lastName" placeholder="Last Name"
                  class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
              </div>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Email</label>
              <input type="email" v-model="currentStaff.email" placeholder="Enter email"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Phone Number</label>
              <input type="text" v-model="currentStaff.phoneNumber" placeholder="Enter phone number"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Role</label>
              <select v-model="currentStaff.role"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                <option disabled value="">Select role</option>
                <option v-for="role in roleOptions" :key="role">{{ role }}</option>
              </div>

            <div>
              <label class="block text-slate-400 mb-1">Branch</label>
              <select v-model="currentStaff.clinicBranch"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                <option disabled value="">Select branch</option>
                <option v-for="clinicBranch in branches" :key="clinicBranch">{{ clinicBranch }}</option>
              </div>

            <div>
              <label class="block text-slate-400 mb-1">Clinic Location</label>
              <input type="text" v-model="currentStaff.clinicLocation" placeholder="Enter clinic location"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"/>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Status</label>
              <select v-model="currentStaff.status"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </form>
        </template>

        <template #footer>
          <div class="flex flex-col sm:flex-row justify-end sm:space-x-2 space-y-2 sm:space-y-0">
            <button @click="showEditModal = false" class="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded transition">Cancel</button>
            <button @click="saveStaff" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition">Update</button>
          </div>
        </template>
      </Modal>
    </main>
  </div>
</template>
