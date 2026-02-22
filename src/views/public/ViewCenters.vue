<template>
  <nav class="fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-gold-50 via-cream-100 to-gold-200 backdrop-blur-xl border-b border-gold-400/30">
      <div class="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8 h-16">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-gold-500 to-gold-700"></div>
          <span class="text-lg tracking-wide text-charcoal-900">AesthetiCare</span>
        </div>

        <div class="hidden md:flex items-center gap-6 lg:gap-10">
          <ul class="flex items-center gap-6 lg:gap-10 text-[11px] tracking-[0.2em] uppercase text-charcoal-600">
            <li>
              <router-link to="/"
                class="relative text-charcoal-700 hover:text-gold-700 hover:font-bold transition-all duration-300
                      before:absolute before:left-0 before:bottom-[-4px] before:w-0 before:h-[2px] before:bg-gold-700
                      before:transition-all before:duration-300 hover:before:w-full"
              >
                Homepage
              </router-link>
            </li>
          </ul>

          <div ref="dropdownRef" class="relative inline-block text-left">
            <button
              @click="toggleDropdown"
              class="inline-flex justify-center w-full px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-gold-700 text-gold-700 text-xs sm:text-sm tracking-widest uppercase hover:bg-gold-700 hover:text-white transition focus:outline-none"
            >
              Guest Account
              <svg
                class="ml-2 -mr-1 h-4 w-4 text-gold-700 group-hover:text-white transition"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div
              v-show="isOpen"
              class="absolute right-0 mt-2 w-40 origin-top-right bg-cream-50 border border-gold-200 rounded-md shadow-lg ring-1 ring-gold-900/10 focus:outline-none z-50"
            >
              <div class="py-1">
                <button
                  @click="select('Guest Account')"
                  class="w-full text-left px-4 py-2 text-sm text-gold-700 bg-gold-100/60 font-medium"
                >
                  Guest Account
                </button>
                <router-link
                  to="/login"
                  class="block px-4 py-2 text-sm text-charcoal-700 hover:bg-gold-100 hover:text-gold-700 transition"
                >
                  Login
                </router-link>
                <router-link
                  to="/register"
                  class="block px-4 py-2 text-sm text-charcoal-700 hover:bg-gold-100 hover:text-gold-700 transition"
                >
                  Register
                </router-link>
              </div>
            </div>
          </div>
        </div>

        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg border border-gold-500/60 text-gold-700 hover:bg-gold-100 transition"
          aria-label="Toggle navigation menu"
        >
          <svg v-if="!isMobileMenuOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </nav>

  <transition name="menu-overlay">
    <div
      v-if="isMobileMenuOpen"
      class="md:hidden fixed inset-0 z-[60] bg-charcoal-900/40 backdrop-blur-[2px]"
      @click="closeMobileMenu"
    ></div>
  </transition>

  <transition name="sidebar-menu">
    <aside
      v-if="isMobileMenuOpen"
      class="md:hidden fixed top-0 right-0 h-screen w-[84%] max-w-[340px] z-[70] bg-gradient-to-b from-gold-50 via-cream-100 to-gold-100 border-l border-gold-300/40 shadow-2xl flex flex-col"
    >
      <div class="h-16 px-4 flex items-center justify-between border-b border-gold-300/40">
        <span class="text-xs tracking-[0.24em] uppercase text-charcoal-700">Menu</span>
        <button
          @click="closeMobileMenu"
          class="inline-flex items-center justify-center h-9 w-9 rounded-md border border-gold-500/50 text-gold-700 hover:bg-gold-100 transition"
          aria-label="Close navigation menu"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-5 flex flex-col text-xs tracking-[0.2em] uppercase text-charcoal-700">
        <div class="flex flex-col gap-2">
          <router-link to="/" @click="closeMobileMenu" class="py-2 border-b border-gold-200/70 transition-all duration-200 hover:text-gold-700 hover:pl-1">Homepage</router-link>
        </div>

        <div class="mt-auto pt-6 flex flex-col gap-3">
          <button
            type="button"
            class="px-4 py-3 rounded-full border border-gold-700 text-gold-700 text-center transition hover:bg-gold-50"
          >
            Guest Account
          </button>
          <router-link
            to="/login"
            @click="closeMobileMenu"
            class="px-4 py-3 rounded-full border border-gold-700 text-gold-700 text-center transition hover:bg-gold-50"
          >
            Login
          </router-link>
          <router-link
            to="/register"
            @click="closeMobileMenu"
            class="px-4 py-3 rounded-full bg-gold-700 text-white text-center transition hover:bg-gold-800"
          >
            Register
          </router-link>
        </div>
      </div>
    </aside>
  </transition>

<main class="max-w-7xl mx-auto px-6 py-8 pt-24">
  <div class="bg-cream-50/90 border border-gold-200/60 rounded-2xl shadow-md p-6 mb-8 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
    <div class="md:col-span-2 relative">
      <input
        v-model="search"
        type="text"
        placeholder="Search aesthetic center or service..."
        class="peer input h-14 w-full pl-12 pr-4 rounded-lg border border-gold-200 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition bg-white/80 text-charcoal-800 placeholder-charcoal-400"
      />
      <svg
        class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1110.5 3a7.5 7.5 0 016.15 13.65z"/>
      </svg>
    </div>

    <div ref="cityDropdownRef" class="relative">
      <button
        type="button"
        @click="toggleCityDropdown"
        class="input h-14 w-full rounded-lg border border-gold-200 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition bg-white/80 text-charcoal-800 px-4 flex items-center justify-between"
      >
        <span>{{ city || 'All Cities' }}</span>
        <svg class="w-4 h-4 text-gold-600 transition-transform" :class="{ 'rotate-180': isCityDropdownOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        v-show="isCityDropdownOpen"
        class="absolute left-0 right-0 mt-2 max-h-56 overflow-auto rounded-lg border border-gold-200 bg-cream-50 shadow-lg z-30"
      >
        <button @click="selectCity('')" class="w-full text-left px-4 py-3 text-sm text-charcoal-700 hover:bg-gold-100/70 transition">All Cities</button>
        <button
          v-for="c in cities"
          :key="c"
          @click="selectCity(c)"
          class="w-full text-left px-4 py-3 text-sm text-charcoal-700 hover:bg-gold-100/70 transition"
        >
          {{ c }}
        </button>
      </div>
    </div>

    <div ref="serviceDropdownRef" class="relative">
      <button
        type="button"
        @click="toggleServiceDropdown"
        class="input h-14 w-full rounded-lg border border-gold-200 focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition bg-white/80 text-charcoal-800 px-4 flex items-center justify-between"
      >
        <span>{{ service || 'All Services' }}</span>
        <svg class="w-4 h-4 text-gold-600 transition-transform" :class="{ 'rotate-180': isServiceDropdownOpen }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        v-show="isServiceDropdownOpen"
        class="absolute left-0 right-0 mt-2 max-h-56 overflow-auto rounded-lg border border-gold-200 bg-cream-50 shadow-lg z-30"
      >
        <button @click="selectService('')" class="w-full text-left px-4 py-3 text-sm text-charcoal-700 hover:bg-gold-100/70 transition">All Services</button>
        <button
          v-for="s in services"
          :key="s"
          @click="selectService(s)"
          class="w-full text-left px-4 py-3 text-sm text-charcoal-700 hover:bg-gold-100/70 transition"
        >
          {{ s }}
        </button>
      </div>
    </div>
  </div>

  <div v-if="filteredCenters.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
    <div
      v-for="center in filteredCenters"
      :key="center.id"
      class="bg-cream-50 border border-gold-200/60 rounded-2xl overflow-hidden shadow hover:shadow-xl transform hover:-translate-y-1 transition"
    >
      <div class="h-44 w-full bg-gradient-to-br from-gold-100 to-cream-200 rounded-t-2xl overflow-hidden">
        <!--Image dito-->
      </div>

      <div class="p-5 flex flex-col justify-between h-60">
        <div>
          <h3 class="text-xl font-semibold text-charcoal-800">{{ center.name }}</h3>
          <p class="text-charcoal-500 mt-1">{{ center.city }}, Cavite</p>

          <div class="flex flex-wrap gap-2 mt-3">
            <span
              v-for="tag in center.services"
              :key="tag"
              class="text-xs px-2 py-1 bg-gold-100/80 text-gold-700 rounded-full font-medium border border-gold-200/60"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div class="flex items-center justify-between mt-4">
          <span class="flex items-center text-sm text-charcoal-500">
            <svg
              class="w-4 h-4 mr-1 text-gold-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.95a1 1 0 00.95.69h4.15c.969 0 1.371 1.24.588 1.81l-3.36 2.44a1 1 0 00-.364 1.118l1.286 3.95c.3.921-.755 1.688-1.54 1.118l-3.36-2.44a1 1 0 00-1.175 0l-3.36 2.44c-.784.57-1.838-.197-1.539-1.118l1.285-3.95a1 1 0 00-.364-1.118L2.075 9.377c-.783-.57-.38-1.81.588-1.81h4.15a1 1 0 00.951-.69l1.285-3.95z"/>
            </svg>
            {{ center.rating }}
          </span>

          <button
            class="px-4 py-2 bg-gold-700 text-white rounded-xl font-medium hover:bg-gold-800 transition w-28 sm:w-auto"
          >
            View Center
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- No Results -->
  <div v-else class="text-center py-20 text-charcoal-400">
    <svg class="mx-auto w-16 h-16 mb-4 text-gold-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
        d="M9 17v-4a4 4 0 018 0v4M5 21h14a2 2 0 002-2v-5a7 7 0 00-14 0v5a2 2 0 002 2z"/>
    </svg>
    No aesthetic centers found.
  </div>
</main>

</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const isOpen = ref(false)
const dropdownRef = ref(null)
const isCityDropdownOpen = ref(false)
const cityDropdownRef = ref(null)
const isServiceDropdownOpen = ref(false)
const serviceDropdownRef = ref(null)
const isMobileMenuOpen = ref(false)

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const toggleCityDropdown = () => {
  isCityDropdownOpen.value = !isCityDropdownOpen.value
  if (isCityDropdownOpen.value) {
    isServiceDropdownOpen.value = false
  }
}

const toggleServiceDropdown = () => {
  isServiceDropdownOpen.value = !isServiceDropdownOpen.value
  if (isServiceDropdownOpen.value) {
    isCityDropdownOpen.value = false
  }
}

const selectCity = (value) => {
  city.value = value
  isCityDropdownOpen.value = false
}

const selectService = (value) => {
  service.value = value
  isServiceDropdownOpen.value = false
}

const select = (option) => {
  // Do nothing when Guest Account is selected
  if (option === 'Guest Account') {
    isOpen.value = false
    return
  }
  alert(`Selected: ${option}`)
  isOpen.value = false
}
const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false
  }
  if (cityDropdownRef.value && !cityDropdownRef.value.contains(event.target)) {
    isCityDropdownOpen.value = false
  }
  if (serviceDropdownRef.value && !serviceDropdownRef.value.contains(event.target)) {
    isServiceDropdownOpen.value = false
  }
}
onMounted(() => {
  window.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  window.removeEventListener('click', handleClickOutside)
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
})

watch(isMobileMenuOpen, (isOpenMobile) => {
  document.body.style.overflow = isOpenMobile ? 'hidden' : ''
  document.documentElement.style.overflow = isOpenMobile ? 'hidden' : ''
})

const search = ref('')
const city = ref('')
const service = ref('')

const centers = ref([
  {
    id: 1,
    name: 'Glow Aesthetic Clinic',
    city: 'Bacoor',
    services: ['Facial', 'Laser', 'Botox'],
    rating: 4.8,
  },
  {
    id: 2,
    name: 'Pure Skin Studio',
    city: 'Imus',
    services: ['Facial', 'Whitening'],
    rating: 4.6,
  },
  {
    id: 3,
    name: 'Radiance Medical Aesthetics',
    city: 'Dasmariñas',
    services: ['Laser', 'Body Contouring'],
    rating: 4.9,
  },
])

const cities = [...new Set(centers.value.map(c => c.city))]
const services = [
  ...new Set(centers.value.flatMap(c => c.services)),
]

const filteredCenters = computed(() => {
  return centers.value.filter(center => {
    const matchesSearch =
      center.name.toLowerCase().includes(search.value.toLowerCase()) ||
      center.services.some(s =>
        s.toLowerCase().includes(search.value.toLowerCase())
      )

    const matchesCity = city.value
      ? center.city === city.value
      : true

    const matchesService = service.value
      ? center.services.includes(service.value)
      : true

    return matchesSearch && matchesCity && matchesService
  })
})
</script>

<style scoped>
.menu-overlay-enter-active,
.menu-overlay-leave-active {
  transition: opacity 0.22s ease;
}
.menu-overlay-enter-from,
.menu-overlay-leave-to {
  opacity: 0;
}
.sidebar-menu-enter-active,
.sidebar-menu-leave-active {
  transition: transform 0.28s ease, opacity 0.28s ease;
}
.sidebar-menu-enter-from,
.sidebar-menu-leave-to {
  transform: translateX(100%);
  opacity: 0.9;
}
</style>
