<template>
  <BaseCollapsibleSidebar
    title="HR Sidebar"
    subtitle="Human Resources"
    panel-key="hr"
    default-name="HR Staff"
    default-email="hr@aestheticare.com"
    :items="items"
  />
</template>

<script>
import BaseCollapsibleSidebar from '@/components/sidebar/BaseCollapsibleSidebar.vue'

export default {
  name: 'HRSidebar',
  components: { BaseCollapsibleSidebar },
  setup() {
    const items = [
      { label: 'Dashboard', icon: 'home', to: '/hr/dashboard', feature: 'hr' },
      { label: 'Attendance', icon: 'calendar', to: '/hr/attendance', feature: 'attendance', permission: 'attendance:view' },
      {
        key: 'employees',
        label: 'Employees',
        icon: 'users',
        feature: 'hr',
        children: [
          { label: 'Employee Directory', icon: 'profile', to: '/hr/employee-profile', permission: 'staff:view' },
          { label: 'Add Employee', icon: 'userplus', to: '/hr/add-employee', permission: 'staff:create' },
          { label: 'Archives', icon: 'archive', to: '/hr/archives', permission: 'staff:disable' }
        ]
      },
      {
        key: 'shifts',
        label: 'Shifts',
        icon: 'calendar',
        feature: 'hr',
        children: [
          { label: 'Shift List', icon: 'clipboard', to: '/hr/shift-list', permission: 'hr:view' },
          { label: 'Add Shift', icon: 'plus', to: '/hr/add-shift', permission: 'hr:create' },
          { label: 'Shift Assignment', icon: 'settings', to: '/hr/shift-assignment', permission: 'hr:update' }
        ]
      },
      {
        key: 'payroll',
        label: 'Payroll',
        icon: 'cash',
        feature: 'payroll',
        children: [
          { label: 'Base Pay', icon: 'money', to: '/hr/base-pay', permission: 'payroll:update' },
          { label: 'Payroll Settings', icon: 'money', to: '/hr/payroll', permission: 'payroll:update' },
          { label: 'Payslip Generation', icon: 'file', to: '/hr/payslip-generation', permission: 'payroll:create' }
        ]
      },
      { label: 'Reports and Analytics', icon: 'chart', to: '/hr/sales', feature: 'hr', permission: 'reports:view' }
    ]

    return { items }
  }
}
</script>
