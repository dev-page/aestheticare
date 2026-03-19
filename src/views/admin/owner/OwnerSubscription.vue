<template>
  <div class="flex owner-theme bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 p-8">
      <div class="mb-6">
        <h1 class="text-3xl font-bold text-white mb-2">Subscription Plan</h1>
        <p class="text-slate-400">Review your current plan and manage billing preferences.</p>
      </div>

      <p v-if="error" class="mb-4 text-sm text-rose-400">{{ error }}</p>

      <section v-if="loading" class="bg-slate-800 border border-slate-700 rounded-xl p-6 text-slate-300">
        Loading subscription details...
      </section>

      <section v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Current Plan</h2>
          <div class="space-y-3 text-sm text-slate-300">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Plan</span>
              <span class="text-white font-semibold">{{ planLabel }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Price</span>
              <span class="text-white font-semibold">{{ planPrice }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Billing Cycle</span>
              <span class="text-white font-semibold">{{ planCycle }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Payment Status</span>
              <span class="text-white font-semibold">{{ paymentStatusLabel }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Payment ID</span>
              <span class="text-white font-semibold">{{ paymentId || '-' }}</span>
            </div>
          </div>

          <div class="mt-6">
            <h3 class="text-sm font-semibold text-white mb-2">Plan Details</h3>
            <p class="text-sm text-slate-300 mb-3">{{ planDescription }}</p>
            <ul class="text-sm text-slate-300 space-y-1">
              <li v-for="item in planFeatures" :key="item">• {{ item }}</li>
            </ul>
          </div>
        </div>

        <div class="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <h2 class="text-xl font-semibold text-white mb-4">Billing Preferences</h2>
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm text-white font-semibold">Automatic Payments</p>
              <p class="text-xs text-slate-400 mt-1">
                Enable to charge your saved payment method automatically at renewal.
              </p>
            </div>
            <label class="switch">
              <input type="checkbox" v-model="autoRenew" @change="saveAutoRenew" />
              <span class="switch-track"></span>
              <span class="switch-thumb"></span>
            </label>
          </div>

          <p v-if="saveMessage" class="mt-3 text-xs text-emerald-300">{{ saveMessage }}</p>
          <p v-if="saveError" class="mt-3 text-xs text-rose-300">{{ saveError }}</p>

          <div class="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              class="px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition"
              @click="goToUpgrade"
            >
              Avail or Upgrade Plan
            </button>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth, db } from '@/config/firebaseConfig'
import { collection, doc, getDoc, getDocs, onSnapshot, updateDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'

const router = useRouter()

const loading = ref(true)
const error = ref('')
const saveMessage = ref('')
const saveError = ref('')

const planKey = ref('free-trial')
const paymentStatus = ref('')
const paymentId = ref('')
const planData = ref(null)
const autoRenew = ref(false)
let unsubscribeUser = null
let unsubscribeClinic = null

const formatCurrency = (amount) => {
  const value = Number(amount)
  const safe = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(safe)
}

const formatCycle = (cycle) => {
  const normalized = String(cycle || '').trim().toLowerCase()
  if (!normalized || normalized === 'trial') return 'Trial'
  if (normalized.startsWith('/')) return normalized.slice(1)
  return normalized
}

const normalizePlanLabel = (value) => {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return 'Not set'
  if (raw.includes('free')) return 'Free Trial'
  if (raw.includes('basic')) return 'Basic'
  if (raw.includes('premium')) return 'Premium'
  return value
}

const planLabel = computed(() => normalizePlanLabel(planKey.value))
const planPrice = computed(() => formatCurrency(planData.value?.price || 0))
const planCycle = computed(() => formatCycle(planData.value?.billingCycle || planData.value?.cycle || 'trial'))
const planDescription = computed(() => planData.value?.description || 'No description available.')
const planFeatures = computed(() => planData.value?.features || [])
const paymentStatusLabel = computed(() => {
  const raw = String(paymentStatus.value || '').trim().toLowerCase()
  if (!raw) return 'Not set'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})

const applySubscriptionData = async (userData = {}, clinicData = {}) => {
  const resolvedPlan = clinicData.subscriptionPlan || userData.subscriptionPlan || 'free-trial'
  planKey.value = String(resolvedPlan || 'free-trial').trim().toLowerCase()
  paymentStatus.value = clinicData.paymentStatus || userData.paymentStatus || ''
  paymentId.value = clinicData.paymentId || userData.paymentId || ''
  const clinicAutoRenew = Object.prototype.hasOwnProperty.call(clinicData, 'subscriptionAutoRenew')
    ? clinicData.subscriptionAutoRenew
    : undefined
  const userAutoRenew = Object.prototype.hasOwnProperty.call(userData, 'subscriptionAutoRenew')
    ? userData.subscriptionAutoRenew
    : undefined
  const resolvedAutoRenew = clinicAutoRenew ?? userAutoRenew
  autoRenew.value = Boolean(resolvedAutoRenew ?? false)

  if (clinicAutoRenew === undefined && userAutoRenew === undefined) {
    await Promise.all([
      updateDoc(doc(db, 'users', auth.currentUser.uid), { subscriptionAutoRenew: false }),
      updateDoc(doc(db, 'clinics', auth.currentUser.uid), { subscriptionAutoRenew: false }),
    ])
  }
}

const loadSubscription = async () => {
  error.value = ''
  loading.value = true
  try {
    const currentUser = auth.currentUser || await new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub()
        resolve(user)
      })
    })
    if (!currentUser) {
      error.value = 'User not authenticated.'
      return
    }

    const [userSnap, clinicSnap, plansSnap] = await Promise.all([
      getDoc(doc(db, 'users', currentUser.uid)),
      getDoc(doc(db, 'clinics', currentUser.uid)),
      getDocs(collection(db, 'subscriptionPlans')),
    ])

    const userData = userSnap.exists() ? userSnap.data() : {}
    const clinicData = clinicSnap.exists() ? clinicSnap.data() : {}
    await applySubscriptionData(userData, clinicData)

    const plansMap = new Map(plansSnap.docs.map((docSnap) => [docSnap.id, docSnap.data()]))
    planData.value = plansMap.get(planKey.value) || plansMap.get('free-trial') || null
  } catch (err) {
    console.error('Failed to load subscription info:', err)
    error.value = 'Failed to load subscription information.'
  } finally {
    loading.value = false
  }
}

const subscribeToUpdates = async () => {
  const currentUser = auth.currentUser || await new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub()
      resolve(user)
    })
  })
  if (!currentUser) return

  if (unsubscribeUser) unsubscribeUser()
  if (unsubscribeClinic) unsubscribeClinic()

  unsubscribeUser = onSnapshot(doc(db, 'users', currentUser.uid), async (snap) => {
    const userData = snap.exists() ? snap.data() : {}
    const clinicSnap = await getDoc(doc(db, 'clinics', currentUser.uid))
    const clinicData = clinicSnap.exists() ? clinicSnap.data() : {}
    await applySubscriptionData(userData, clinicData)
  })

  unsubscribeClinic = onSnapshot(doc(db, 'clinics', currentUser.uid), async (snap) => {
    const clinicData = snap.exists() ? snap.data() : {}
    const userSnap = await getDoc(doc(db, 'users', currentUser.uid))
    const userData = userSnap.exists() ? userSnap.data() : {}
    await applySubscriptionData(userData, clinicData)
  })
}

const saveAutoRenew = async () => {
  saveMessage.value = ''
  saveError.value = ''
  try {
    const currentUser = auth.currentUser
    if (!currentUser) return
    const value = Boolean(autoRenew.value)
    await Promise.all([
      updateDoc(doc(db, 'users', currentUser.uid), { subscriptionAutoRenew: value }),
      updateDoc(doc(db, 'clinics', currentUser.uid), { subscriptionAutoRenew: value }),
    ])
    saveMessage.value = 'Auto-payment preference saved.'
  } catch (err) {
    console.error('Failed to save auto renew:', err)
    saveError.value = 'Unable to save your preference. Please try again.'
  }
}

const goToPlans = () => {
  router.push({ path: '/subscription-features', query: { plan: planKey.value } })
}

const goToUpgrade = () => {
  router.push({ path: '/subscription-features', query: { plan: planKey.value, from: 'owner' } })
}

onMounted(async () => {
  await loadSubscription()
  await subscribeToUpdates()
})

onUnmounted(() => {
  if (unsubscribeUser) unsubscribeUser()
  if (unsubscribeClinic) unsubscribeClinic()
})
</script>

<style scoped>
.switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 52px;
  height: 28px;
  cursor: pointer;
}

.switch input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-track {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: #475569;
  transition: background 0.2s ease;
  border: 1px solid rgba(148, 163, 184, 0.4);
}

.switch-thumb {
  position: absolute;
  left: 4px;
  top: 4px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #fff;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
}

.switch input:checked ~ .switch-track {
  background: #10b981;
  border-color: rgba(16, 185, 129, 0.6);
}

.switch input:checked ~ .switch-thumb {
  transform: translateX(24px);
}
</style>
