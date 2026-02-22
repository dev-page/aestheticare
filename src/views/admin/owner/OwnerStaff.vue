<script>
import { ref, onMounted, computed } from 'vue'
import { getFirestore, collection, getDocs, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
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

    // Modal state
    const showAddModal = ref(false)
    const showEditModal = ref(false)

    const currentStaff = ref({
      id: null,
      name: '',
      email: '',
      role: '',
      userType: 'Staff',
      level: '',
      branch: '',
      status: 'Active'
    })
    
    const officeRoles = ['HR', 'CRM', 'Supply', 'Finance'];
    const branchRoles = ['Manager','Cashier', 'Practitioner'];

    const filteredRoles = computed(() => {
      if (currentStaff.value.level === 'Office') return officeRoles;
      if (currentStaff.value.level === 'Branch') return branchRoles;
      return [];
    });
    
    // Load staff data from Firestore
    const loadStaff = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      staffList.value = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).filter((user) => user.userType === 'Staff');
    }

    const loadBranches = async () => {
      const snapshot = await getDocs(collection(db, "clinics"));
      branches.value = snapshot.docs.map((doc) => doc.data().clinicBranch);
    }

    onMounted(() => {
      loadStaff()
      loadBranches()
    })

    const openAddModal = () => {
      currentStaff.value = {
        id: null,
        name: '',
        email: '',
        role: '',
        userType: 'Staff',
        level: '',
        branch: '',
        status: 'Active'
      }
      showAddModal.value = true
    }

    const openEditModal = (staff) => {
      currentStaff.value = { ...staff }
      showEditModal.value = true
    }

    const deactivateStaff = async (staff) => {
      if (staff.status === 'Active') {
        const result = await Swal.fire({
          title: 'Confirm Deactivation',
          text: `Are you sure you want to deactivate ${staff.name}? They will not be able to log in.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#d33',
          cancelButtonColor: '#3085d6',
          confirmButtonText: 'Yes, deactivate',
          cancelButtonText: 'Cancel'
        });

        if (!result.isConfirmed) {
          toast.info("Deactivation cancelled.");
          return;
        }

        try {
          const staffRef = doc(db, "users", staff.id);
          await updateDoc(staffRef, { status: 'Inactive' });
          staff.status = 'Inactive';
          toast.success(`${staff.name} has been deactivated and cannot log in.`);
        } catch (error) {
          console.error(error);
          toast.error("Failed to deactivate staff.");
        }
      } else {
         try {
          const staffRef = doc(db, "users", staff.id);
          await updateDoc(staffRef, { status: 'Active' });
          staff.status = 'Active';
          toast.success(`${staff.name} has been reactivated.`);
          await loadStaff() // Refresh staff list to reflect changes
        } catch (error) {
          console.error(error);
          toast.error("Failed to reactivate staff.");
        }
      }
    };

    const deleteStaff = async (staff) => {
      if (!staff?.id) {
        toast.error("Invalid staff record.");
        return;
      }

      const result = await Swal.fire({
        title: 'Confirm Delete',
        text: `You are about to delete ${staff.name}. This action cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete',
        cancelButtonText: 'Cancel'
      });

      if (!result.isConfirmed) {
        toast.info("Deletion cancelled.");
        return;
      }

      try {
        await deleteDoc(doc(db, "users", staff.id));
        staffList.value = staffList.value.filter((s) => s.id !== staff.id);
        toast.success(`${staff.name} has been deleted successfully.`);
        await loadStaff() // Refresh staff list to reflect changes
      } catch (error) {
        console.error("Error deleting staff:", error);
        toast.error("Failed to delete staff. Please try again.");
      }
    };

    const saveStaff = async () => {
      if (!currentStaff.value.name.trim() || !currentStaff.value.email.trim() || !currentStaff.value.role.trim()) {
        toast.error('Name, email, and role are required.');
        return;
      }
      try {
        if (currentStaff.value.id) {
          // 🔹 Update existing staff with confirmation
          const result = await Swal.fire({
            title: 'Confirm Update',
            text: `Do you want to update ${currentStaff.value.name}'s information?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Yes, update',
            cancelButtonText: 'Cancel'
          });

          if (!result.isConfirmed) {
            toast.info("Update cancelled.");
            return;
          }

          const staffRef = doc(db, "users", currentStaff.value.id);
          await setDoc(staffRef, {
            name: currentStaff.value.name,
            email: currentStaff.value.email,
            role: currentStaff.value.role,
            userType: 'Staff',
            level: currentStaff.value.level,
            branch: currentStaff.value.branch || null,
            status: currentStaff.value.status ?? "Active"
          }, { merge: true });
          toast.success('Staff member updated successfully!');
          await loadStaff() // Refresh staff list to reflect changes
        } else {
          // 🔹 Create new staff with confirmation
          const result = await Swal.fire({
            title: 'Confirm Staff Creation',
            text: `Do you want to create an account for ${currentStaff.value.name} (${currentStaff.value.email})?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Yes, create',
            cancelButtonText: 'Cancel'
          });

          if (!result.isConfirmed) {
            toast.info("Staff creation cancelled.");
            return;
          }

          const defaultPassword = 'password123';
          let userCredential;
          try {
            userCredential = await createUserWithEmailAndPassword(auth, currentStaff.value.email, defaultPassword);
          } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
              toast.error("This email is already registered.");
              return;
            } else {
              toast.error("Failed to create staff account.");
              console.error(error);
              return;
            }
          }

          const uid = userCredential.user.uid;
          await setDoc(doc(db, "users", uid), {
            name: currentStaff.value.name,
            email: currentStaff.value.email,
            role: currentStaff.value.role,
            userType: 'Staff',
            level: currentStaff.value.level,
            branch: currentStaff.value.branch || null,
            status: currentStaff.value.status ?? "Active",
            mustChangePassword: true,
            createdAt: new Date()
          });

          staffList.value.push({ ...currentStaff.value, id: uid, userType: 'Staff', status: "Active" });
          toast.success('Staff member added successfully!');
          await loadStaff() // Refresh staff list to reflect changes
        }
      } catch (err) {
        console.error(err);
        toast.error("Unexpected error while saving staff.");
      }

      showAddModal.value = false;
      showEditModal.value = false;
    }

    return {
      staffList,
      branches,
      showAddModal,
      showEditModal,
      currentStaff,
      openAddModal,
      openEditModal,
      deactivateStaff,
      deleteStaff,
      saveStaff,
      filteredRoles
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
        <button
          @click="openAddModal"
          class="bg-gold-600 hover:bg-gold-700 text-white px-4 py-2 rounded transition w-full md:w-auto"
        >
          Add Staff
        </button>
      </div>

      <!-- Staff Table -->
      <div class="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700 overflow-x-auto">
        <table class="w-full text-left min-w-[500px] sm:min-w-[700px] border-collapse">
          <thead>
            <tr class="text-slate-400 uppercase text-xs sm:text-sm border-b border-slate-700">
              <th class="py-2 px-2 sm:py-3 sm:px-4">Name</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Email</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Role</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Level</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Branch</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Status</th>
              <th class="py-2 px-2 sm:py-3 sm:px-4">Actions</th>
            </tr>
          </thead>
          <tbody class="text-white">
            <tr
              v-for="staff in staffList"
              :key="staff.id"
              class="hover:bg-slate-700 transition-colors"
            >
              <td class="py-2 px-2 sm:py-3 sm:px-4 font-medium">{{ staff.name }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">{{ staff.email }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">{{ staff.role }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">{{ staff.level }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">{{ staff.level === 'Branch' ? staff.branch : '-' }}</td>
              <td class="py-2 px-2 sm:py-3 sm:px-4">
                <span @click="deactivateStaff(staff)" :class="['px-3 py-1 rounded-full text-xs font-medium cursor-pointer', staff.status === 'Active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400']">
                  {{ staff.status }}
              </span>
              </td>
              <td class="py-2 px-2 sm:py-3 sm:px-4 flex flex-wrap gap-2">
                <button
                  @click="openEditModal(staff)"
                  class="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-1 rounded transition flex-1 sm:flex-none"
                >
                  Edit
                </button>
                <button
                  @click="deleteStaff(staff)"
                  class="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition flex-1 sm:flex-none"
                >
                  Delete
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Add Modal -->
      <Modal :isOpen="showAddModal" panelClass="bg-slate-800 text-white w-full max-w-md" @close="showAddModal = false">
        <template #header>
          <h2 class="text-xl font-semibold text-white">Add Staff</h2>
        </template>

        <template #body>
          <form class="space-y-4">
            <div>
              <label class="block text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                v-model="currentStaff.name"
                placeholder="Enter full name"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Email</label>
              <input
                type="email"
                v-model="currentStaff.email"
                placeholder="Enter email"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Level</label>
              <select
                v-model="currentStaff.level"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option disabled value="">Select level</option>
                <option>Branch</option>
                <option>Office</option>
              </select>
            </div>

            <div v-if="currentStaff.level === 'Branch'">
              <label class="block text-slate-400 mb-1">Branch</label>
              <select
                v-model="currentStaff.branch"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option disabled value="">Select branch</option>
                <option v-for="b in branches" :key="b">{{ b }}</option>
              </select>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Role</label>
              <select
                v-model="currentStaff.role"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option disabled value="">Select role</option>
                <option v-for="role in filteredRoles" :key="role" :value="role">
                  {{ role }}
                </option>
              </select>
            </div>
          </form>
        </template>

        <template #footer>
          <div class="flex flex-col sm:flex-row justify-end sm:space-x-2 space-y-2 sm:space-y-0">
            <button
              @click="showAddModal = false"
              class="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded transition"
            >
              Cancel
            </button>
            <button
              @click="saveStaff"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
            >
              Add
            </button>
          </div>
        </template>
      </Modal>

      <!-- Edit Modal -->
      <Modal :isOpen="showEditModal" panelClass="bg-slate-800 text-white w-full max-w-md" @close="showEditModal = false">
        <template #header>
          <h2 class="text-xl font-semibold text-white">Edit Staff</h2>
        </template>

        <template #body>
          <form class="space-y-4">
            <div>
              <label class="block text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                v-model="currentStaff.name"
                placeholder="Enter full name"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Email</label>
              <input
                type="email"
                v-model="currentStaff.email"
                placeholder="Enter email"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Level</label>
              <select
                v-model="currentStaff.level"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option disabled value="">Select level</option>
                <option>Branch</option>
                <option>Office</option>
              </select>
            </div>

            <div v-if="currentStaff.level === 'Branch'">
              <label class="block text-slate-400 mb-1">Branch</label>
              <select
                v-model="currentStaff.branch"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option disabled value="">Select branch</option>
                <option v-for="b in branches" :key="b">{{ b }}</option>
              </select>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Role</label>
              <select
                v-model="currentStaff.role"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option disabled value="">Select role</option>
                <option v-for="role in filteredRoles" :key="role" :value="role">
                  {{ role }}
                </option>
              </select>
            </div>

            <div>
              <label class="block text-slate-400 mb-1">Status</label>
              <select
                v-model="currentStaff.status"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </form>
        </template>

        <template #footer>
          <div class="flex flex-col sm:flex-row justify-end sm:space-x-2 space-y-2 sm:space-y-0">
            <button
              @click="showEditModal = false"
              class="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded transition"
            >
              Cancel
            </button>
            <button
              @click="saveStaff"
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
            >
              Update
            </button>
          </div>
        </template>
      </Modal>
    </main>
  </div>
</template>