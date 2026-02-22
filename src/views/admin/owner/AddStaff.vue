<script>
import { ref, onMounted, computed } from 'vue'
import { getFirestore, collection, doc, getDocs, setDoc } from 'firebase/firestore'
import { getApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { toast } from 'vue3-toastify'
import Swal from 'sweetalert2'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'

export default {
  name: 'AddStaff',
  components: { OwnerSidebar },
  setup() {
    const db = getFirestore(getApp())
    const auth = getAuth(getApp())
    const branches = ref([])

    const currentStaff = ref({
      firstName: '',
      lastName: '',
      email: '',
      phoneNumber: '',
      role: 'HR',
      userType: 'Staff',
      clinicBranch: '',   // will hold branchId
      clinicLocation: '',
      status: 'Active'
    })

    // Load branches from Firestore
    const loadBranches = async () => {
      const snapshot = await getDocs(collection(db, "clinics"))
      branches.value = snapshot.docs.map(doc => ({
        id: doc.id, // branchId reference
        branch: doc.data().clinicBranch,
        location: doc.data().clinicLocation
      }))
    }

    onMounted(() => {
      loadBranches()
    })

    const resetForm = () => {
      currentStaff.value = {
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        role: 'HR',
        userType: 'Staff',
        clinicBranch: '',
        clinicLocation: '',
        status: 'Active'
      }
    }

    // Auto-populate clinicLocation when branch is selected
    const updateLocation = () => {
      const selected = branches.value.find(b => b.id === currentStaff.value.clinicBranch)
      currentStaff.value.clinicLocation = selected ? selected.location : ""
    }

    const saveStaff = async () => {
      if (!currentStaff.value.firstName.trim() || 
          !currentStaff.value.lastName.trim() || 
          !currentStaff.value.email.trim() || 
          !currentStaff.value.phoneNumber.trim() || 
          !currentStaff.value.role.trim() || 
          !currentStaff.value.clinicBranch.trim() || 
          !currentStaff.value.clinicLocation.trim()) {
        toast.error('All fields are required.')
        return
      }

      try {
        const result = await Swal.fire({
          title: 'Confirm Staff Creation',
          text: `Do you want to create an account for ${currentStaff.value.firstName} ${currentStaff.value.lastName} (${currentStaff.value.email})?`,
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
            phoneNumber: currentStaff.value.phoneNumber,
            role: 'HR',
            userType: 'Staff',
            branchId: currentStaff.value.clinicBranch,   // ✅ store branchId reference
            clinicLocation: currentStaff.value.clinicLocation,
            status: currentStaff.value.status ?? "Active",
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

    const isFormEmpty = computed(() => {
      const s = currentStaff.value
      return !s.firstName?.trim() &&
             !s.lastName?.trim() &&
             !s.email?.trim() &&
             !s.phoneNumber?.trim() &&
             !s.clinicBranch?.trim() &&
             !s.clinicLocation?.trim()
    })

    return {
      currentStaff,
      saveStaff,
      resetForm,
      branches,
      loadBranches,
      updateLocation,
      isFormEmpty
    }
  }
}
</script>

<template>
  <div class="flex flex-col md:flex-row bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 p-6 md:p-10 text-white">
      <h1 class="text-2xl font-bold mb-6">Add Staff</h1>

      <div class="bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 border border-slate-700 max-w-2xl mx-auto">
        <form class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-slate-400 mb-1">First Name</label>
              <input type="text" v-model="currentStaff.firstName" placeholder="Enter first name"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label class="block text-slate-400 mb-1">Last Name</label>
              <input type="text" v-model="currentStaff.lastName" placeholder="Enter last name"
                class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-slate-400 mb-1">Email</label>
            <input type="email" v-model="currentStaff.email" placeholder="Enter staff email"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-slate-400 mb-1">Phone Number</label>
            <input type="text" v-model="currentStaff.phoneNumber" placeholder="Enter staff phone number"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label class="block text-slate-400 mb-1">Role</label>
            <input type="text" v-model="currentStaff.role" readonly
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 cursor-not-allowed"/>
          </div>

          <div>
            <label class="block text-slate-400 mb-1">Branch</label>
            <select v-model="currentStaff.clinicBranch" @change="updateLocation"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500">
              <option disabled value="">Select Branch</option>
              <option v-for="branch in branches" :key="branch.id" :value="branch.id">
                {{ branch.branch }} - {{ branch.location }}
              </option>
            </select>
          </div>

           <div>
            <label class="block text-slate-400 mb-1">Clinic Location</label>
            <input type="text" v-model="currentStaff.clinicLocation" placeholder="Enter clinic location"
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 focus:ring-2 focus:ring-blue-500"/>
          </div>

          <div>
            <label class="block text-slate-400 mb-1">Status</label>
            <input type="text" v-model="currentStaff.status" readonly
              class="w-full px-3 py-2 rounded-lg bg-slate-700 text-white border border-slate-600 cursor-not-allowed"
            />
          </div>

          <!-- Buttons -->
          <div class="flex justify-end space-x-2 pt-4">
            <button type="reset" @click="resetForm" :disabled="isFormEmpty" class="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded transition
              disabled:opacity-50 disabled:cursor-not-allowed">
              Cancel
            </button>
            <button type="button" @click="saveStaff" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition">
              Add Staff
            </button>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>
