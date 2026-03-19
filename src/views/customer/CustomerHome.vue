<template>
  <div class="flex customer-theme min-h-screen bg-cream-100">
    <CustomerSidebar class="hidden md:block w-64 flex-shrink-0" />

    <main class="flex-1 px-6 md:px-10 py-10">
      <div class="bg-[#7c4a30] border border-[#8f5f46] rounded-2xl shadow-sm p-6 mb-10 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div class="md:col-span-2 relative">
          <input
            v-model="search"
            type="text"
            placeholder="Search center or service..."
            class="h-14 w-full pl-12 pr-4 rounded-lg border border-[#9a6a50] focus:ring-2 focus:ring-[#c79a76] focus:border-[#c79a76] transition bg-[#8b5a3f] text-[#f7eadf] placeholder:text-[#ead3c1]"
          />
          <svg class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#f0d8c5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z"/>
          </svg>
        </div>

        <div class="relative">
          <select v-model="city" class="h-14 w-full rounded-lg border border-[#9a6a50] bg-[#8b5a3f] px-4 text-[#f7eadf] focus:ring-2 focus:ring-[#c79a76] focus:border-[#c79a76]">
            <option value="">All Cities</option>
            <option v-for="option in cities" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>

        <div class="relative">
          <select v-model="service" class="h-14 w-full rounded-lg border border-[#9a6a50] bg-[#8b5a3f] px-4 text-[#f7eadf] focus:ring-2 focus:ring-[#c79a76] focus:border-[#c79a76]">
            <option value="">All Services</option>
            <option v-for="option in services" :key="option" :value="option">{{ option }}</option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="text-charcoal-500 text-center py-16">Loading centers...</div>
      <div v-else-if="errorMessage" class="text-red-500 text-center py-16">{{ errorMessage }}</div>
      <div v-else-if="filteredCenters.length" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
        <div
          v-for="center in filteredCenters"
          :key="center.id"
          class="bg-white border border-gold-200 rounded-2xl shadow-sm hover:shadow-xl transition duration-300"
        >
          <div class="h-44 bg-gradient-to-br from-gold-100 to-cream-200 rounded-t-2xl overflow-hidden">
            <img v-if="center.bannerPicture" :src="center.bannerPicture" alt="Center banner" class="h-full w-full object-cover" />
          </div>

          <div class="p-6 flex flex-col justify-between h-64">
            <div>
              <h3 class="text-lg font-semibold text-charcoal-800">{{ center.name }}</h3>
              <p class="text-sm text-charcoal-500 mt-1">{{ center.location || 'Location not set' }}</p>

              <div class="flex flex-wrap gap-2 mt-4">
                <span v-for="tag in center.services.slice(0, 4)" :key="tag" class="text-xs px-3 py-1 bg-gold-100 text-gold-700 rounded-full">
                  {{ tag }}
                </span>
              </div>
            </div>

            <div class="flex items-center justify-between mt-6">
              <span class="text-sm text-charcoal-600">
                {{ center.rating > 0 ? `Rating ${center.rating.toFixed(1)}` : 'New center' }}
              </span>

              <button
                @click="openCenter(center.id)"
                class="px-4 py-2 bg-gold-700 text-white rounded-lg hover:bg-gold-800 transition"
              >
                View Center
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-24 text-charcoal-400">No centers found.</div>

      <section class="mt-12 bg-white border border-gold-200 rounded-2xl p-6 shadow-sm">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 class="text-xl font-semibold text-charcoal-800">Nearby You</h2>
            <p class="text-sm text-charcoal-500">Enable your location to see the closest clinics around you.</p>
          </div>
          <button
            type="button"
            @click="enableLocation"
            :disabled="locating"
            class="px-4 py-2 bg-gold-700 text-white rounded-lg hover:bg-gold-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {{ locating ? 'Locating...' : 'Enable Location' }}
          </button>
        </div>

        <p v-if="locationError" class="mt-3 text-sm text-red-500">{{ locationError }}</p>

        <div v-if="userLocation" class="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <div
            v-for="center in nearbyCenters"
            :key="`nearby-${center.id}`"
            class="border border-gold-200 rounded-2xl p-5 bg-cream-100/70"
          >
            <div class="flex items-center justify-between">
              <h3 class="text-base font-semibold text-charcoal-800">{{ center.name }}</h3>
              <span class="text-xs text-charcoal-500">{{ center.distanceLabel }}</span>
            </div>
            <p class="text-sm text-charcoal-500 mt-1">{{ center.location || 'Location not set' }}</p>
            <div class="flex flex-wrap gap-2 mt-4">
              <span v-for="tag in center.services.slice(0, 3)" :key="`nearby-${center.id}-${tag}`" class="text-xs px-3 py-1 bg-gold-100 text-gold-700 rounded-full">
                {{ tag }}
              </span>
            </div>
            <div class="flex items-center justify-between mt-4">
              <span class="text-xs text-charcoal-600">
                {{ center.rating > 0 ? `Rating ${center.rating.toFixed(1)}` : 'New center' }}
              </span>
              <button
                @click="openCenter(center.id)"
                class="px-3 py-1.5 bg-gold-700 text-white rounded-lg hover:bg-gold-800 transition text-xs"
              >
                View
              </button>
            </div>
          </div>
        </div>

        <p v-else class="mt-6 text-sm text-charcoal-500">No nearby centers yet. Enable location to see results.</p>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import CustomerSidebar from '@/components/sidebar/CustomerSidebar.vue'
import { fetchCustomerCenters } from '@/utils/customerCenters'

const router = useRouter()
const loading = ref(true)
const errorMessage = ref('')
const centers = ref([])

const search = ref('')
const city = ref('')
const service = ref('')
const locating = ref(false)
const locationError = ref('')
const userLocation = ref(null)

const cities = computed(() => [...new Set(centers.value.map((item) => item.city).filter(Boolean))])
const services = computed(() => [...new Set(centers.value.flatMap((item) => item.services).filter(Boolean))])

const filteredCenters = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return centers.value.filter((center) => {
    const matchesKeyword =
      !keyword ||
      center.name.toLowerCase().includes(keyword) ||
      center.services.some((entry) => entry.toLowerCase().includes(keyword))
    const matchesCity = !city.value || center.city === city.value
    const matchesService = !service.value || center.services.includes(service.value)
    return matchesKeyword && matchesCity && matchesService
  })
})

const toRad = (value) => (Number(value) * Math.PI) / 180
const distanceKm = (a, b) => {
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

const nearbyCenters = computed(() => {
  if (!userLocation.value) return []
  const origin = userLocation.value
  return centers.value
    .filter((center) => Number.isFinite(center.lat) && Number.isFinite(center.lng))
    .map((center) => {
      const km = distanceKm(origin, { lat: center.lat, lng: center.lng })
      return {
        ...center,
        distanceKm: km,
        distanceLabel: `${km.toFixed(1)} km`
      }
    })
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 6)
})

const enableLocation = () => {
  locationError.value = ''
  if (!navigator.geolocation) {
    locationError.value = 'Geolocation is not supported by this browser.'
    return
  }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      userLocation.value = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude
      }
      locating.value = false
    },
    () => {
      locationError.value = 'Unable to access your location. Please allow location access.'
      locating.value = false
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
  )
}

const openCenter = (centerId) => {
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
</script>
