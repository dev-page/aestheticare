
<script>
import { ref, watch, onUnmounted, onMounted } from 'vue';
import Swal from 'sweetalert2';
import { useRouter, useRoute } from 'vue-router';   // ✅ add useRoute
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { auth } from '@/config/firebaseConfig';

export default {
  name: 'OwnerSidebar',
  setup() {
    const isOpen = ref(false);
    const isStaffOpen = ref(false);
    const router = useRouter();
    const route = useRoute();   // ✅ current route
    const db = getFirestore(getApp());

    const ownerEmail = ref('');
    const ownerName = ref('');

    const toggleSidebar = () => {
      isOpen.value = !isOpen.value;
    };

    const toggleDropdown = () => {
      isOpen.value = !isOpen.value;
    };

    const toggleStaffDropdown = () => {
      isStaffOpen.value = !isStaffOpen.value;
    };

    const logout = () => {
      Swal.fire({
        title: 'Are you sure?',
        text: 'Do you really want to log out?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#FFD700',   // gold
        cancelButtonColor: '#FFFFFF',   // white
        confirmButtonText: 'Yes, log me out',
        cancelButtonText: 'Cancel',
        background:'#1e293b',
        color: "#fff"
      }).then((result) => {
        if (result.isConfirmed) {
          router.push('/login');
        }
      });
    };

    // ✅ Auto-open dropdowns based on route
    watch(
      () => route.path,
      (newPath) => {
        isOpen.value = newPath.startsWith('/owner/branch');
        isStaffOpen.value = newPath.startsWith('/owner/staff');
      },
      { immediate: true }
    );

    watch(isOpen, (open) => {
      document.body.style.overflow = open ? 'hidden' : '';
    });

    onUnmounted(() => {
      document.body.style.overflow = '';
    });

    const loadOwnerInfo = async () => {
      const user = auth.currentUser;
      if (user) {
        ownerEmail.value = user.email;
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          ownerName.value = `${data.firstName || ""} ${data.lastName || ""}`.trim();
        }
      }
    };

    onMounted(loadOwnerInfo);

    return { 
      isOpen, 
      isStaffOpen, 
      toggleSidebar, 
      toggleDropdown, 
      toggleStaffDropdown, 
      logout, 
      ownerEmail, 
      ownerName 
    };
  }
};
</script>

<template>
  <div class="flex">
    <button
    class="md:hidden absolute top-4 left-4 z-50 p-2 bg-slate-800 text-slate-50 rounded-md shadow-md transition-all duration-300"
    :style="{ left: isOpen ? '16rem' : '1rem' }"
    @click="toggleSidebar"
    >
    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 6h16M4 12h16M4 18h16" />
    </svg>
    </button>

    <aside
      :class="[
        'fixed md:static z-40 h-full bg-slate-800 flex flex-col transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      ]"
      style="width: 16rem;"
    >
      <div class="p-6 border-b border-slate-700">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-gold-600 to-gold-800"></div>
          <div>
            <h2 class="text-slate-50 font-semibold text-lg">Aesthetic Center Admin</h2>
            <p class="text-slate-400 text-xs">Oversee Clinic Management</p>
          </div>
        </div>
      </div>

      <nav class="flex-1 p-4 overflow-y-auto">
        <ul class="space-y-2">
          <li>
            <router-link
              to="/owner/dashboard"
              class="block w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-rose-600 hover:text-gold-50 transition-colors"
              exact-active-class="bg-gold-700 text-slate-50 hover:bg-gold-800"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span class="text-sm">Dashboard</span>
            </router-link>
          </li>

          <li>
            <button
              @click="toggleDropdown"
              class="block w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-rose-600 hover:text-gold-50 transition-colors"
              exact-active-class="bg-gold-700 text-slate-50 hover:bg-gold-800"
            >
              <div class="flex items-center gap-3">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M5 6a2 2 0 110 4a2 2 0 010-4 m14 0a2 2 0 110 4a2 2 0 010-4 M12 15a2 2 0 110 4a2 2 0 010-4 M7 8l5 6 5-6 " />
              </svg>
                <span class="text-sm">Branch Management</span>
              </div>
              <svg
                class="w-4 h-4 transform transition-transform"
                :class="{ 'rotate-90': isOpen }"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <ul v-if="isOpen" class="ml-8 mt-2 space-y-2">
              <li>
                <router-link
                  to="/owner/branch/branch-info"
                  class="block w-full text-sm block px-4 py-2 rounded-lg text-slate-300 hover:bg-rose-600 hover:text-gold-50 transition-colors"
                  active-class="bg-gold-700 text-slate-50 hover:bg-gold-800">
                  Branch Information  
                </router-link>
              </li>
              <li>
                <router-link
                  to="/owner/branch/add-branch"
                  class="block w-full text-sm block px-4 py-2 rounded-lg text-slate-300 hover:bg-rose-600 hover:text-gold-50 transition-colors"
                  active-class="bg-gold-700 text-slate-50 hover:bg-gold-800">
                  Add Branch
                </router-link>
              </li>
            </ul>
          </li>
          <li>
            <button
              @click="toggleStaffDropdown"
              class="block w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-rose-600 hover:text-gold-50 transition-colors"
              :class="{ 'bg-gold-700 text-slate-50': isStaffOpen }"
            >
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2
                    c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0
                    015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857
                    m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0
                    3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0
                    zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span class="text-sm">Staff Management</span>
              </div>
              <svg
                class="w-4 h-4 transform transition-transform"
                :class="{ 'rotate-90': isStaffOpen }"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <ul v-if="isStaffOpen" class="ml-8 mt-2 space-y-2">
              <li>
                <router-link
                  to="/owner/staff/profiles"
                  class="text-sm block px-4 py-2 rounded-lg text-slate-300 hover:bg-rose-600 hover:text-gold-50 transition-colors"
                  active-class="bg-gold-700 text-slate-50 hover:bg-gold-800">
                  Staff Profiles
                </router-link>
              </li>
              <li>
                <router-link
                  to="/owner/staff/add-staff"
                  class="text-sm block px-4 py-2 rounded-lg text-slate-300 hover:bg-rose-600 hover:text-gold-50 transition-colors"
                  active-class="bg-gold-700 text-slate-50 hover:bg-gold-800">
                  Add Staff
                </router-link>
              </li>
              <li>
                <router-link
                  to="/owner/staff/attendance"
                  class="text-sm block px-4 py-2 rounded-lg text-slate-300 hover:bg-rose-600 hover:text-gold-50 transition-colors"
                  active-class="bg-gold-700 text-slate-50 hover:bg-gold-800">
                  Attendance
                </router-link>
              </li>
              <li>
                <router-link
                  to="/owner/staff/approve"
                  class="text-sm block px-4 py-2 rounded-lg text-slate-300 hover:bg-rose-600 hover:text-gold-50 transition-colors"
                  active-class="bg-gold-700 text-slate-50 hover:bg-gold-800">
                  Approval Requests
                </router-link>
              </li>
            </ul>
          </li>

          <li>
            <router-link
              to="/owner/clinic-profile"
              class="text-sm block w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-rose-600 hover:text-gold-50 transition-colors"
              exact-active-class="bg-gold-700 text-slate-50 hover:bg-gold-800"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4M12 10v3m-1.5-1.5h3" />
              </svg>
              <span>Clinic Profile</span>
            </router-link>
          </li>

          <li>
            <router-link
              to="/owner/reports"
              class="text-sm block w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-rose-600 hover:text-gold-50 transition-colors"
              exact-active-class="bg-gold-700 text-slate-50 hover:bg-gold-800"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M4 19h16M7 16v-6M12 16v-10M17 16v-3" />
              </svg>
              <span>Reports & Analytics</span>
            </router-link>
          </li>
        </ul>
      </nav>

      <!-- Sidebar Footer -->
      <div class="p-4 border-t border-slate-700">
        <div class="flex items-center gap-3 px-4 py-3">
          <div class="h-10 w-10 rounded-full bg-gold-700 flex items-center justify-center text-slate-50 font-semibold"></div>
          <div class="flex-1">
            <p class="text-slate-50 text-sm font-medium">{{ ownerName }}</p>
            <p class="text-slate-400 text-xs">{{ ownerEmail }}</p>
          </div>
        </div>

        <button
          @click="logout"
          class="flex items-center gap-3 w-full px-4 py-2 mt-2 border border-gold-700 text-slate-300 rounded-lg hover:bg-gold-700 hover:text-slate-50 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0
              01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0
              013 3v1" />
          </svg>
          <span>Logout</span>
        </button>
      </div>
    </aside>

    <!-- Overlay for mobile menu -->
    <div
      v-if="isOpen"
      @click="toggleSidebar"
      class="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
    ></div>
  </div>
</template>

<style scoped>
.router-link-active {
  background-color: #b45309;
  color: #f8fafc;
}
</style>