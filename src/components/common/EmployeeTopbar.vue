<template>
  <div class="employee-topbar readonly-exempt">
    <div class="employee-topbar-inner" :style="topbarStyle">
      <div class="employee-topbar-left">
        <button
          type="button"
          class="employee-topbar-btn employee-topbar-toggle"
          :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          aria-label="Toggle sidebar"
          @click="toggleSidebar"
        >
          <svg class="employee-topbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="sidebarCollapsed ? 'M13 5l7 7-7 7M5 5v14' : 'M11 19l-7-7 7-7M19 5v14'"
            />
          </svg>
        </button>
        <span v-if="title" class="employee-topbar-title">{{ title }}</span>
      </div>
      <div class="employee-topbar-right">
        <button type="button" class="employee-topbar-btn" aria-label="Notifications">
          <svg class="employee-topbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.4-1.4A2 2 0 0118 14V11a6 6 0 10-12 0v3a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 01-6 0"
            />
          </svg>
        </button>
        <div class="employee-topbar-badge" :class="isExpired ? 'badge-expired' : 'badge-active'">
          <span class="badge-label">{{ planLabel }}</span>
          <span v-if="isExpired" class="badge-status">Expired</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: 'Employee Panel'
  },
  planLabel: {
    type: String,
    default: 'Plan'
  },
  isExpired: {
    type: Boolean,
    default: false
  },
  sidebarCollapsed: {
    type: Boolean,
    default: false
  },
  panelKey: {
    type: String,
    default: ''
  }
})

const topbarStyle = computed(() => ({
  '--sidebar-offset': props.sidebarCollapsed ? '7rem' : '19rem'
}))

const toggleSidebar = () => {
  if (!props.panelKey) return
  window.dispatchEvent(
    new CustomEvent('sidebar-toggle-request', {
      detail: { panelKey: props.panelKey }
    })
  )
}
</script>

<style scoped>
.employee-topbar {
  position: sticky;
  top: 0;
  z-index: 40;
  background: rgba(20, 12, 8, 0.96);
  border-bottom: 1px solid rgba(90, 57, 39, 0.6);
  backdrop-filter: blur(6px);
}

.employee-topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 1.5rem;
}

@media (min-width: 768px) {
  .employee-topbar-inner {
    padding-left: var(--sidebar-offset, 19rem);
  }
}

.employee-topbar-title {
  color: #f7e8de;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.employee-topbar-left {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}

.employee-topbar-toggle {
  height: 32px;
  width: 32px;
}

.employee-topbar-toggle .employee-topbar-icon {
  width: 16px;
  height: 16px;
}

.employee-topbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.employee-topbar-btn {
  height: 36px;
  width: 36px;
  border-radius: 999px;
  border: 1px solid rgba(90, 57, 39, 0.8);
  background: rgba(58, 36, 23, 0.8);
  color: #f3e7e0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease, color 0.2s ease;
}

.employee-topbar-btn:hover {
  background: rgba(84, 49, 33, 0.9);
  color: #fff;
}

.employee-topbar-icon {
  width: 18px;
  height: 18px;
}

.employee-topbar-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.badge-active {
  background: rgba(16, 185, 129, 0.2);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #c8f7e2;
}

.badge-expired {
  background: rgba(248, 113, 113, 0.18);
  border: 1px solid rgba(248, 113, 113, 0.45);
  color: #ffd3d3;
}

.badge-status {
  font-size: 0.65rem;
  opacity: 0.9;
}
</style>
