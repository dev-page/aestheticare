<template>
  <div class="flex bg-slate-900 min-h-screen">
    <CRMSidebar />
    
    <main class="flex-1 p-8">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">CRM Dashboard</h1>
        <p class="text-slate-400">Overview of customer relations and inquiries</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-slate-400 text-sm mb-1">Total Clients</h3>
          <p class="text-3xl font-bold text-white">{{ totalClients }}</p>
          <p class="text-xs text-green-500 mt-1">+12% from last month</p>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-slate-400 text-sm mb-1">New Inquiries</h3>
          <p class="text-3xl font-bold text-white">{{ newInquiries }}</p>
          <p class="text-xs text-orange-500 mt-1">Requires attention</p>
        </div>

        <!-- Active Clients -->
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-slate-400 text-sm mb-1">Active Clients</h3>
          <p class="text-3xl font-bold text-white">{{ activeClients }}</p>
          <p class="text-xs text-slate-500 mt-1">Currently engaged</p>
        </div>

        <!-- Conversion Rate -->
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <div class="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
              <svg class="w-6 h-6 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
              </svg>
            </div>
          </div>
          <h3 class="text-slate-400 text-sm mb-1">Conversion Rate</h3>
          <p class="text-3xl font-bold text-white">{{ conversionRate }}%</p>
          <p class="text-xs text-green-500 mt-1">+3% improvement</p>
        </div>
      </div>

      <div class="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
        <h2 class="text-xl font-semibold text-white mb-6">Recent Inquiries</h2>
        <div class="space-y-3">
          <div v-for="inquiry in recentInquiries" :key="inquiry.id" class="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer">
            <div class="flex items-center gap-4 flex-1">
              <div class="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
                {{ inquiry.name.charAt(0) }}
              </div>
              <div class="flex-1">
                <p class="text-white font-medium">{{ inquiry.name }}</p>
                <p class="text-slate-400 text-sm">{{ inquiry.email }}</p>
              </div>
              <div class="text-right">
                <p class="text-white text-sm">{{ inquiry.service }}</p>
                <p class="text-slate-400 text-xs">{{ inquiry.date }}</p>
              </div>
            </div>
            <span 
              :class="[
                'px-3 py-1 rounded-full text-xs font-medium ml-4',
                inquiry.status === 'New' ? 'bg-blue-500/20 text-blue-400' :
                inquiry.status === 'Contacted' ? 'bg-yellow-500/20 text-yellow-400' :
                inquiry.status === 'Converted' ? 'bg-green-500/20 text-green-400' :
                'bg-red-500/20 text-red-400'
              ]"
            >
              {{ inquiry.status }}
            </span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Status Breakdown -->
        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 class="text-xl font-semibold text-white mb-6">Client Status</h2>
          <div class="space-y-4">
            <div v-for="status in clientStatus" :key="status.name" class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-white font-medium">{{ status.name }}</span>
                <span class="text-slate-400">{{ status.count }} clients</span>
              </div>
              <div class="w-full bg-slate-700 rounded-full h-2">
                <div 
                  :class="['h-2 rounded-full transition-all duration-500', status.color]"
                  :style="{ width: `${(status.count / totalClients) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 class="text-xl font-semibold text-white mb-6">Recent Activity</h2>
          <div class="space-y-4">
            <div v-for="activity in recentActivity" :key="activity.id" class="flex items-start gap-4 pb-4 border-b border-slate-700 last:border-0">
              <div class="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                </svg>
              </div>
              <div class="flex-1">
                <p class="text-white text-sm">{{ activity.action }}</p>
                <p class="text-slate-400 text-xs mt-1">{{ activity.time }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script>
import { ref } from 'vue'
import CRMSidebar from '@/components/manager/ManagerSidebar.vue'

export default {
  name: 'ManagerDashboard',
  components: {
    CRMSidebar
  },
  setup() {
    const totalClients = ref(342)
    const newInquiries = ref(28)
    const activeClients = ref(256)
    const conversionRate = ref(68)

    const recentInquiries = ref([
      { id: 1, name: 'Sarah Johnson', email: 'sarah@email.com', service: 'Botox Treatment', date: '2 hours ago', status: 'New' },
      { id: 2, name: 'Michael Chen', email: 'michael@email.com', service: 'Facial Treatment', date: '5 hours ago', status: 'Contacted' },
      { id: 3, name: 'Emma Wilson', email: 'emma@email.com', service: 'Laser Treatment', date: '1 day ago', status: 'Converted' },
      { id: 4, name: 'David Brown', email: 'david@email.com', service: 'Consultation', date: '2 days ago', status: 'New' }
    ])

    const clientStatus = ref([
      { name: 'Active', count: 256, color: 'bg-green-500' },
      { name: 'Potential', count: 52, color: 'bg-blue-500' },
      { name: 'Inactive', count: 34, color: 'bg-yellow-500' }
    ])

    const recentActivity = ref([
      { id: 1, action: 'New client registered: Sarah Johnson', time: '2 hours ago' },
      { id: 2, action: 'Inquiry converted to client: Michael Chen', time: '5 hours ago' },
      { id: 3, action: 'Follow-up scheduled: Emma Wilson', time: '1 day ago' },
      { id: 4, action: 'Client status updated: David Brown', time: '2 days ago' }
    ])

    return {
      totalClients,
      newInquiries,
      activeClients,
      conversionRate,
      recentInquiries,
      clientStatus,
      recentActivity
    }
  }
}
</script>
