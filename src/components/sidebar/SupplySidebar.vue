<template>
  <aside class="w-64 bg-slate-800 min-h-screen flex flex-col">
    <!-- Logo/Header -->
    <div class="p-6 border-b border-slate-700">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700"></div>
        <div>
          <h2 class="text-white font-semibold text-lg">Supply Module</h2>
          <p class="text-slate-400 text-xs">Supply Chain</p>
        </div>
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 p-4">
      <ul class="space-y-2">
        <li>
          <router-link
            to="/supply/dashboard"
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
            to="/supply/suppliers"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            active-class="bg-purple-500 text-white hover:bg-purple-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
            </svg>
            <span>Suppliers</span>
          </router-link>
        </li>
        <li>
          <router-link
            to="/supply/catalog"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            active-class="bg-purple-500 text-white hover:bg-purple-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
            </svg>
            <span>Item Catalog</span>
          </router-link>
        </li>
        <li>
          <router-link
            to="/supply/purchase-requests"
            class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
            active-class="bg-purple-500 text-white hover:bg-purple-600"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <span>Purchase Requests</span>
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
          <p class="text-white text-sm font-medium">Supply Manager</p>
          <p class="text-slate-400 text-xs">supply@aestheticare.com</p>
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
  name: 'SupplySidebar',
}
</script>

<style scoped>
.router-link-active {
    background-color: #8b5cf6;
    color: white;
}
</style>
