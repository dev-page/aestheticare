<template>
  <div class="flex customer-theme bg-slate-900 min-h-screen">
    <CustomerSidebar />

    <main class="flex-1 p-8">
      <button
        type="button"
        class="mb-3 inline-flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
        @click="goBack"
      >
        <span class="text-lg leading-none">‹</span>
        <span class="text-sm font-medium">Back</span>
      </button>

      <h1 class="text-2xl font-bold text-white mb-6">Checkout</h1>

      <div class="bg-slate-800 rounded-lg shadow-md p-6 border border-slate-700 mb-8">
        <h2 class="text-xl font-semibold text-purple-400 mb-4">Order Summary</h2>
        <div v-for="item in selectedItems" :key="item.id" class="flex justify-between items-center border-b border-slate-700 py-3">
          <div>
            <p class="text-white font-medium">{{ item.name }}</p>
            <p class="text-slate-400 text-sm">Qty: {{ item.quantity }}</p>
          </div>
          <p class="text-purple-400 font-semibold">PHP {{ (Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2) }}</p>
        </div>
        <div class="mt-4 space-y-2">
          <div class="flex justify-between text-slate-300">
            <span>Subtotal</span>
            <span>PHP {{ subtotal.toFixed(2) }}</span>
          </div>
          <div class="flex justify-between text-white font-semibold text-lg mt-2">
            <span>Total</span>
            <span>PHP {{ subtotal.toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <div class="bg-slate-800 rounded-lg shadow-md p-6 border border-slate-700 mb-8">
        <h2 class="text-xl font-semibold text-purple-400 mb-4">Delivery Information</h2>
        <form class="space-y-4">
          <input type="text" placeholder="Full Name" v-model="delivery.fullName" class="w-full p-3 rounded bg-slate-700 text-white border border-slate-600" />
          <input type="text" placeholder="Address" v-model="delivery.address" class="w-full p-3 rounded bg-slate-700 text-white border border-slate-600" />
          <input type="text" placeholder="Phone Number" v-model="delivery.phone" class="w-full p-3 rounded bg-slate-700 text-white border border-slate-600" />
        </form>
      </div>

      <div class="bg-slate-800 rounded-lg shadow-md p-6 border border-slate-700 mb-8">
        <h2 class="text-xl font-semibold text-purple-400 mb-4">Payment Method</h2>
        <div class="space-y-3">
          <label class="flex items-center gap-2 text-white">
            <input type="radio" value="Cash" v-model="paymentMethod" />
            Cash
          </label>
          <label class="flex items-center gap-2 text-white">
            <input type="radio" value="GCash" v-model="paymentMethod" />
            GCash
          </label>
          <label class="flex items-center gap-2 text-white">
            <input type="radio" value="Card" v-model="paymentMethod" />
            Credit/Debit Card
          </label>
        </div>
      </div>

      <div class="flex justify-end">
        <button @click="placeOrder" class="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold">
          Place Order
        </button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/config/firebaseConfig'
import CustomerSidebar from '@/components/sidebar/CustomerSidebar.vue'
import { clearCheckoutItems, readCart, readCheckoutItems, writeCart } from '@/utils/customerCart'
import { toast } from 'vue3-toastify'

const router = useRouter()
const selectedItems = ref([])
const paymentMethod = ref('Cash')

const delivery = ref({
  fullName: '',
  address: '',
  phone: '',
})

const subtotal = computed(() => selectedItems.value.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))

const goBack = () => {
  if (window.history.length > 1) {
    router.back()
    return
  }
  router.push({ name: 'customer-cart' })
}

const removePurchasedFromCart = () => {
  const selectedIds = new Set(selectedItems.value.map((item) => item.id))
  const nextCart = readCart().filter((item) => !selectedIds.has(item.id))
  writeCart(nextCart)
}

const placeOrder = async () => {
  if (!selectedItems.value.length) {
    toast.error('No selected items to checkout.')
    return
  }
  if (!delivery.value.fullName || !delivery.value.address || !delivery.value.phone) {
    toast.error('Please complete delivery details.')
    return
  }

  try {
    await addDoc(collection(db, 'customerOrders'), {
      customerId: auth.currentUser?.uid || '',
      items: selectedItems.value,
      delivery: delivery.value,
      paymentMethod: paymentMethod.value,
      total: subtotal.value,
      createdAt: serverTimestamp(),
    })
  } catch (error) {
    console.error(error)
  }

  removePurchasedFromCart()
  clearCheckoutItems()
  toast.success('Order placed successfully.')
  router.push({ name: 'customer-home' })
}

onMounted(() => {
  selectedItems.value = readCheckoutItems()
  if (!selectedItems.value.length) {
    router.push({ name: 'customer-cart' })
  }
})
</script>
