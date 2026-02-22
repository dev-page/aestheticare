<template>
  <div class="flex bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 flex items-center justify-center p-8">
      <!-- Centered Card -->
      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 w-full max-w-3xl">
        <div class="flex flex-col items-center mb-6">
          <div class="relative w-32 h-32 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center">
            <img v-if="clinic.profilePicture" :src="clinic.profilePicture" alt="Clinic Profile" class="w-full h-full object-cover" />
            <span v-else class="text-white font-bold text-3xl">{{ clinic.clinicName ? clinic.clinicName.charAt(0) : 'C' }}</span>
          </div>
          <label class="mt-3 cursor-pointer text-sm text-purple-400 hover:text-purple-300 transition-colors">
            Upload Profile Picture
            <input type="file" @change="handleFileUpload" class="hidden" />
          </label>
        </div>

        <!-- Clinic Details Form -->
        <form @submit.prevent="saveClinicProfile" class="space-y-4">
          <div>
            <label class="block text-slate-400 text-sm mb-1">Clinic Name</label>
            <input
              v-model="clinic.clinicName"
              type="text"
              placeholder="Enter clinic name"
              class="w-full rounded-lg p-3 bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label class="block text-slate-400 text-sm mb-1">Email</label>
            <input
              v-model="clinic.email"
              type="email"
              placeholder="clinic@example.com"
              class="w-full rounded-lg p-3 bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label class="block text-slate-400 text-sm mb-1">Phone Number</label>
            <input
              v-model="clinic.contactNumber"
              type="tel"
              placeholder="+1 234 567 890"
              class="w-full rounded-lg p-3 bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label class="block text-slate-400 text-sm mb-1">Address</label>
            <textarea
              v-model="clinic.clinicLocation"
              rows="3"
              placeholder="Enter clinic address"
              class="w-full rounded-lg p-3 bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            ></textarea>
          </div>

          <div>
            <label class="block text-slate-400 text-sm mb-1">Description</label>
            <textarea
              v-model="clinic.description"
              rows="4"
              placeholder="Brief description of the clinic"
              class="w-full rounded-lg p-3 bg-slate-700 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            ></textarea>
          </div>

          <button
            type="submit"
            class="w-full bg-gold-700 hover:bg-yellow-600 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Save Changes
          </button>
        </form>
      </div>
    </main>
  </div>
</template>


<script>
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue';
import { ref, onMounted } from 'vue';
import { getFirestore, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { auth } from '@/config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'vue3-toastify';

export default {
  name: 'ClinicProfile',
  components: { OwnerSidebar },
  setup() {
    const db = getFirestore(getApp());
    const clinic = ref({
      clinicName: '',
      email: '',
      contactNumber: '',
      clinicLocation: '',
      description: '',
      profilePicture: null,
    });

    const handleFileUpload = (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          clinic.value.profilePicture = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    };

    const loadOwnerInfo = async (user) => {
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        clinic.value.email = data.email;
        clinic.value.contactNumber = data.contactNumber;
      }
    };

    const loadClinicProfile = async () => {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          const clinicRef = doc(db, 'clinics', user.uid);
          const clinicSnap = await getDoc(clinicRef);
          if (clinicSnap.exists()) {
            clinic.value = { ...clinic.value, ...clinicSnap.data() };
          }
          await loadOwnerInfo(user);
        }
      });
    };

    const saveClinicProfile = async () => {
      const user = auth.currentUser;
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      const clinicRef = doc(db, 'clinics', user.uid);
      await updateDoc(clinicRef, { ...clinic.value });
      toast.success('Clinic profile updated successfully!');
    };

    onMounted(loadClinicProfile);

    return { clinic, handleFileUpload, saveClinicProfile };
  },
};
</script>

<style scoped>
input[type="file"]::file-selector-button {
  display: none;
}
</style>
