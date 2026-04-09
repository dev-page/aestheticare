<template>
  <nav class="fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-gold-50 via-cream-100 to-gold-200 border-b border-gold-400/30">
    <div class="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8 h-16">
      <div class="flex items-center gap-2">
        <img
          src="@/assets/logo_no_bg.png"
          alt="AesthetiCare logo"
          class="h-10 w-10 object-contain"
        />
        <img
          src="@/assets/brand_name.png"
          alt="AesthetiCare"
          class="h-6 sm:h-7 md:h-8 object-contain"
        />
      </div>
      <div class="flex items-center gap-4">
        <router-link to="/" class="text-sm text-charcoal-700 hover:text-gold-700">Homepage</router-link>
        <router-link to="/login" class="text-sm text-charcoal-700 hover:text-gold-700">Login</router-link>
      </div>
    </div>
  </nav>

  <main class="max-w-7xl mx-auto px-6 py-8 pt-24">
    <div class="bg-cream-50/90 border border-gold-200/60 rounded-2xl shadow-md p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
      <div class="md:col-span-2 relative">
        <input
          v-model="search"
          type="text"
          placeholder="Search center or service..."
          class="h-14 w-full pl-12 pr-4 rounded-lg border border-gold-200 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition bg-white/80 text-charcoal-800"
        />
        <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z"/>
        </svg>
      </div>

      <select v-model="city" class="h-14 w-full rounded-lg border border-gold-200 bg-white px-4 text-charcoal-800">
        <option value="">All Cities</option>
        <option v-for="option in cities" :key="option" :value="option">{{ option }}</option>
      </select>

      <select v-model="service" class="h-14 w-full rounded-lg border border-gold-200 bg-white px-4 text-charcoal-800">
        <option value="">All Services</option>
        <option v-for="option in services" :key="option" :value="option">{{ option }}</option>
      </select>
    </div>

    <div v-if="loading" class="text-center py-20 text-charcoal-500">Loading centers...</div>
    <div v-else-if="errorMessage" class="text-center py-20 text-red-500">{{ errorMessage }}</div>
    <div v-else-if="filteredCenters.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="center in filteredCenters"
        :key="center.id"
        class="bg-cream-50 border border-gold-200/60 rounded-2xl overflow-hidden shadow hover:shadow-xl transform hover:-translate-y-1 transition"
      >
        <div class="h-44 w-full bg-gradient-to-br from-gold-100 to-cream-200 rounded-t-2xl overflow-hidden">
          <img v-if="center.bannerPicture" :src="center.bannerPicture" alt="Center banner" class="h-full w-full object-cover" />
        </div>

        <div class="p-5 flex flex-col justify-between h-60">
          <div>
            <h3 class="text-xl font-semibold text-charcoal-800">{{ center.name }}</h3>
            <p class="text-charcoal-500 mt-1">{{ center.location || 'Location not set' }}</p>

            <div class="flex flex-wrap gap-2 mt-3">
              <span
                v-for="tag in center.services.slice(0, 4)"
                :key="tag"
                class="text-xs px-2 py-1 bg-gold-100/80 text-gold-700 rounded-full font-medium border border-gold-200/60"
              >
                {{ tag }}
              </span>
            </div>
          </div>

          <div class="flex items-center justify-between mt-4">
            <span class="text-sm text-charcoal-500">
              {{ center.rating > 0 ? `Rating ${center.rating.toFixed(1)}` : 'New center' }}
            </span>

            <button @click="openCenter(center.id)" class="px-4 py-2 bg-gold-700 text-white rounded-xl font-medium hover:bg-gold-800 transition">
              View Center
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-20 text-charcoal-400">No aesthetic centers found.</div>
  </main>

  <transition name="fade">
    <div v-if="showRedirectPopup" class="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-4 sm:items-center">
      <div class="w-full max-w-md rounded-2xl border border-gold-200 bg-white p-6 shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <h3 class="text-lg font-semibold text-charcoal-800">Redirecting...</h3>
        <p class="text-sm text-charcoal-500 mt-1">Please wait while we redirect you to login.</p>
        <div class="mt-5 h-2 w-full bg-gold-100 rounded-full overflow-hidden">
          <div class="h-full bg-gold-700 redirect-bar"></div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/config/firebaseConfig'
import { fetchCustomerCenters } from '@/utils/customerCenters'

const router = useRouter()
const loading = ref(false)
const errorMessage = ref('')
const centers = ref([])
const showRedirectPopup = ref(false)
const search = ref('')
const city = ref('')
const service = ref('')
let redirectTimeout = null

const cities = computed(() => [...new Set(centers.value.map((item) => item.city).filter(Boolean))])
const services = computed(() => [...new Set(centers.value.flatMap((item) => item.services).filter(Boolean))])

const filteredCenters = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return centers.value.filter((center) => {
    const matchesSearch =
      !keyword ||
      center.name.toLowerCase().includes(keyword) ||
      center.services.some((entry) => entry.toLowerCase().includes(keyword))
    const matchesCity = !city.value || center.city === city.value
    const matchesService = !service.value || center.services.includes(service.value)
    return matchesSearch && matchesCity && matchesService
  })
})

const openCenter = (centerId) => {
  if (!auth.currentUser) {
    showRedirectPopup.value = true
    if (redirectTimeout) clearTimeout(redirectTimeout)
    redirectTimeout = setTimeout(() => {
      router.push({ path: '/login', query: { redirect: `/customer/center/${centerId}` } })
      showRedirectPopup.value = false
    }, 1700)
    return
  }
  router.push({ name: 'customer-center', params: { id: centerId } })
}

onMounted(async () => {
  loading.value = true
  errorMessage.value = ''
  try {
    centers.value = await fetchCustomerCenters()
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Failed to load centers.'
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  if (redirectTimeout) clearTimeout(redirectTimeout)
})
</script>

<style scoped>
.redirect-bar {
  width: 100%;
  transform-origin: left;
  animation: loadingBar 1.7s linear forwards;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@keyframes loadingBar {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
</style>
