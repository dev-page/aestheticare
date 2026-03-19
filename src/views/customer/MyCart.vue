<template>
  <div class="flex customer-theme bg-slate-900 min-h-screen">
    <CustomerSidebar />

    <main class="flex-1 p-8">
      <h1 class="text-2xl font-bold text-white mb-6">My Cart</h1>

      <div v-if="cartItems.length === 0" class="text-slate-300">Your cart is empty.</div>

      <div v-else class="space-y-6">
        <div
          v-for="item in cartItems"
          :key="item.id"
          class="bg-slate-800 rounded-lg shadow-md p-4 border border-slate-700 flex gap-4 items-start"
        >
          <input type="checkbox" v-model="item.selected" class="mt-2 h-5 w-5 accent-purple-600" />

          <div class="w-24 h-24 bg-slate-700 rounded-lg overflow-hidden">
            <img v-if="item.imageUrl" :src="item.imageUrl" alt="Product image" class="h-full w-full object-cover" />
          </div>

          <div class="flex-1">
            <h2 class="text-white font-semibold">{{ item.name }}</h2>
            <p class="text-slate-400 text-sm">Variation: {{ item.variation || 'Default' }}</p>
            <p class="text-slate-400 text-sm">Center: {{ item.branchName || 'AesthetiCare' }}</p>
            <p class="text-purple-400 font-semibold mt-1">PHP {{ Number(item.price || 0).toFixed(2) }}</p>

            <div class="flex items-center gap-2 mt-3">
              <button @click="decreaseQty(item)" class="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded">-</button>
              <span class="text-white">{{ item.quantity }}</span>
              <button @click="increaseQty(item)" class="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded">+</button>
            </div>
          </div>

          <button @click="removeItem(item.id)" class="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded">Remove</button>
        </div>
      </div>

      <div class="bg-slate-800 rounded-lg shadow-md p-6 border border-slate-700 mt-8">
        <div class="flex justify-between items-center mb-4">
          <p class="text-white text-lg font-semibold">Selected Items: {{ selectedItems.length }}</p>
          <p class="text-white text-lg font-semibold">Subtotal: PHP {{ cartSubtotal.toFixed(2) }}</p>
        </div>

        <div class="flex justify-between items-center">
          <p class="text-slate-400 text-sm">Review your selected products before checkout.</p>
          <button
            @click="checkout"
            class="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg"
            :disabled="selectedItems.length === 0"
          >
            Check Out
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import CustomerSidebar from '@/components/sidebar/CustomerSidebar.vue'
import { removeCartItem, readCart, saveCheckoutItems, writeCart } from '@/utils/customerCart'

const router = useRouter()
const cartItems = ref(readCart())

watch(
  cartItems,
  (items) => {
    writeCart(items)
  },
  { deep: true }
)

const increaseQty = (item) => {
  item.quantity = Number(item.quantity || 1) + 1
}

const decreaseQty = (item) => {
  item.quantity = Math.max(1, Number(item.quantity || 1) - 1)
}

const removeItem = (itemId) => {
  cartItems.value = removeCartItem(itemId)
}

const selectedItems = computed(() => cartItems.value.filter((item) => item.selected))
const cartSubtotal = computed(() => selectedItems.value.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0))

const checkout = () => {
  if (!selectedItems.value.length) return
  saveCheckoutItems(selectedItems.value)
  router.push({ name: 'customer-checkout' })
}
</script>
