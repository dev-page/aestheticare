<template>
  <component :is="resolvedSidebarComponent" :key="resolvedSidebarKey" />
</template>

<script>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { getApp } from 'firebase/app'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, getFirestore } from 'firebase/firestore'
import { useRoute } from 'vue-router'
import CashierSidebar from '@/components/sidebar/CashierSidebar.vue'
import ClinicOwnerSidebar from '@/components/sidebar/ClinicOwnerSidebar.vue'
import EmployeeSidebar from '@/components/sidebar/EmployeeSidebar.vue'
import FinanceSidebar from '@/components/sidebar/FinanceSidebar.vue'
import HRSidebar from '@/components/sidebar/HRSidebar.vue'
import ManagerSidebar from '@/components/sidebar/ManagerSidebar.vue'
import PractitionerSidebar from '@/components/sidebar/PractitionerSidebar.vue'
import ReceptionistSidebar from '@/components/sidebar/ReceptionistSidebar.vue'
import CustomerSidebar from '@/components/sidebar/CustomerSidebar.vue'
import SupplySidebar from '@/components/sidebar/SupplySidebar.vue'
import SuperAdminSidebar from '@/components/sidebar/SuperAdminSidebar.vue'
import { resolveSidebarComponentKey } from '@/utils/sidebarResolution'

const normalizeRoleLabel = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')

const sidebarMap = {
  superadmin: SuperAdminSidebar,
  owner: ClinicOwnerSidebar,
  manager: ManagerSidebar,
  receptionist: ReceptionistSidebar,
  practitioner: PractitionerSidebar,
  hr: HRSidebar,
  finance: FinanceSidebar,
  supply: SupplySidebar,
  cashier: CashierSidebar,
  employee: EmployeeSidebar,
  customer: CustomerSidebar
}

export default {
  name: 'OwnerSidebar',
  setup() {
    const db = getFirestore(getApp())
    const auth = getAuth(getApp())
    const route = useRoute()
    const currentRoleLabel = ref('')
    let unsubscribeAuth = null

    const loadRole = async (user) => {
      if (!user) {
        currentRoleLabel.value = ''
        return
      }

      const userSnap = await getDoc(doc(db, 'users', user.uid))
      const userData = userSnap.exists() ? userSnap.data() || {} : {}
      currentRoleLabel.value = String(userData.customRoleName || userData.role || userData.userType || '').trim()
    }

    const resolvedSidebarKey = computed(() =>
      resolveSidebarComponentKey(currentRoleLabel.value, route.path)
    )

    const resolvedSidebarComponent = computed(() => {
      const key = normalizeRoleLabel(resolvedSidebarKey.value)
      return sidebarMap[key] || ClinicOwnerSidebar
    })

    onMounted(() => {
      unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
        await loadRole(user)
      })
    })

    onUnmounted(() => {
      if (unsubscribeAuth) {
        unsubscribeAuth()
      }
    })

    return {
      resolvedSidebarComponent,
      resolvedSidebarKey
    }
  }
}
</script>
