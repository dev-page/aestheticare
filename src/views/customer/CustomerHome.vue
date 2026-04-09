<template>
  <div class="customer-home-shell flex customer-theme min-h-screen bg-cream-100">
    <CustomerSidebar class="flex-shrink-0" />

    <main class="customer-home-main flex-1 px-0 md:px-0 py-0">
      <div class="customer-search-rail sticky top-14 z-30 w-full pl-6 md:pl-10 pr-6 md:pr-10 py-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end rounded-bl-2xl rounded-br-2xl">
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

      <div class="customer-home-content px-6 md:px-10 py-8">
      <section class="customer-nearby-card mt-0 mb-10 bg-white border border-gold-200 rounded-2xl p-6 md:p-8 shadow-sm">
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

      <div v-if="loading" class="state-panel text-charcoal-500 text-center py-16">Loading centers...</div>
      <div v-else-if="errorMessage" class="state-panel text-red-500 text-center py-16">{{ errorMessage }}</div>
      <div v-else-if="filteredCenters.length" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
        <div
          v-for="center in filteredCenters"
          :key="center.id"
          class="customer-center-card bg-white border border-gold-200 rounded-2xl shadow-sm hover:shadow-xl transition duration-300"
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

      <div v-else class="state-panel text-center py-24 text-charcoal-400">No centers found.</div>
      </div>

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

<style scoped>
.customer-home-shell {
  background:
    radial-gradient(circle at top left, rgba(241, 212, 170, 0.34), transparent 26%),
    radial-gradient(circle at 82% 8%, rgba(198, 148, 108, 0.2), transparent 20%),
    linear-gradient(180deg, #25150f 0%, #1b100b 100%);
}

.customer-home-main {
  min-width: 0;
  background:
    radial-gradient(circle at top left, rgba(241, 212, 170, 0.34), transparent 26%),
    radial-gradient(circle at 82% 8%, rgba(198, 148, 108, 0.2), transparent 20%),
    linear-gradient(180deg, #fbf5e8 0%, #f8ecd9 52%, #f4e1c6 100%);
}

.customer-search-rail {
  background:
    linear-gradient(180deg, #7a4a30 0%, #6b4028 100%);
  border-bottom: 1px solid rgba(230, 193, 150, 0.18);
  box-shadow: 0 10px 24px rgba(54, 34, 22, 0.14);
}

.customer-home-content {
  display: grid;
  gap: 1.5rem;
}

.customer-nearby-card,
.state-panel,
.customer-center-card {
  border-radius: 1.75rem;
  border: 1px solid rgba(230, 193, 150, 0.8);
  box-shadow: 0 18px 44px rgba(87, 56, 35, 0.08);
}

.customer-nearby-card {
  background: rgba(255, 255, 255, 0.82) !important;
}

.state-panel {
  background: rgba(255, 255, 255, 0.72);
}

.customer-center-card {
  overflow: hidden;
  background: rgba(255, 251, 244, 0.96);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.customer-center-card:hover {
  transform: translateY(-6px);
  box-shadow: 0 30px 72px rgba(84, 54, 34, 0.18);
}

.customer-search-rail input,
.customer-search-rail select {
  height: 3.45rem;
  border-radius: 1rem;
  border: 1px solid rgba(230, 193, 150, 0.72);
  background: rgba(139, 90, 63, 0.9) !important;
  color: #fff3e6 !important;
}

.customer-search-rail input::placeholder {
  color: rgba(255, 242, 228, 0.72);
}

.customer-search-rail input:focus,
.customer-search-rail select:focus {
  outline: none;
  border-color: rgba(248, 229, 189, 0.95);
  box-shadow: 0 0 0 4px rgba(214, 169, 123, 0.16);
}

.customer-search-rail svg {
  color: rgba(255, 242, 228, 0.92);
}

.customer-search-rail option {
  color: #342419;
}

.customer-nearby-card h2,
.customer-center-card h3 {
  font-family: "Playfair Display", "Times New Roman", serif;
}

.customer-nearby-card button,
.customer-center-card button {
  border-radius: 0.9rem;
  background: linear-gradient(120deg, #8d5a3b 0%, #6e4330 100%);
  border: 1px solid rgba(126, 78, 53, 0.24);
  box-shadow: 0 14px 26px rgba(111, 63, 42, 0.14);
}

.customer-nearby-card .bg-gold-700,
.customer-center-card .bg-gold-700 {
  background: linear-gradient(120deg, #b57f5c 0%, #8d5a3b 48%, #6e4330 100%) !important;
}

.customer-nearby-card .bg-gold-100,
.customer-center-card .bg-gold-100 {
  background: #fbf1dc !important;
  color: #8a5b3d !important;
  border: 1px solid rgba(230, 193, 150, 0.8);
}

.customer-nearby-card .border-gold-200,
.customer-center-card .border-gold-200 {
  border-color: rgba(230, 193, 150, 0.8) !important;
}

.customer-nearby-card .bg-cream-100\/70 {
  background: rgba(255, 247, 231, 0.72) !important;
}

.customer-center-card .text-charcoal-500,
.customer-nearby-card .text-charcoal-500,
.customer-center-card .text-charcoal-600 {
  color: rgba(76, 54, 40, 0.76) !important;
}

.customer-home-main > .px-6 {
  padding-top: 1.35rem;
}

@media (max-width: 767px) {
  .customer-search-rail {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}
</style>
