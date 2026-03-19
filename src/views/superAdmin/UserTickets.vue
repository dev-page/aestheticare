<template>
  <div class="flex module-theme bg-slate-900 min-h-screen">
    <SuperAdminSidebar />

    <main class="flex-1 p-8">
      <h1 class="text-3xl font-bold text-white mb-2">User Tickets</h1>
      <p class="text-slate-400 mb-6">Support issues submitted by platform users.</p>

      <section class="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <table class="w-full text-sm">
          <thead class="border-b border-slate-700">
            <tr>
              <th class="text-left text-slate-300 px-4 py-3">Ticket ID</th>
              <th class="text-left text-slate-300 px-4 py-3">User</th>
              <th class="text-left text-slate-300 px-4 py-3">Subject</th>
              <th class="text-left text-slate-300 px-4 py-3">Status</th>
              <th class="text-left text-slate-300 px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="px-4 py-3 text-slate-200" colspan="5">No support tickets yet.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  </div>
</template>

<script>
import SuperAdminSidebar from '@/components/sidebar/SuperAdminSidebar.vue'

export default {
  name: 'SuperAdminUserTickets',
  components: { SuperAdminSidebar }
}
</script>
