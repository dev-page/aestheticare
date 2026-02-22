<script>
import { ref, onMounted } from 'vue'
import { getFirestore, collection, doc, getDocs, setDoc } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { toast } from 'vue3-toastify'
import Swal from 'sweetalert2'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'

export default {
  name: 'AddEmployee',
  components: { HRSidebar },
  setup() {
    const db = getFirestore(getApp())
    const auth = getAuth(getApp())
    const branches = ref([])

    const currentStaff = ref({
        firstName: '',
        lastName: '',
        email: '',
        role: '',
        userType: 'Staff',
        level: 'Branch',   
        branch: '',
        status: 'Inactive'
    })

    // Load branches from Firestore
    const loadBranches = async () => {
        const snapshot = await getDocs(collection(db, "clinics"))
        branches.value = snapshot.docs.map(doc => ({
            id: doc.id,
            branch: doc.data().clinicBranch,
            location: doc.data().clinicLocation
    }))
    }

    onMounted(() => {
      loadBranches()
    })


    const officeRoles = ['HR', 'CRM', 'Supply', 'Finance']
    const branchRoles = ['Manager', 'Cashier', 'Practitioner']

    const resetForm = () => {
      currentStaff.value = {
        name: '',
        email: '',
        role: '',
        userType: 'Staff',
        level: '',
        branch: '',
        status: 'Inactive'
      }
    }

    const saveStaff = async () => {
    if (!currentStaff.value.name.trim() || !currentStaff.value.email.trim() || !currentStaff.value.role.trim()) {
        toast.error('Name, email, and role are required.')
        return
    }

    try {
        const result = await Swal.fire({
        title: 'Confirm Staff Creation',
        text: `Do you want to create an account for ${currentStaff.value.name} (${currentStaff.value.email})?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#aaa',
        confirmButtonText: 'Yes, create',
        cancelButtonText: 'Cancel'
        })

        if (!result.isConfirmed) {
        toast.info("Staff creation cancelled.")
        return
        }

        const defaultPassword = 'password123'
        let userCredential

        try {
        // Step 1: Create Auth user
        userCredential = await createUserWithEmailAndPassword(auth, currentStaff.value.email, defaultPassword)
        } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            toast.error("This email is already registered.")
            return
        } else {
            toast.error("Failed to create staff account.")
            console.error(error)
            return
        }
        }

        const uid = userCredential.user.uid

        try {
        // Step 2: Save to Firestore
        await setDoc(doc(db, "users", uid), {
            firstName: currentStaff.value.firstName,
            lastName: currentStaff.value.lastName,
            fullName: `${currentStaff.value.firstName} ${currentStaff.value.lastName}`,
            email: currentStaff.value.email,
            role: currentStaff.value.role,
            userType: 'Staff',
            level: 'Branch',
            branch: currentStaff.value.branch || null,
            status: currentStaff.value.status ?? "Inactive",
            mustChangePassword: true,
            createdAt: new Date()
        })

        toast.success('Staff member added successfully!')
        resetForm()
        } catch (firestoreError) {
        // Step 3: Rollback Auth if Firestore fails
        await userCredential.user.delete()
        console.error("Error saving staff to Firestore:", firestoreError)
        toast.error("Failed to save staff record. Auth user was rolled back.")
        }
    } catch (err) {
        console.error(err)
        toast.error("Unexpected error while saving staff.")
    }
    }

    return {
      currentStaff,
      officeRoles,
      branchRoles,
      saveStaff,
      resetForm,
      branches,
      loadBranches
    }
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row bg-slate-900 min-h-screen">
    <HRSidebar />

    <main class="flex-1 p-6 md:p-10 text-white">
      <!-- Page Header -->
      <h1 class="text-2xl font-bold mb-6">Add Employee</h1>

      <!-- Responsive Card -->
      <div class="bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 border border-slate-700 max-w-2xl mx-auto">
        <form class="space-y-4">
<div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-slate-400 mb-1">First Name</label>
              <input
                type="text"
                v-model="currentStaff.firstName"
                placeholder="Enter first name"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Last Name</label>
              <input
                type="text"
                v-model="currentStaff.lastName"
                placeholder="Enter last name"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-slate-400 mb-1">Email</label>
            <input
              type="email"
              v-model="currentStaff.email"
              placeholder="Enter staff email"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

        <div>
            <label class="block text-slate-400 mb-1">Level</label>
            <input
                type="text"
                v-model="currentStaff.level"
                readonly
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 cursor-not-allowed"
            />
        </div>

          <div>
            <label class="block text-slate-400 mb-1">Role</label>
            <select
              v-model="currentStaff.role"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option disabled value="">Select Role</option>
              <option v-for="role in (currentStaff.level === 'Office' ? officeRoles : branchRoles)" :key="role">
                {{ role }}
              </option>
            </select>
          </div>

        <div v-if="currentStaff.level === 'Branch'">
            <label class="block text-slate-400 mb-1">Branch</label>
            <select
                v-model="currentStaff.branch"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
                <option disabled value="">Select Branch</option>
                <option
                v-for="branch in branches"
                :key="branch.id"
                :value="branch.branch"
                >
                {{ branch.branch }} - {{ branch.location }}
                </option>
            </select>
        </div>

        <div>
            <label class="block text-slate-400 mb-1">Status</label>
            <input
                type="text"
                v-model="currentStaff.status"
                readonly
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 cursor-not-allowed"
            />
        </div>

          <div class="flex justify-end space-x-2 pt-4">
            <button 
              type="reset" 
              @click="resetForm" 
              class="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded transition"
            >
              Cancel
            </button>
            <button 
              type="button" 
              @click="saveStaff" 
              class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
            >
              Add Staff
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>
