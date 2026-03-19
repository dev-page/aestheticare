<template>
  <BaseCollapsibleSidebar
    title="Owner Sidebar"
    subtitle="Owner Module"
    panel-key="owner"
    default-name="Owner"
    default-email="owner@aestheticare.com"
    :items="items"
  />
</template>

<script>
import BaseCollapsibleSidebar from '@/components/sidebar/BaseCollapsibleSidebar.vue'

export default {
  name: 'OwnerSidebar',
  components: { BaseCollapsibleSidebar },
  setup() {
    const items = [
      { label: 'Dashboard', icon: 'dashboard', to: '/owner/dashboard' },
      {
        key: 'branch',
        label: 'Branch',
        icon: 'building',
        children: [
          { label: 'Branch Info', icon: 'map', to: '/owner/branch/branch-info', permission: 'branches:view' },
          { label: 'Add Branch', icon: 'plus', to: '/owner/branch/add-branch', feature: 'multi_branch', permission: 'branches:create' }
        ]
      },
      {
        key: 'staff',
        label: 'Employee',
        icon: 'users',
        feature: 'staff_management',
        children: [
          { label: 'Employee Profiles', icon: 'profile', to: '/owner/staff/profiles', feature: 'staff_management', permission: 'staff:view' },
          { label: 'Add Employee', icon: 'userplus', to: '/owner/staff/add-staff', feature: 'staff_management', permission: 'staff:create' },
          { label: 'Attendance', icon: 'calendar', to: '/owner/staff/attendance', feature: 'attendance', permission: 'attendance:view' }
        ]
      },
      {
        key: 'clinic',
        label: 'Clinic',
        icon: 'clinic',
        children: [
          { label: 'Clinic Profile', icon: 'idcard', to: '/owner/clinic-profile', permission: 'clinic_profile:view' },
          { label: 'Clinic Page', icon: 'layout', to: '/owner/clinic-page', permission: 'clinic_profile:update' }
        ]
      },
      {
        key: 'account',
        label: 'Account Settings',
        icon: 'settings',
        children: [
          { label: 'Subscription Plan', icon: 'card', to: '/owner/account/subscription' },
          { label: 'Backup Database', icon: 'file', to: '/owner/account/backup' }
        ]
      },
      { label: 'Reports', icon: 'report', to: '/owner/reports', feature: 'reports', permission: 'reports:view' }
    ]

    return { items }
  }
}
</script>
