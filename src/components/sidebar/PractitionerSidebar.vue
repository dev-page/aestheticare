<template>
  <BaseCollapsibleSidebar
    title="Practitioner Sidebar"
    subtitle="Clinical Module"
    panel-key="practitioner"
    default-name="Practitioner"
    default-email="practitioner@aestheticare.com"
    :items="items"
  />
</template>

<script>
import BaseCollapsibleSidebar from '@/components/sidebar/BaseCollapsibleSidebar.vue'

export default {
  name: 'PractitionerSidebar',
  components: { BaseCollapsibleSidebar },
  setup() {
    const items = [
      { label: 'Dashboard', icon: 'home', to: '/practitioner/dashboard' },
      { label: 'Add Attendance', icon: 'plus', to: '/practitioner/attendance/add', feature: 'attendance', permission: 'attendance:create' },
      { label: 'Clients', icon: 'users', to: '/practitioner/clients', permission: 'clients:view' },
      { label: 'Appointments', icon: 'calendar', to: '/practitioner/appointments', permission: 'appointments:view' },
      { label: 'Online Consultation', icon: 'video', to: '/practitioner/consultations/online', feature: 'online_consultations', permission: 'consultations:view' },
      { label: 'Activities', icon: 'activity', to: '/practitioner/activities' }
    ]

    return { items }
  }
}
</script>
