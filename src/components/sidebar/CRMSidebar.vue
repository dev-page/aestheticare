<template>
  <aside class="w-64 bg-slate-800 min-h-screen flex flex-col">
    <!-- Logo/Header -->
    <div class="p-6 border-b border-slate-700">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700"></div>
        <div>
          <h2 class="text-white font-semibold text-lg">CRM Module</h2>
          <p class="text-slate-400 text-xs">Customer Relations</p>
        </div>
      </div>
    </div>

    <nav class="flex-1 p-4">
      <ul class="space-y-2">
        <li>
          <router-link
            to="/crm/dashboard"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            active-class="bg-purple-500 text-white hover:bg-purple-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
            </svg>
            <span>Dashboard</span>
          </router-link>
        </li>
        <li>
          <router-link
            to="/crm/clients"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            active-class="bg-purple-500 text-white hover:bg-purple-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
            <span>Clients</span>
          </router-link>
        </li>
        <li>
          <router-link
            to="/crm/inbox"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            active-class="bg-purple-500 text-white hover:bg-purple-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
            </svg>
            <span>Inbox</span>
          </router-link>
        </li>
      </ul>
    </nav>

    <div class="p-4 border-t border-slate-700">
      <div class="flex items-center gap-3 px-4 py-3">
        <div class="h-10 w-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-semibold">
          U
        </div>
        <div class="flex-1">
          <p class="text-white text-sm font-medium">CRM Manager</p>
          <p class="text-slate-400 text-xs">crm@aestheticare.com</p>
        </div>
      </div>

      <button @click="logout" class="flex items-center gap-3 w-full px-4 py-2 mt-2 border border-purple-500 text-purple-500 rounded-lg hover:bg-purple-500 hover:text-white transition-colors">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
        </svg>
        <span>Logout</span>
      </button>
    </div>
  </aside>
</template>

<script>
export default {
  name: 'CRMSidebar',
}
</script>

<style scoped>
.router-link-active {
  background-color: #8b5cf6;
  color: white;
}
</style>
