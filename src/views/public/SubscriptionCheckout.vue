<template>
  <div class="min-h-screen bg-gradient-to-br from-cream-50 via-cream-100 to-gold-100">
    <div class="mx-auto w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-6 px-4 py-10">
      <Transition name="checkout-panel" appear>
        <section v-if="showPanels" class="checkout-panel delay-0 bg-white/80 border border-gold-200 rounded-2xl p-6">
        <p class="text-xs tracking-widest uppercase text-gold-700 mb-2">Subscription Checkout</p>
        <h1 class="text-3xl font-semibold text-charcoal-800 mb-2">Complete Your Plan Payment</h1>
        <p class="text-sm text-charcoal-600 mb-6">Choose a payment method for PayMongo.</p>

        <div v-if="error" class="mb-4 rounded-lg border border-rose-300 bg-rose-50 text-rose-700 px-3 py-2 text-sm">
          {{ error }}
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs text-charcoal-600 mb-1">First Name</label>
            <input
              v-model="payerFirstName"
              type="text"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              :class="fieldErrors.firstName ? 'border-rose-400' : 'border-gold-200'"
              placeholder="Enter first name"
              @input="validateField('firstName')"
            />
            <p v-if="fieldErrors.firstName" class="mt-1 text-xs text-rose-500">{{ fieldErrors.firstName }}</p>
          </div>

          <div>
            <label class="block text-xs text-charcoal-600 mb-1">Last Name</label>
            <input
              v-model="payerLastName"
              type="text"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              :class="fieldErrors.lastName ? 'border-rose-400' : 'border-gold-200'"
              placeholder="Enter last name"
              @input="validateField('lastName')"
            />
            <p v-if="fieldErrors.lastName" class="mt-1 text-xs text-rose-500">{{ fieldErrors.lastName }}</p>
          </div>

          <div>
            <label class="block text-xs text-charcoal-600 mb-1">Email Address</label>
            <input
              v-model="payerEmail"
              type="email"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              :class="fieldErrors.email ? 'border-rose-400' : 'border-gold-200'"
              placeholder="Enter email"
              @input="validateField('email')"
            />
            <p v-if="fieldErrors.email" class="mt-1 text-xs text-rose-500">{{ fieldErrors.email }}</p>
          </div>

          <div>
            <label class="block text-xs text-charcoal-600 mb-1">Payment Method</label>
            <select
              v-model="paymentMethod"
              class="w-full rounded-lg border bg-white px-3 py-2 text-sm"
              :class="fieldErrors.paymentMethod ? 'border-rose-400' : 'border-gold-200'"
              @change="validateField('paymentMethod')"
            >
              <option value="" disabled>Select Payment Method</option>
              <option value="GCash">GCash</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
            <p v-if="fieldErrors.paymentMethod" class="mt-1 text-xs text-rose-500">{{ fieldErrors.paymentMethod }}</p>
          </div>
        </div>

        <button
          type="button"
          class="mt-6 w-full rounded-xl bg-gold-700 text-white py-3 font-semibold hover:bg-gold-800 disabled:opacity-60"
          :disabled="saving || !canContinue"
          @click="startPayMongoCheckout"
        >
          {{ saving ? 'Redirecting...' : 'Proceed to PayMongo' }}
        </button>

        <p v-if="selectedPlan && !selectionState.allowed" class="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {{ selectionMessage }}
        </p>

        <button
          type="button"
          class="mt-2 w-full rounded-xl border border-gold-300 text-charcoal-700 py-3 font-semibold hover:bg-gold-50"
          @click="goBack"
        >
          Back to Plans
        </button>
        </section>
      </Transition>

      <Transition name="checkout-panel" appear>
        <section v-if="showPanels" class="checkout-panel delay-1 bg-charcoal-900 text-cream-50 rounded-2xl p-6">
        <h2 class="text-xl font-semibold mb-4">Order Summary</h2>

        <div v-if="selectedPlan" class="space-y-3">
          <div class="flex justify-between items-start gap-2">
            <div>
              <p class="text-lg font-semibold">{{ selectedPlan.name }}</p>
              <p class="text-xs text-cream-200">{{ selectedPlan.description }}</p>
            </div>
            <span class="text-sm px-2 py-1 rounded-full bg-gold-700/30 border border-gold-500/40">{{ selectedPlan.id }}</span>
          </div>

          <div class="border-t border-white/10 pt-3">
            <div class="flex justify-between text-sm">
              <span>Billing Cycle</span>
              <span>{{ selectedPlan.billingCycle || '-' }}</span>
            </div>
            <div class="flex justify-between text-sm mt-2">
              <span>Amount Due</span>
              <span class="font-semibold">{{ formatCurrency(selectedPlan.price) }}</span>
            </div>
          </div>

          <div class="border-t border-white/10 pt-3">
            <p class="text-xs mb-2 text-cream-200">Included Features</p>
            <ul class="text-xs space-y-1 text-cream-100">
              <li v-for="feature in selectedPlan.features" :key="feature">- {{ feature }}</li>
            </ul>
          </div>
        </div>

        <div v-else class="text-sm text-rose-300">
          <span v-if="!selectedPlan">No paid plan selected. Please go back and choose Basic or Premium.</span>
          <span v-else>{{ selectionMessage }}</span>
        </div>
        </section>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { addDoc, collection, doc, getDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import Swal from 'sweetalert2'
import { auth, db } from '@/config/firebaseConfig'
import { onAuthStateChanged } from 'firebase/auth'
import { useSubscriptionStore } from '@/stores/subscription'
import { resolveApiBaseUrl } from '@/utils/apiBaseUrl'
import { getPlanSelectionMessage, getPlanSelectionState, normalizePlanId } from '@/utils/subscriptionPlans'

const route = useRoute()
const router = useRouter()
const subscriptionStore = useSubscriptionStore()

const OTP_API_BASE = resolveApiBaseUrl(import.meta.env.VITE_OTP_API_BASE_URL, {
  devFallbackUrl: 'http://localhost:3000',
})
const PENDING_PAYMONGO_KEY = 'subscription_checkout_pending_paymongo'

const saving = ref(false)
const error = ref('')
const plans = ref([])
const showPanels = ref(false)

const payerFirstName = ref('')
const payerLastName = ref('')
const payerEmail = ref('')
const paymentMethod = ref('')
const fieldErrors = ref({
  firstName: '',
  lastName: '',
  email: '',
  paymentMethod: ''
})

const shouldPrefill = computed(() => String(route.query.from || '').trim().toLowerCase() === 'owner')
const currentPlanId = computed(() => normalizePlanId(route.query.currentPlan || subscriptionStore.activePlan))

const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/

const validateField = (field) => {
  if (field === 'firstName') {
    fieldErrors.value.firstName = payerFirstName.value.trim() ? '' : 'First name is required.'
  }
  if (field === 'lastName') {
    fieldErrors.value.lastName = payerLastName.value.trim() ? '' : 'Last name is required.'
  }
  if (field === 'email') {
    if (!payerEmail.value.trim()) {
      fieldErrors.value.email = 'Email is required.'
    } else if (!emailRegex.test(payerEmail.value.trim())) {
      fieldErrors.value.email = 'Enter a valid email address.'
    } else {
      fieldErrors.value.email = ''
    }
  }
  if (field === 'paymentMethod') {
    fieldErrors.value.paymentMethod = paymentMethod.value ? '' : 'Please select a payment method.'
  }
}

const defaultPlans = () => [
  {
    id: 'free-trial',
    name: 'Free Trial',
    price: 0,
    billingCycle: 'trial',
    description: 'For new clinics trying the platform.',
    features: ['Core modules', 'Limited users', 'Email support'],
    isActive: true,
  },
  {
    id: 'basic',
    name: 'Basic',
    price: 999,
    billingCycle: 'month',
    description: 'Essential tools for daily clinic operations.',
    features: ['Scheduling & billing', 'Staff management', 'Reports'],
    isActive: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 2499,
    billingCycle: 'month',
    description: 'Advanced features and priority support.',
    features: ['Everything in Basic', 'Advanced analytics', 'Priority support'],
    isActive: true,
  },
]

const toCentavos = (pesoAmount) => Math.round(Number(pesoAmount || 0) * 100)

const selectedPlanId = computed(() => normalizePlanId(route.query.plan))

const selectedPlan = computed(() => {
  return plans.value.find((plan) => plan.id === selectedPlanId.value && plan.id !== 'free-trial') || null
})
const selectionState = computed(() => {
  if (!selectedPlan.value) {
    return { allowed: false, reason: 'missing-plan' }
  }
  return getPlanSelectionState(currentPlanId.value, selectedPlan.value.id)
})
const selectionMessage = computed(() => {
  if (!selectedPlan.value) {
    return 'Please choose a Basic or Premium plan first.'
  }
  return getPlanSelectionMessage(currentPlanId.value, selectedPlan.value.id)
})
const canContinue = computed(() => Boolean(selectedPlan.value) && selectionState.value.allowed)

const formatCurrency = (amount) => {
  const value = Number(amount)
  const safe = Number.isFinite(value) ? value : 0
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP', currencyDisplay: 'code',
    minimumFractionDigits: 2,
  }).format(safe)
}

const fetchFromBackend = async (path, options = {}) => {
  const baseUrl = String(OTP_API_BASE || '').trim()
  if (!baseUrl) {
    throw new Error('VITE_OTP_API_BASE_URL is not set.')
  }
  const response = await fetch(`${baseUrl}${path}`, options)
  if (response.status === 404) {
    throw new Error(`Endpoint not found on ${baseUrl}`)
  }
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`Non-JSON response from ${baseUrl}`)
  }
  return response
}

const savePendingPayMongoState = (state) => {
  localStorage.setItem(PENDING_PAYMONGO_KEY, JSON.stringify(state))
}

const loadPendingPayMongoState = () => {
  try {
    const raw = localStorage.getItem(PENDING_PAYMONGO_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (_error) {
    return null
  }
}

const clearPendingPayMongoState = () => {
  localStorage.removeItem(PENDING_PAYMONGO_KEY)
}

const loadPlans = async () => {
  try {
    const snapshot = await getDocs(collection(db, 'subscriptionPlans'))
    const dbPlans = new Map(snapshot.docs.map((docSnap) => [docSnap.id, docSnap.data()]))

    plans.value = defaultPlans().map((base) => {
      const dbPlan = dbPlans.get(base.id) || {}
      return {
        ...base,
        ...dbPlan,
        id: base.id,
        features: Array.isArray(dbPlan.features) ? dbPlan.features : base.features,
        isActive: dbPlan.isActive !== false,
      }
    })
  } catch (err) {
    console.error('Failed to load plans for checkout:', err)
    plans.value = defaultPlans()
  }
}

const validateForm = () => {
  if (!selectedPlan.value) {
    error.value = 'Please select Basic or Premium plan first.'
    return false
  }
  if (!selectionState.value.allowed) {
    error.value = selectionMessage.value
    return false
  }
  if (!selectedPlan.value.isActive) {
    error.value = 'Selected plan is currently inactive.'
    return false
  }
  validateField('firstName')
  validateField('lastName')
  validateField('email')
  validateField('paymentMethod')

  if (fieldErrors.value.firstName || fieldErrors.value.lastName || fieldErrors.value.email || fieldErrors.value.paymentMethod) {
    return false
  }

  error.value = ''
  return true
}

const applyPrefill = (data = {}) => {
  if (!data) return
  if (!payerFirstName.value && data.firstName) {
    payerFirstName.value = String(data.firstName || '').trim()
  }
  if (!payerLastName.value && data.lastName) {
    payerLastName.value = String(data.lastName || '').trim()
  }
  if (!payerEmail.value && data.email) {
    payerEmail.value = String(data.email || '').trim().toLowerCase()
  }
  validateField('firstName')
  validateField('lastName')
  validateField('email')
}

const prefillFromAccount = async () => {
  if (!shouldPrefill.value) return
  const currentUser = auth.currentUser || await new Promise((resolve) => {
    const unsub = onAuthStateChanged(auth, (user) => {
      unsub()
      resolve(user)
    })
  })
  if (!currentUser) return
  try {
    const userSnap = await getDoc(doc(db, 'users', currentUser.uid))
    const userData = userSnap.exists() ? userSnap.data() : {}
    applyPrefill({
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email || currentUser.email
    })
  } catch (err) {
    console.error('Failed to prefill payer info:', err)
  }
}

const createPayMongoCheckoutSession = async () => {
  const method = String(paymentMethod.value || '').trim()
  const paymentMethodTypes =
    method === 'Card'
      ? ['card']
      : method === 'GCash'
        ? ['gcash']
        : method === 'Bank Transfer'
          ? ['dob', 'dob_ubp', 'brankas_bdo', 'brankas_landbank', 'brankas_metrobank']
          : null
  const referenceNumber = `SUB-${Date.now()}`
  const payerName = `${payerFirstName.value || ''} ${payerLastName.value || ''}`.trim()

const flowSuffix = shouldPrefill.value ? '&from=owner' : ''
const successUrl = `${window.location.origin}/subscription/checkout?plan=${selectedPlan.value.id}&paymongo_status=success${flowSuffix}`
const cancelUrl = `${window.location.origin}/subscription/checkout?plan=${selectedPlan.value.id}&paymongo_status=cancelled${flowSuffix}`

  const response = await fetchFromBackend('/paymongo/create-checkout-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      amount: toCentavos(selectedPlan.value.price),
      ...(paymentMethodTypes ? { paymentMethodTypes } : {}),
      description: `Subscription Payment - ${selectedPlan.value.name}`,
      referenceNumber,
      billing: {
        name: payerName,
        email: payerEmail.value.trim().toLowerCase(),
      },
      metadata: {
        module: 'subscription',
        planId: selectedPlan.value.id,
        payerFirstName: payerFirstName.value.trim(),
        payerLastName: payerLastName.value.trim(),
        payerEmail: payerEmail.value.trim().toLowerCase(),
        preferredPaymentMethod: method,
      },
      lineItems: [
        {
          name: selectedPlan.value.name,
          amount: toCentavos(selectedPlan.value.price),
          currency: 'PHP', currencyDisplay: 'code',
          quantity: 1,
        },
      ],
      successUrl,
      cancelUrl,
    }),
  })

  const raw = await response.text()
  let payload = null
  try {
    payload = JSON.parse(raw)
  } catch (_error) {
    throw new Error(`Backend returned non-JSON response (${response.status}). Check backend URL/port and ensure /paymongo endpoints exist.`)
  }

  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Failed to create PayMongo checkout session.')
  }

  return { session: payload.data, referenceNumber }
}

const startPayMongoCheckout = async () => {
  if (!validateForm()) return

  saving.value = true
  try {
    const { session, referenceNumber } = await createPayMongoCheckoutSession()

    savePendingPayMongoState({
      checkoutSessionId: session.id,
      planId: selectedPlan.value.id,
      planName: selectedPlan.value.name,
      amount: Number(selectedPlan.value.price || 0),
      billingCycle: selectedPlan.value.billingCycle || 'month',
      referenceNumber,
      payerFirstName: payerFirstName.value.trim(),
      payerLastName: payerLastName.value.trim(),
      payerEmail: payerEmail.value.trim().toLowerCase(),
      paymentMethod: paymentMethod.value,
      createdAt: Date.now(),
    })

    window.location.href = session.checkout_url
  } catch (err) {
    console.error(err)
    error.value = err?.message || 'Failed to start PayMongo checkout.'
    saving.value = false
  }
}

const handlePayMongoReturn = async () => {
  const status = String(route.query.paymongo_status || '').toLowerCase()
  if (!status) return

  const pending = loadPendingPayMongoState()
  if (!pending?.checkoutSessionId) {
    error.value = 'No pending PayMongo payment found.'
    await router.replace({ path: '/subscription/checkout', query: { plan: selectedPlanId.value || 'basic' } })
    return
  }

  if (status === 'cancelled') {
    clearPendingPayMongoState()
    await Swal.fire({
      title: 'Payment Cancelled',
      text: 'Your PayMongo payment was cancelled.',
      icon: 'info',
      timer: 1600,
      showConfirmButton: false,
    })
    await router.replace({ path: '/subscription/checkout', query: { plan: pending.planId || selectedPlanId.value || 'basic' } })
    return
  }

  if (status !== 'success') return

  saving.value = true
  try {
    const response = await fetchFromBackend(`/paymongo/checkout-session/${pending.checkoutSessionId}`)
    const raw = await response.text()
    let payload = null
    try {
      payload = JSON.parse(raw)
    } catch (_error) {
      throw new Error(`Backend returned non-JSON response (${response.status}). Check backend URL/port and ensure /paymongo endpoints exist.`)
    }

    if (!response.ok || !payload?.success) {
      throw new Error(payload?.error || 'Failed to verify PayMongo payment.')
    }
    if (!payload?.data?.isPaid) {
      throw new Error('Payment is not yet marked as paid in PayMongo.')
    }

    const payments = Array.isArray(payload?.data?.payments) ? payload.data.payments : []
    const firstPayment = payments[0] || {}
    const paymentAttrs = firstPayment?.attributes || {}
    const paymentMethodType =
      paymentAttrs?.payment_method?.type ||
      paymentAttrs?.source?.type ||
      paymentAttrs?.type ||
      null

    const paymentDoc = await addDoc(collection(db, 'planPayments'), {
      planId: pending.planId,
      planName: pending.planName,
      amount: Number(pending.amount || 0),
      currency: 'PHP', currencyDisplay: 'code',
      billingCycle: pending.billingCycle || 'month',
      payerFirstName: pending.payerFirstName,
      payerLastName: pending.payerLastName,
      payerName: `${pending.payerFirstName || ''} ${pending.payerLastName || ''}`.trim(),
      payerEmail: pending.payerEmail,
      paymentMethod: paymentMethodType,
      referenceNumber: pending.referenceNumber,
      paymongoCheckoutSessionId: pending.checkoutSessionId,
      paymongoStatus: payload?.data?.status || null,
      paymongoPaidAt: payload?.data?.paid_at || null,
      paymongoPaymentId: firstPayment?.id || null,
      status: 'Paid',
      source: 'paymongo_checkout',
      createdAt: serverTimestamp(),
    })

    try {
      await fetchFromBackend('/send-payment-receipt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          recipient: pending.payerEmail,
          payerName: `${pending.payerFirstName || ''} ${pending.payerLastName || ''}`.trim(),
          planName: pending.planName,
          amount: Number(pending.amount || 0),
          currency: 'PHP', currencyDisplay: 'code',
          referenceNumber: pending.referenceNumber,
          paymentMethod: paymentMethodType,
        }),
      })
    } catch (emailError) {
      console.error('Failed to send payment receipt email:', emailError)
    }

    clearPendingPayMongoState()

    const currentUser = auth.currentUser || await new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        unsub()
        resolve(user)
      })
    })

    if (shouldPrefill.value && currentUser) {
      const planDays = pending.planId === 'free-trial' ? 14 : 30
      const startedAt = new Date()
      const expiresAt = new Date(startedAt.getTime() + planDays * 24 * 60 * 60 * 1000)
      await Promise.all([
        updateDoc(doc(db, 'users', currentUser.uid), {
          subscriptionPlan: pending.planId,
          paymentStatus: 'Paid',
          paymentId: paymentDoc.id,
          subscriptionStartedAt: startedAt,
          subscriptionExpiresAt: expiresAt,
        }),
        updateDoc(doc(db, 'clinics', currentUser.uid), {
          subscriptionPlan: pending.planId,
          paymentStatus: 'Paid',
          paymentId: paymentDoc.id,
          subscriptionStartedAt: startedAt,
          subscriptionExpiresAt: expiresAt,
        })
      ])

      await subscriptionStore.refreshSubscription()

      await Swal.fire({
        title: 'Payment Successful',
        text: 'Redirecting you back to your subscription settings.',
        icon: 'success',
        timer: 1400,
        showConfirmButton: false,
      })

      await router.replace({ path: '/owner/account/subscription' })
      return
    }

    await Swal.fire({
      title: 'Payment Successful',
      text: 'Redirecting you to clinic registration.',
      icon: 'success',
      timer: 1400,
      showConfirmButton: false,
    })

    try {
      sessionStorage.setItem('register_clinic_draft', JSON.stringify({
        email: pending.payerEmail,
        firstName: pending.payerFirstName,
        lastName: pending.payerLastName,
        selectedPlan: pending.planId,
        paymentStatus: 'paid',
        paymentId: paymentDoc.id,
      }))
      if (pending.payerEmail) {
        sessionStorage.setItem('resume_email', pending.payerEmail)
      }
    } catch (_error) {
      // ignore session storage failures
    }

    await router.replace({
      name: 'register',
      query: {
        account: 'clinic',
        plan: pending.planId,
        paymentId: paymentDoc.id,
        paymentStatus: 'paid',
        firstName: pending.payerFirstName,
        lastName: pending.payerLastName,
        email: pending.payerEmail,
      },
    })
  } catch (err) {
    console.error(err)
    error.value = err?.message || 'Failed to finalize PayMongo payment.'
    await router.replace({ path: '/subscription/checkout', query: { plan: pending.planId || selectedPlanId.value || 'basic' } })
  } finally {
    saving.value = false
  }
}

const goBack = () => {
  if (shouldPrefill.value) {
    router.push({ path: '/owner/account/plans', query: { plan: selectedPlanId.value || 'basic' } })
    return
  }
  router.push({ name: 'subscription-features', query: { plan: selectedPlanId.value || 'basic' } })
}

onMounted(async () => {
  showPanels.value = true
  await subscriptionStore.initSubscription()
  await loadPlans()
  await handlePayMongoReturn()
  await prefillFromAccount()
})

onBeforeRouteLeave((_to, _from, next) => {
  if (!showPanels.value) {
    next()
    return
  }
  showPanels.value = false
  window.setTimeout(() => next(), 260)
})
</script>

<style scoped>

.checkout-panel-enter-active,
.checkout-panel-leave-active {
  transition: opacity 0.32s ease, transform 0.32s ease;
}

.checkout-panel-enter-from,
.checkout-panel-leave-to {
  opacity: 0;
  transform: translateY(16px) scale(0.98);
}

.checkout-panel-enter-active.delay-1 {
  transition-delay: 120ms;
}

.checkout-panel-leave-active.delay-1 {
  transition-delay: 0ms;
}
</style>

