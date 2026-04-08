<template>
  <div class="flex owner-theme bg-slate-900 min-h-screen">
    <OwnerSidebar />

    <main class="flex-1 p-8">
      <div class="mb-8">
        <h1 class="text-3xl font-bold text-white mb-2">Choose Your Plan</h1>
        <p class="text-slate-400">Select the plan you want to avail or upgrade to before continuing to checkout.</p>
      </div>

      <p v-if="error" class="mb-4 text-sm text-rose-400">{{ error }}</p>

      <section v-if="loading" class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          v-for="index in 2"
          :key="`owner-plan-skeleton-${index}`"
          class="rounded-2xl border border-slate-700 bg-slate-800 p-6 animate-pulse"
        >
          <div class="h-4 w-24 rounded bg-slate-700 mb-4"></div>
          <div class="h-8 w-40 rounded bg-slate-700 mb-3"></div>
          <div class="h-3 w-full rounded bg-slate-700 mb-2"></div>
          <div class="h-3 w-3/4 rounded bg-slate-700 mb-6"></div>
          <div class="space-y-2">
            <div class="h-3 w-full rounded bg-slate-700"></div>
            <div class="h-3 w-5/6 rounded bg-slate-700"></div>
            <div class="h-3 w-2/3 rounded bg-slate-700"></div>
          </div>
        </div>
      </section>

      <section v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <button
          v-for="plan in plans"
          :key="plan.id"
          type="button"
          class="text-left rounded-2xl border p-6 transition-all"
          :class="selectedPlan === plan.id
            ? 'border-amber-400 bg-slate-800 shadow-[0_0_0_1px_rgba(251,191,36,0.25)]'
            : 'border-slate-700 bg-slate-800 hover:border-slate-500 hover:bg-slate-800/90'"
          @click="selectedPlan = plan.id"
        >
          <div class="flex items-start justify-between gap-4 mb-4">
            <div>
              <p class="text-xs uppercase tracking-[0.22em] text-amber-300 mb-2">{{ plan.id }}</p>
              <h2 class="text-2xl font-semibold text-white">{{ plan.name }}</h2>
            </div>
            <span
              v-if="selectedPlan === plan.id"
              class="rounded-full border border-amber-400/40 bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300"
            >
              Selected
            </span>
          </div>

          <div class="mb-4">
            <div class="text-3xl font-bold text-white">{{ plan.priceLabel }}</div>
            <div class="text-sm text-slate-400">{{ plan.cycleLabel || '-' }}</div>
          </div>

          <p class="mb-5 text-sm text-slate-300">{{ plan.description }}</p>

          <ul class="space-y-2 text-sm text-slate-200">
            <li v-for="feature in plan.features" :key="feature">- {{ feature }}</li>
          </ul>
        </button>
      </section>

      <div class="mt-8 flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-slate-600 text-slate-200 hover:bg-slate-800 transition"
          @click="goBack"
        >
          Back
        </button>
        <button
          type="button"
          class="px-5 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition disabled:opacity-60"
          :disabled="!selectedPlan"
          @click="continueWithPlan"
        >
          Confirm And Continue
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/config/firebaseConfig'
import OwnerSidebar from '@/components/sidebar/OwnerSidebar.vue'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const error = ref('')
const selectedPlan = ref('basic')
const plans = ref([])

const defaultPlans = () => [
  {
    id: 'basic',
    name: 'Basic',
    price: 999,
    billingCycle: 'month',
    description: 'Essential features for daily clinic operations.',
    features: ['Scheduling & billing', 'Staff management', 'Reports'],
    isActive: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 2499,
    billingCycle: 'month',
    description: 'Advanced features and priority support for growing clinics.',
    features: ['Everything in Basic', 'Advanced analytics', 'Priority support'],
    isActive: true,
  },
]

const formatCurrency = (amount) => {
  const value = Number(amount)
  const safe = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    currencyDisplay: 'code',
    maximumFractionDigits: 0,
  }).format(safe)
}

const formatCycle = (cycle) => {
  const normalized = String(cycle || '').trim().toLowerCase()
  if (!normalized || normalized === 'trial') return ''
  if (normalized.startsWith('/')) return normalized
  return `/${normalized}`
}

const mergePlans = (dbPlansMap) =>
  defaultPlans().map((basePlan) => {
    const dbPlan = dbPlansMap.get(basePlan.id) || {}
    const merged = {
      ...basePlan,
      ...dbPlan,
      id: basePlan.id,
      features: Array.isArray(dbPlan.features) ? dbPlan.features : basePlan.features,
    }

    return {
      ...merged,
      priceLabel: formatCurrency(merged.price),
      cycleLabel: formatCycle(merged.billingCycle),
      isActive: merged.isActive !== false,
    }
  })

const loadPlans = async () => {
  error.value = ''
  loading.value = true
  try {
    const requestedPlan = String(route.query.plan || '').trim().toLowerCase()
    if (requestedPlan) {
      selectedPlan.value = requestedPlan
    }

    const snapshot = await getDocs(collection(db, 'subscriptionPlans'))
    const dbPlans = new Map(snapshot.docs.map((docSnap) => [docSnap.id, docSnap.data()]))
    const merged = mergePlans(dbPlans)
    const activePlans = merged.filter((plan) => plan.isActive)
    plans.value = activePlans.length ? activePlans : merged

    if (!plans.value.some((plan) => plan.id === selectedPlan.value)) {
      selectedPlan.value = plans.value[0]?.id || 'basic'
    }
  } catch (err) {
    console.error('Failed to load owner subscription plans:', err)
    error.value = 'Unable to load plans right now.'
    plans.value = mergePlans(new Map())
  } finally {
    loading.value = false
  }
}

const continueWithPlan = () => {
  if (!selectedPlan.value) return
  router.push({ path: '/subscription/checkout', query: { plan: selectedPlan.value, from: 'owner' } })
}

const goBack = () => {
  router.push('/owner/account/subscription')
}

onMounted(loadPlans)
</script>
