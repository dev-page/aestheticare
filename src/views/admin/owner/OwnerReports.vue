<script>
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue';
import { ref, onMounted } from 'vue';
import { getFirestore, collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getApp } from 'firebase/app';

export default {
  name: 'OwnerReports',
  components: { OwnerSidebar },
  setup() {
    const db = getFirestore(getApp());

    const totalBranches = ref(3);
    const totalEmployees = ref(45);
    const monthlyRevenue = ref(152300);
    const newInquiries = ref(28);

    const branches = ref([]);
    const activityLogs = ref([]); 
    // 🔹 Load activity logs from Firestore
    const loadActivityLogs = async () => {
      try {
        const logsQuery = query(collection(db, "logs"), orderBy("date", "desc"));
        const snapshot = await getDocs(logsQuery);
        activityLogs.value = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } catch (error) {
        console.error("Error loading activity logs:", error);
      }
    };

    const loadReports = async () => {
      const snapshot = await getDocs(collection(db, "clinics"));
      const branchData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      branches.value = branchData;

      totalBranches.value = branchData.length;
      totalEmployees.value = branchData.reduce((sum, b) => sum + (b.employees || 0), 0);
      monthlyRevenue.value = branchData.reduce((sum, b) => sum + (b.revenue || 0), 0);
      newInquiries.value = branchData.reduce((sum, b) => sum + (b.newInquiries || 0), 0);
    };

    onMounted(async () => {
      await loadReports();
      await loadActivityLogs();
    });

    return { 
      totalBranches, 
      totalEmployees, 
      monthlyRevenue, 
      newInquiries, 
      branches, 
      activityLogs
    };
  }
}
</script>

<style scoped>
</style>
<template>
  <div class="flex flex-col md:flex-row bg-slate-900 min-h-screen">
    <!-- Sidebar stays fixed on medium screens and up -->
    <OwnerSidebar class="w-full md:w-64 flex-shrink-0" />

    <main class="flex-1 p-4 md:p-8">
      <!-- Page Header -->
      <div class="mb-6 md:mb-8">
        <h1 class="text-2xl md:text-3xl font-bold text-white mb-1 md:mb-2">Reports & Analytics</h1>
        <p class="text-slate-400 text-sm md:text-base">View detailed performance metrics for branches, staff, and revenue</p>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div class="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700">
          <h3 class="text-slate-400 text-xs sm:text-sm mb-1">Total Branches</h3>
          <p class="text-2xl sm:text-3xl font-bold text-white">{{ totalBranches }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700">
          <h3 class="text-slate-400 text-xs sm:text-sm mb-1">Total Employees</h3>
          <p class="text-2xl sm:text-3xl font-bold text-white">{{ totalEmployees }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700">
          <h3 class="text-slate-400 text-xs sm:text-sm mb-1">Monthly Revenue</h3>
          <p class="text-2xl sm:text-3xl font-bold text-white">${{ monthlyRevenue }}</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-4 sm:p-6 border border-slate-700">
          <h3 class="text-slate-400 text-xs sm:text-sm mb-1">New Inquiries</h3>
          <p class="text-2xl sm:text-3xl font-bold text-white">{{ newInquiries }}</p>
        </div>
      </div>

            <!-- Activity Log -->
      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mt-8">
        <h2 class="text-xl font-semibold text-white mb-6">Employee Activity Log</h2>
        <div class="overflow-x-auto">
          <table class="min-w-full text-sm text-left text-slate-300">
            <thead class="bg-slate-700 text-slate-200 uppercase text-xs">
              <tr>
                <th class="px-6 py-3">Date</th>
                <th class="px-6 py-3">Employee</th>
                <th class="px-6 py-3">Action</th>
                <th class="px-6 py-3">Details</th>
              </tr>
            </thead>
            <tbody v-if="activityLogs.length > 0">
              <tr v-for="log in activityLogs" :key="log.id" class="border-b border-slate-700 hover:bg-slate-700/50">
                <td class="px-6 py-4">{{ new Date(log.date.seconds * 1000).toLocaleString() }}</td>
                <td class="px-6 py-4">{{ log.user }}</td>
                <td class="px-6 py-4 font-medium text-white">{{ log.action }}</td>
                <td class="px-6 py-4">{{ log.details }}</td>
              </tr>
            </tbody>

            <tbody v-else>
              <tr>
                <td colspan="4" class="px-6 py-4 text-center text-slate-400">
                  No activity logs available
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </main>
  </div>
</template>
