
<template>
  <div class="bg-gradient-to-br from-cream-100 via-gold-100 to-cream-200 text-charcoal-800 overflow-x-hidden">
    <nav class="fixed top-0 inset-x-0 z-50 bg-gradient-to-r from-cream-50 via-gold-50 to-cream-100 backdrop-blur-xl border-b border-gold-300/40">
      <div class="max-w-7xl mx-auto flex items-center justify-between px-4 sm:px-6 md:px-8 h-16">
        <div class="flex items-center gap-3">
          <div class="h-9 w-9 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600"></div>
          <span class="text-lg tracking-wide text-charcoal-900">AesthetiCare</span>
        </div>

        <ul class="hidden lg:flex items-center gap-6 lg:gap-10 text-[11px] tracking-[0.2em] uppercase text-charcoal-600">
          <li>
            <a class="relative text-charcoal-700 hover:text-gold-700 hover:font-bold transition-all duration-300
                      before:absolute before:left-0 before:bottom-[-4px] before:w-0 before:h-[2px] before:bg-gold-700
                      before:transition-all before:duration-300 hover:before:w-full">
              Features
            </a>
          </li>

          <li>
            <a class="relative text-charcoal-700 hover:text-gold-700 hover:font-bold transition-all duration-300
                      before:absolute before:left-0 before:bottom-[-4px] before:w-0 before:h-[2px] before:bg-gold-700
                      before:transition-all before:duration-300 hover:before:w-full">
              Solutions
            </a>
          </li>
          <li>
            <router-link to="/subscription-features" class="relative text-charcoal-700 hover:text-gold-700 hover:font-bold transition-all duration-300
                      before:absolute before:left-0 before:bottom-[-4px] before:w-0 before:h-[2px] before:bg-gold-700
                      before:transition-all before:duration-300 hover:before:w-full">
              Pricing
            </router-link>
          </li>
          <li>
            <router-link to="/centers"
              class="flex items-center gap-2 px-4 py-2 rounded-full border-2 border-gold-500 text-gold-500 font-medium
                    hover:bg-gold-500 hover:text-white transition-all duration-300"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM12 11a2 2 0 110-4 2 2 0 010 4z"
                />
              </svg>
              Centers
            </router-link>
          </li>
        </ul>

        <div class="hidden lg:flex items-center gap-2 sm:gap-4">
          <router-link
            to="/login"
            class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-gold-700 text-gold-700 text-xs sm:text-sm tracking-widest uppercase hover:bg-gold-700 hover:text-white transition"
          >
            Login
          </router-link>
          <button
            @click="showSubscriptionPopup = true"
            class="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-gold-700 text-white text-xs sm:text-sm tracking-widest uppercase hover:bg-gold-800 transition"
          >
            Free Trial
          </button>
        </div>

        <button
          @click="isMobileMenuOpen = !isMobileMenuOpen"
          class="lg:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg border border-gold-500/60 text-gold-700 hover:bg-gold-100 transition"
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

      <transition name="menu-overlay">
        <div
          v-if="isMobileMenuOpen"
          class="lg:hidden fixed inset-0 z-[60] bg-charcoal-900/40 backdrop-blur-[2px]"
          @click="closeMobileMenu"
        ></div>
      </transition>

      <transition name="sidebar-menu">
        <aside
          v-if="isMobileMenuOpen"
          class="lg:hidden fixed top-0 right-0 h-screen w-[84%] max-w-[340px] z-[70] bg-gradient-to-b from-gold-50 via-cream-100 to-gold-100 border-l border-gold-300/40 shadow-2xl flex flex-col"
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
              <a class="py-2 border-b border-gold-200/70 transition-all duration-200 hover:text-gold-700 hover:pl-1">Features</a>
              <a class="py-2 border-b border-gold-200/70 transition-all duration-200 hover:text-gold-700 hover:pl-1">Solutions</a>
              <router-link to="/subscription-features" @click="closeMobileMenu" class="py-2 border-b border-gold-200/70 transition-all duration-200 hover:text-gold-700 hover:pl-1">Pricing</router-link>
              <router-link to="/centers" @click="closeMobileMenu" class="py-2 border-b border-gold-200/70 transition-all duration-200 hover:text-gold-700 hover:pl-1">Centers</router-link>
            </div>

            <div class="mt-auto pt-6 flex flex-col gap-3">
              <router-link
                to="/login"
                @click="closeMobileMenu"
                class="px-4 py-3 rounded-full border border-gold-700 text-gold-700 text-center transition hover:bg-gold-50"
              >
                Login
              </router-link>
              <button
                @click="showSubscriptionPopup = true; closeMobileMenu()"
                class="px-4 py-3 rounded-full bg-gold-700 text-white text-center transition hover:bg-gold-800"
              >
                Free Trial
              </button>
            </div>
          </div>
        </aside>
      </transition>
    </nav>

    <section class="relative min-h-screen pt-20 sm:pt-24 md:pt-24 pb-16 overflow-hidden bg-gradient-to-tr from-cream-50 via-cream-100 to-gold-100">
      <svg class="hero-line hero-line-left-a hidden lg:block" viewBox="0 0 180 700" preserveAspectRatio="none">
        <path fill="none" stroke="#d7aa7d" stroke-width="2.2" stroke-opacity="0.22" d="M150,0 C96,95 82,210 112,322 C144,432 138,548 96,700" />
      </svg>
      <svg class="hero-line hero-line-left-b hidden lg:block" viewBox="0 0 160 620" preserveAspectRatio="none">
        <path fill="none" stroke="#c6946c" stroke-width="1.8" stroke-opacity="0.18" d="M120,0 C64,82 58,172 84,278 C106,372 98,492 66,620" />
      </svg>
      <svg class="hero-line hero-line-right-a hidden lg:block" viewBox="0 0 180 700" preserveAspectRatio="none">
        <path fill="none" stroke="#c6946c" stroke-width="2.2" stroke-opacity="0.2" d="M26,0 C80,110 98,220 70,332 C42,442 48,562 84,700" />
      </svg>
      <svg class="hero-line hero-line-right-b hidden lg:block" viewBox="0 0 160 620" preserveAspectRatio="none">
        <path fill="none" stroke="#e6c196" stroke-width="1.7" stroke-opacity="0.16" d="M38,0 C90,78 104,168 82,272 C60,370 68,500 96,620" />
      </svg>
      <svg class="hero-wave hidden md:block" viewBox="0 0 1440 320" preserveAspectRatio="none">
        <path fill="none" style="stroke: var(--color-gold-500);" stroke-width="4" stroke-opacity="0.34" d="M0,224 C180,160 320,288 500,224 C690,155 760,82 920,125 C1088,171 1214,288 1440,256" />
      </svg>

      <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 md:px-8 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
        <div class="pt-2 lg:min-h-[610px] flex flex-col lg:justify-between">
          <div class="lg:flex-1 lg:flex lg:flex-col lg:justify-center">
            <p class="text-[11px] sm:text-xs tracking-[0.22em] uppercase text-gold-700 mb-3">Glow Naturally With</p>
            <h1 class="text-4xl sm:text-5xl md:text-[3.35rem] leading-tight mb-3 font-playfair">
              <span class="text-charcoal-800">AesthetiCare</span>
              <br />
              <span class="text-gold-700">Skin Solutions</span>
            </h1>
            <p class="text-charcoal-600 max-w-xl mb-6 text-sm sm:text-base leading-relaxed">
              Your skin deserves the best. Discover elegant, clinic-ready solutions crafted for modern aesthetic centers.
            </p>
            <div class="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-8">
              <button @click="showSubscriptionPopup = true" class="bg-charcoal-900 text-cream-50 px-6 py-3 rounded-full text-xs sm:text-sm tracking-widest uppercase hover:bg-charcoal-800 transition w-full sm:w-auto">
                Shop Now
              </button>
              <router-link to="/centers" class="px-6 py-3 rounded-full border border-gold-700 text-gold-700 text-xs sm:text-sm tracking-widest uppercase hover:bg-gold-700 hover:text-white transition w-full sm:w-auto text-center">
                View Centers
              </router-link>
            </div>
          </div>

          <div class="w-full max-w-xl rounded-2xl border border-gold-300/45 bg-cream-50/80 backdrop-blur-sm p-4 sm:p-5 shadow-[0_12px_24px_rgba(54,34,22,0.08)]">
            <p class="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-gold-700 mb-3">Clinic Essentials</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="relative overflow-hidden rounded-tl-[24px] rounded-tr-xl rounded-br-xl rounded-bl-[18px] border border-gold-200/55 bg-white/55 px-3 py-2.5 text-left">
                <p class="font-playfair text-base text-charcoal-900 leading-tight">Smart Scheduling</p>
                <p class="text-[11px] text-charcoal-600 mt-1">Bookings and reminders in one flow</p>
              </div>
              <div class="relative overflow-hidden rounded-t-[24px] rounded-b-[14px] border border-gold-200/55 bg-white/55 px-3 py-2.5 text-left">
                <p class="font-playfair text-base text-charcoal-900 leading-tight">Patient Journey</p>
                <p class="text-[11px] text-charcoal-600 mt-1">Track treatments from consult to follow-up</p>
              </div>
              <div class="relative overflow-hidden rounded-tr-[24px] rounded-tl-xl rounded-br-[18px] rounded-bl-xl border border-gold-200/55 bg-white/55 px-3 py-2.5 text-left">
                <p class="font-playfair text-base text-charcoal-900 leading-tight">Performance Insights</p>
                <p class="text-[11px] text-charcoal-600 mt-1">Clear metrics for clinics and med spas</p>
              </div>
            </div>
          </div>

        </div>

        <div class="relative">
          <div class="collage-grid mx-auto" role="img" aria-label="Aesthetic model collage">
            <div class="shape-card shape-top-left"></div>
            <div class="shape-card shape-top-right"></div>
            <div class="shape-card shape-bottom-right"></div>

            <div class="photo-card photo-main"></div>
            <div class="photo-card photo-detail-1"></div>
            <div class="photo-card photo-detail-2"></div>
            <div class="photo-card photo-detail-3"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="relative h-[50vh] sm:h-[60vh] md:h-[70vh] overflow-hidden">
      <video
        class="absolute inset-0 w-full h-full object-cover"
        autoplay
        muted
        loop
        playsinline
      >
        <source src="@/assets/home_vid.mp4" type="video/mp4" />
      </video>
      <div class="absolute inset-0 bg-black/35"></div>
      <div class="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
        <h2 class="font-playfair italic font-semibold text-3xl sm:text-4xl md:text-5xl tracking-[0.16em] bg-gradient-to-r from-cream-200 via-gold-300 to-gold-500 bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
          SOLACE AESTHETIQUE
        </h2>
        <p class="mt-3 font-montserrat text-white/90 text-xs sm:text-sm md:text-base">
          Where precision meets beauty in every personalized aesthetic journey.
        </p>
      </div>
    </section>

    <!-- SOLUTIONS -->
    <section class="py-16 sm:py-24 md:py-32 bg-cream-100 text-charcoal-800">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 text-center">
        <h2 class="text-2xl sm:text-3xl md:text-4xl mb-12 sm:mb-16 font-playfair italic font-semibold tracking-[0.03em] bg-gradient-to-r from-rose-500 via-gold-600 to-rose-400 bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(149,99,68,0.25)]">Built for the Aesthetic Industry</h2>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          <!-- Card 1 -->
          <div class="solution-card delay-0 rounded-[26px] border border-rose-200/45 bg-cream-50/90 backdrop-blur-sm px-5 py-6 sm:px-6 sm:py-7 shadow-[0_10px_28px_rgba(54,34,22,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(54,34,22,0.12)]">
            <div class="mx-auto mb-4 h-10 w-10 rounded-xl bg-rose-100/75 flex items-center justify-center text-rose-700 font-semibold">1</div>
            <div class="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-gold-100 to-cream-200 ring-1 ring-gold-300/60 flex items-center justify-center">
              <svg class="h-10 w-10 text-gold-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M5 20V7a2 2 0 012-2h10a2 2 0 012 2v13M9 20v-4h6v4M9 10h6M12 8v4M10 10h4" />
              </svg>
            </div>
            <h3 class="text-lg mb-2 font-playfair text-charcoal-900">Aesthetic Clinics</h3>
            <p class="font-montserrat text-charcoal-700/90 text-sm sm:text-base">Tailored workflows and features designed specifically for this practice type.</p>
          </div>

          <!-- Card 2 -->
          <div class="solution-card delay-1 rounded-[26px] border border-rose-200/45 bg-cream-50/90 backdrop-blur-sm px-5 py-6 sm:px-6 sm:py-7 shadow-[0_10px_28px_rgba(54,34,22,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(54,34,22,0.12)]">
            <div class="mx-auto mb-4 h-10 w-10 rounded-xl bg-rose-100/75 flex items-center justify-center text-rose-700 font-semibold">2</div>
            <div class="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-rose-100 to-gold-100 ring-1 ring-gold-300/60 flex items-center justify-center">
              <svg class="h-10 w-10 text-gold-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 4c3 4 5 6.5 5 9a5 5 0 01-10 0c0-2.5 2-5 5-9z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M17.5 7.5v3M16 9h3" />
              </svg>
            </div>
            <h3 class="text-lg mb-2 font-playfair text-charcoal-900">Med Spas</h3>
            <p class="font-montserrat text-charcoal-700/90 text-sm sm:text-base">Tailored workflows and features designed specifically for this practice type.</p>
          </div>

          <!-- Card 3 -->
          <div class="solution-card delay-2 rounded-[26px] border border-rose-200/45 bg-cream-50/90 backdrop-blur-sm px-5 py-6 sm:px-6 sm:py-7 shadow-[0_10px_28px_rgba(54,34,22,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(54,34,22,0.12)]">
            <div class="mx-auto mb-4 h-10 w-10 rounded-xl bg-rose-100/75 flex items-center justify-center text-rose-700 font-semibold">3</div>
            <div class="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-cream-100 to-gold-100 ring-1 ring-gold-300/60 flex items-center justify-center">
              <svg class="h-10 w-10 text-gold-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 3l7 3v6c0 4.2-2.9 7.6-7 8.9C7.9 19.6 5 16.2 5 12V6l7-3z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M9 10.5c.8-.8 1.8-1.2 3-1.2s2.2.4 3 1.2M9.5 14h5" />
              </svg>
            </div>
            <h3 class="text-lg mb-2 font-playfair text-charcoal-900">Cosmetic Dermatology</h3>
            <p class="font-montserrat text-charcoal-700/90 text-sm sm:text-base">Tailored workflows and features designed specifically for this practice type.</p>
          </div>

          <!-- Card 4 -->
          <div class="solution-card delay-3 rounded-[26px] border border-rose-200/45 bg-cream-50/90 backdrop-blur-sm px-5 py-6 sm:px-6 sm:py-7 shadow-[0_10px_28px_rgba(54,34,22,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_rgba(54,34,22,0.12)]">
            <div class="mx-auto mb-4 h-10 w-10 rounded-xl bg-rose-100/75 flex items-center justify-center text-rose-700 font-semibold">4</div>
            <div class="mx-auto mb-4 h-20 w-20 rounded-full bg-gradient-to-br from-gold-100 to-cream-200 ring-1 ring-gold-300/60 flex items-center justify-center">
              <svg class="h-10 w-10 text-gold-800" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="6" stroke-width="1.7" />
                <circle cx="12" cy="12" r="2.2" stroke-width="1.7" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.7" d="M12 3v3M12 18v3M3 12h3M18 12h3" />
              </svg>
            </div>
            <h3 class="text-lg mb-2 font-playfair text-charcoal-900">Laser & Skin Centers</h3>
            <p class="font-montserrat text-charcoal-700/90 text-sm sm:text-base">Tailored workflows and features designed specifically for this practice type.</p>
          </div>
        </div>
      </div>
    </section>

    <div class="section-wave-divider" aria-hidden="true">
      <svg viewBox="0 0 1440 120" preserveAspectRatio="none">
        <path fill="#fff8eb" d="M0,88 C190,128 360,34 560,62 C760,90 920,126 1120,92 C1268,66 1368,48 1440,58 L1440,120 L0,120 Z" />
      </svg>
    </div>

    <!-- FEATURES / PLATFORM CAPABILITIES SHOWCASE -->
    <section class="py-16 sm:py-24 md:py-32 bg-gold-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <h2 class="text-2xl sm:text-3xl md:text-4xl text-center mb-8 sm:mb-12 font-playfair italic tracking-[0.04em] bg-gradient-to-r from-gold-700 via-gold-500 to-gold-300 bg-clip-text text-transparent">Platform Capabilities</h2>

        <div
          class="capability-showcase"
          :class="{ 'is-switching': isCapabilitySwitching }"
          :style="{ backgroundImage: `url(${currentCapability.image})` }"
        >
          <div class="capability-showcase-overlay"></div>

          <div class="capability-showcase-content" :key="`content-${currentCapabilityIndex}`">
            <p class="capability-eyebrow">{{ currentCapability.eyebrow }}</p>
            <h3 class="capability-showcase-title">{{ currentCapability.title }}</h3>
            <p class="capability-showcase-desc">{{ currentCapability.description }}</p>
          </div>

          <div class="capability-actions">
            <button class="capability-btn-main">Explore</button>
            <button @click="prevCapability" class="capability-btn-icon" aria-label="Previous capability">&#8592;</button>
            <button @click="nextCapability" class="capability-btn-icon" aria-label="Next capability">&#8594;</button>
          </div>

          <div class="capability-rail-wrap" :class="{ 'is-switching': isMiniSwitching }">
            <button
              v-if="capabilities.length > 3"
              @click="prevMini"
              class="capability-rail-nav capability-rail-nav-left"
              aria-label="Previous mini cards"
            >
              &#8249;
            </button>

            <div class="capability-rail">
              <button
                v-for="item in visibleMiniCapabilities"
                :key="`${item.index}-${miniMotionTick}`"
                @click="setCapability(item.index)"
                class="capability-mini"
                :class="[{ 'is-active': item.index === currentCapabilityIndex }, { 'is-animating': isMiniSwitching }]"
                :style="{ animationDelay: `${item.offset * 70}ms` }"
              >
                <img :src="item.capability.image" :alt="item.capability.title" class="capability-mini-img" />
                <div class="capability-mini-overlay"></div>
                <div class="capability-mini-text">
                  <p class="capability-mini-eyebrow">{{ item.capability.miniEyebrow }}</p>
                  <p class="capability-mini-title">{{ item.capability.miniTitle }}</p>
                </div>
              </button>
            </div>

            <button
              v-if="capabilities.length > 3"
              @click="nextMini"
              class="capability-rail-nav capability-rail-nav-right"
              aria-label="Next mini cards"
            >
              &#8250;
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="relative min-h-[50vh] sm:min-h-[60vh] flex items-center justify-center text-white overflow-hidden">
      <!-- Background image -->
      <div class="absolute inset-0 bg-center bg-cover" style="background-image: url('../img/room.jpg');"></div>
      <!-- Blur layer -->
      <div class="absolute inset-0 backdrop-blur-sm"></div>
      <!-- Color overlay -->
      <div class="absolute inset-0 bg-gradient-to-br from-[#fbf3e5]/78 via-[#f3e2c9]/66 to-[#e7c8a5]/56"></div>

      <!-- Content -->
      <div class="relative z-10 max-w-4xl text-center px-4 sm:px-6 md:px-8">
        <h2 class="cta-title text-3xl sm:text-4xl md:text-5xl mb-4 sm:mb-6">Elevate Your Aesthetic Operations</h2>
        <p class="text-charcoal-700/85 mb-6 sm:mb-8 text-sm sm:text-base">
          Join modern aesthetic centers using intelligent systems to scale with confidence.
        </p>
        <button @click="showSubscriptionPopup = true" class="bg-gradient-to-r from-[#9f6946] to-[#7b4e35] border border-[#dcb084]/50 text-cream-50 font-semibold px-6 sm:px-8 py-3 sm:py-4 rounded-xl hover:from-[#b07a54] hover:to-[#8d5a3f] transition text-sm sm:text-base shadow-[0_10px_24px_rgba(54,34,22,0.22)]">
          Try 14-Day Free Trial
        </button>
      </div>

      <div class="absolute top-0 left-0 w-48 sm:w-64 h-48 sm:h-64 bg-gold-200/20 rounded-full blur-[60px] sm:blur-[80px] animate-parallaxSlow"></div>
      <div class="absolute bottom-0 right-0 w-56 sm:w-72 h-56 sm:h-72 bg-rose-200/20 rounded-full blur-[90px] sm:blur-[120px] animate-parallaxSlow"></div>
      <div class="cta-social-wrap">
        <span class="cta-quote cta-quote-left" aria-hidden="true">"</span>
        <span class="cta-quote cta-quote-right" aria-hidden="true">"</span>
        <div class="cta-social">
          <a href="#" aria-label="Facebook (Coming Soon)" class="social-icon" title="Coming Soon">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.024 4.388 11.018 10.125 11.927v-8.44H7.078v-3.487h3.047V9.414c0-3.017 1.792-4.685 4.533-4.685 1.313 0 2.687.236 2.687.236v2.96h-1.514c-1.49 0-1.954.928-1.954 1.88v2.268h3.328l-.532 3.487h-2.796V24C19.612 23.09 24 18.097 24 12.073z"/>
            </svg>
          </a>
          <a href="#" aria-label="Instagram (Coming Soon)" class="social-icon" title="Coming Soon">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7.75 2h8.5A5.75 5.75 0 0122 7.75v8.5A5.75 5.75 0 0116.25 22h-8.5A5.75 5.75 0 012 16.25v-8.5A5.75 5.75 0 017.75 2zm0 1.7A4.05 4.05 0 003.7 7.75v8.5a4.05 4.05 0 004.05 4.05h8.5a4.05 4.05 0 004.05-4.05v-8.5a4.05 4.05 0 00-4.05-4.05h-8.5zM12 7.5A4.5 4.5 0 1112 16.5 4.5 4.5 0 0112 7.5zm0 1.7a2.8 2.8 0 100 5.6 2.8 2.8 0 000-5.6zm4.85-2.2a1.1 1.1 0 110 2.2 1.1 1.1 0 010-2.2z"/>
            </svg>
          </a>
          <a href="#" aria-label="YouTube (Coming Soon)" class="social-icon" title="Coming Soon">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.5 7.2a3.1 3.1 0 00-2.2-2.2C19.4 4.5 12 4.5 12 4.5s-7.4 0-9.3.5A3.1 3.1 0 00.5 7.2 32.7 32.7 0 000 12a32.7 32.7 0 00.5 4.8 3.1 3.1 0 002.2 2.2c1.9.5 9.3.5 9.3.5s7.4 0 9.3-.5a3.1 3.1 0 002.2-2.2A32.7 32.7 0 0024 12a32.7 32.7 0 00-.5-4.8zM9.6 15.1V8.9l5.5 3.1-5.5 3.1z"/>
            </svg>
          </a>
        </div>
        <p class="cta-social-note">Social links are placeholders for now.</p>
      </div>
    </section>

    <Modal
      :isOpen="showSubscriptionPopup"
      @close="showSubscriptionPopup = false"
      :showConfirm="false"
      panelClass="bg-white"
    >
      <SubscriptionPopup @close="showSubscriptionPopup = false" />
    </Modal>
  </div>
</template>


<script>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuth } from "@/composables/useAuth";
import Modal from "@/components/common/Modal.vue";
import SubscriptionPopup from "@/components/common/SubscriptionPopup.vue";
import placeholder from '@/assets/placeholder.svg'
import homePicture from '@/assets/home_picture.jpg'
import bg from '@/assets/bg.jpg'

export default {
  name: "HomePage",
  components: {
    Modal,
    SubscriptionPopup,
  },
  setup() {
    const { user, isLoading, initAuth } = useAuth();
    const router = useRouter();
    const showSubscriptionPopup = ref(false);
    const isMobileMenuOpen = ref(false);
    const currentCapabilityIndex = ref(0);
    const miniStartIndex = ref(0);
    const isCapabilitySwitching = ref(false);
    const isMiniSwitching = ref(false);
    const miniMotionTick = ref(0);
    let capabilityTimer = null;
    let capabilitySwitchTimer = null;
    let miniSwitchTimer = null;
    const closeMobileMenu = () => {
      isMobileMenuOpen.value = false;
    };

    watch(isMobileMenuOpen, (isOpen) => {
      document.body.style.overflow = isOpen ? "hidden" : "";
      document.documentElement.style.overflow = isOpen ? "hidden" : "";
    });
    
    const capabilities = [
      {
        eyebrow: "Aesthetic Center Workflow",
        title: "Smart Appointment Flow",
        description: "Automate bookings, assign practitioners, and reduce no-shows with reminders tuned for high-volume aesthetic clinics.",
        miniEyebrow: "Core System",
        miniTitle: "Appointments",
        image: homePicture,
      },
      {
        eyebrow: "Clinical Precision",
        title: "Patient Treatment Timeline",
        description: "Document every procedure with photos, notes, consent history, and outcomes in one longitudinal treatment timeline.",
        miniEyebrow: "Patient Care",
        miniTitle: "Treatment Records",
        image: bg,
      },
      {
        eyebrow: "Operations Control",
        title: "Inventory and Product Tracking",
        description: "Track usage per service, monitor stock thresholds, and avoid treatment delays with real-time supply visibility.",
        miniEyebrow: "Clinic Ops",
        miniTitle: "Inventory",
        image: placeholder,
      },
      {
        eyebrow: "Team Visibility",
        title: "Staff Performance Dashboard",
        description: "Review practitioner productivity, service completion rates, and schedule utilization across your branches.",
        miniEyebrow: "People",
        miniTitle: "Staff Insights",
        image: homePicture,
      },
      {
        eyebrow: "Growth Intelligence",
        title: "Revenue and Service Analytics",
        description: "Visualize top-performing services, monthly trends, and conversion metrics to guide better business decisions.",
        miniEyebrow: "Growth",
        miniTitle: "Analytics",
        image: bg,
      },
    ];

    const currentCapability = computed(() => capabilities[currentCapabilityIndex.value]);

    const visibleMiniCapabilities = computed(() => {
      const total = capabilities.length;
      const windowSize = Math.min(3, total);
      return Array.from({ length: windowSize }, (_, offset) => {
        const index = (miniStartIndex.value + offset) % total;
        return { capability: capabilities[index], index, offset };
      });
    });

    const triggerCapabilityAnimation = () => {
      isCapabilitySwitching.value = true;
      if (capabilitySwitchTimer) window.clearTimeout(capabilitySwitchTimer);
      capabilitySwitchTimer = window.setTimeout(() => {
        isCapabilitySwitching.value = false;
      }, 440);
    };

    const triggerMiniAnimation = () => {
      miniMotionTick.value += 1;
      isMiniSwitching.value = true;
      if (miniSwitchTimer) window.clearTimeout(miniSwitchTimer);
      miniSwitchTimer = window.setTimeout(() => {
        isMiniSwitching.value = false;
      }, 380);
    };

    const ensureMiniContains = (index) => {
      const total = capabilities.length;
      if (total <= 3) return;
      const previousStart = miniStartIndex.value;
      const visible = visibleMiniCapabilities.value.map((item) => item.index);
      if (!visible.includes(index)) {
        miniStartIndex.value = index;
      }
      if (previousStart !== miniStartIndex.value) {
        triggerMiniAnimation();
      }
    };

    const setCapability = (index) => {
      currentCapabilityIndex.value = index;
      triggerCapabilityAnimation();
      ensureMiniContains(index);
    };

    const nextCapability = () => {
      currentCapabilityIndex.value = (currentCapabilityIndex.value + 1) % capabilities.length;
      triggerCapabilityAnimation();
      ensureMiniContains(currentCapabilityIndex.value);
    };

    const prevCapability = () => {
      currentCapabilityIndex.value = (currentCapabilityIndex.value - 1 + capabilities.length) % capabilities.length;
      triggerCapabilityAnimation();
      ensureMiniContains(currentCapabilityIndex.value);
    };

    const nextMini = () => {
      if (capabilities.length <= 3) return;
      miniStartIndex.value = (miniStartIndex.value + 1) % capabilities.length;
      triggerMiniAnimation();
    };

    const prevMini = () => {
      if (capabilities.length <= 3) return;
      miniStartIndex.value = (miniStartIndex.value - 1 + capabilities.length) % capabilities.length;
      triggerMiniAnimation();
    };

    onMounted(() => {
      initAuth()
      capabilityTimer = window.setInterval(() => {
        nextCapability();
      }, 5000);
    });

    onBeforeUnmount(() => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      if (capabilityTimer) {
        window.clearInterval(capabilityTimer);
      }
      if (capabilitySwitchTimer) {
        window.clearTimeout(capabilitySwitchTimer);
      }
      if (miniSwitchTimer) {
        window.clearTimeout(miniSwitchTimer);
      }
    });

    return {
      capabilities,
      currentCapability,
      currentCapabilityIndex,
      isCapabilitySwitching,
      isMiniSwitching,
      miniMotionTick,
      visibleMiniCapabilities,
      setCapability,
      nextCapability,
      prevCapability,
      nextMini,
      prevMini,
      showSubscriptionPopup,
      user,
      isLoading,
      isMobileMenuOpen,
      closeMobileMenu,
    };
  },
};
</script>

<style scoped>
body {
  font-family: "Playfair Display", serif;
}

/* Parallax animation for blobs */
@keyframes parallaxSlow {
  0% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(20px);
  }
  100% {
    transform: translateY(0px);
  }
}
.animate-parallaxSlow {
  animation: parallaxSlow 8s ease-in-out infinite;
}

/* Slide animations for any additional use */
@keyframes slide-in-left {
  0% {
    opacity: 0;
    transform: translateX(-50px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes slide-in-right {
  0% {
    opacity: 0;
    transform: translateX(50px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}
.animate-slide-in-left {
  animation: slide-in-left 1s forwards;
}
.animate-slide-in-right {
  animation: slide-in-right 1s forwards;
}

/* Base transition for capability slide */
.capability-text,
.capability-image {
  transition: transform 0.8s ease-out, opacity 0.8s ease-out;
}

/* Active state when in view */
.in-view {
  transform: translateX(0) !important;
  opacity: 1 !important;
}

.capability-showcase {
  position: relative;
  min-height: clamp(430px, 62vw, 560px);
  border-radius: 26px;
  overflow: hidden;
  background-size: cover;
  background-position: center;
  border: 1px solid rgba(248, 229, 189, 0.3);
  box-shadow: 0 20px 42px rgba(36, 24, 15, 0.2);
  display: flex;
  align-items: stretch;
}
.capability-showcase.is-switching {
  animation: capabilityBackgroundPulse 0.44s ease;
}
.capability-showcase-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(95deg, rgba(36, 24, 15, 0.62) 0%, rgba(54, 34, 22, 0.45) 42%, rgba(54, 34, 22, 0.18) 68%, rgba(36, 24, 15, 0.58) 100%);
}
.capability-showcase-content {
  position: relative;
  z-index: 2;
  width: min(56%, 650px);
  padding: clamp(24px, 4vw, 44px);
  padding-bottom: clamp(90px, 8vw, 120px);
  color: #fff8eb;
  display: flex;
  flex-direction: column;
  justify-content: center;
  animation: capabilityContentIn 0.52s ease both;
}
.capability-eyebrow {
  font-size: 12px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: rgba(248, 229, 189, 0.95);
  margin-bottom: 12px;
}
.capability-showcase-title {
  font-family: "Playfair Display", serif;
  font-size: clamp(2rem, 5vw, 5rem);
  line-height: 0.95;
  font-weight: 700;
  text-transform: uppercase;
  margin: 0 0 16px;
}
.capability-showcase-desc {
  max-width: 560px;
  color: rgba(255, 248, 235, 0.9);
  font-size: clamp(0.95rem, 1.3vw, 1.1rem);
  line-height: 1.45;
  margin-bottom: 20px;
}
.capability-actions {
  position: absolute;
  z-index: 3;
  left: clamp(18px, 3vw, 40px);
  bottom: clamp(18px, 3vw, 30px);
  display: flex;
  align-items: center;
  gap: 10px;
}
.capability-btn-main {
  border: none;
  background: #fff8eb;
  color: #342419;
  border-radius: 12px;
  padding: 12px 28px;
  font-weight: 600;
}
.capability-btn-icon {
  border: 1px solid rgba(255, 248, 235, 0.6);
  background: rgba(255, 248, 235, 0.18);
  color: #fff8eb;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  font-size: 20px;
  line-height: 1;
}
.capability-rail-wrap {
  position: absolute;
  z-index: 2;
  right: clamp(10px, 2vw, 24px);
  bottom: clamp(12px, 2.2vw, 22px);
  width: min(38%, 420px);
}
.capability-rail-wrap.is-switching .capability-mini {
  animation: miniCardIn 0.38s ease both;
}
.capability-rail {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.capability-rail-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  border: 1px solid rgba(255, 248, 235, 0.65);
  background: rgba(36, 24, 15, 0.48);
  color: #fff8eb;
  font-size: 22px;
  line-height: 1;
}
.capability-rail-nav-left {
  left: -38px;
}
.capability-rail-nav-right {
  right: -38px;
}
.capability-mini {
  position: relative;
  border: 1px solid rgba(255, 248, 235, 0.35);
  border-radius: 16px;
  overflow: hidden;
  min-width: 0;
  min-height: 156px;
  text-align: left;
  background: transparent;
  padding: 0;
  opacity: 0.85;
  transform: scale(0.98);
  transition: opacity 0.2s ease, transform 0.2s ease, border-color 0.2s ease;
}
.capability-mini.is-active {
  opacity: 1;
  transform: scale(1);
  border-color: rgba(248, 229, 189, 0.85);
}
.capability-mini-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}
.capability-mini.is-active .capability-mini-img {
  transform: scale(1.06);
}
.capability-mini-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(36, 24, 15, 0.05) 35%, rgba(36, 24, 15, 0.76) 100%);
}
.capability-mini-text {
  position: absolute;
  inset: auto 10px 10px 10px;
  z-index: 2;
}
.capability-mini-eyebrow {
  color: rgba(255, 248, 235, 0.82);
  font-size: 10px;
  margin: 0 0 3px;
}
.capability-mini-title {
  color: #fff8eb;
  font-weight: 700;
  font-size: 1.15rem;
  line-height: 1.05;
  margin: 0;
}

@keyframes capabilityBackgroundPulse {
  0% { filter: saturate(0.9) brightness(0.86); }
  100% { filter: saturate(1) brightness(1); }
}
@keyframes capabilityContentIn {
  0% { opacity: 0; transform: translateY(18px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes miniCardIn {
  0% { opacity: 0; transform: translateY(12px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

/* Floating animation */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}
.animate-float {
  animation: float 4s ease-in-out infinite;
}

.section-wave-divider {
  background: #fdf3e2;
}
.section-wave-divider svg {
  display: block;
  width: 100%;
  height: 78px;
}

/* Hero collage layout */
.hero-line {
  position: absolute;
  z-index: 1;
  pointer-events: none;
}
.hero-line-left-a {
  top: 86px;
  left: 0;
  width: 170px;
  height: 76%;
}
.hero-line-left-b {
  top: 142px;
  left: 22px;
  width: 132px;
  height: 64%;
}
.hero-line-right-a {
  top: 92px;
  right: 0;
  width: 168px;
  height: 74%;
}
.hero-line-right-b {
  top: 156px;
  right: 20px;
  width: 130px;
  height: 62%;
}
.hero-wave {
  position: absolute;
  inset: auto 0 42px 0;
  width: 100%;
  height: 220px;
  z-index: 1;
}
.collage-grid {
  position: relative;
  width: clamp(320px, 40vw, 500px);
  height: clamp(410px, 52vw, 610px);
  isolation: isolate;
}
.shape-card {
  position: absolute;
  border-radius: 24px;
  background: linear-gradient(145deg, var(--color-gold-300) 0%, var(--color-gold-600) 100%);
  box-shadow: 0 12px 28px rgba(54, 34, 22, 0.12);
  opacity: 0.6;
}
.shape-top-left {
  left: 12px;
  top: 38px;
  width: 118px;
  height: 98px;
}
.shape-top-right {
  right: 12px;
  top: 26px;
  width: 122px;
  height: 108px;
}
.shape-bottom-right {
  right: 12px;
  bottom: 22px;
  width: 112px;
  height: 96px;
}
.photo-card {
  position: absolute;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 16px 34px rgba(54, 34, 22, 0.18);
  background-image: url("../../assets/home_picture.jpg");
  background-repeat: no-repeat;
  background-color: var(--color-cream-100);
  transition: transform 0.25s ease;
}
.photo-card:hover {
  transform: translateY(-3px);
}
.photo-main {
  left: 70px;
  top: 52px;
  width: 320px;
  height: 452px;
  z-index: 2;
  background-size: cover;
  background-position: center 24%;
  filter: saturate(1.04) contrast(1.02);
}
.photo-detail-1 {
  left: 0;
  top: 170px;
  width: 122px;
  height: 150px;
  z-index: 3;
  background-size: 500px 610px;
  background-position: -8px -176px;
}
.photo-detail-2 {
  right: 0;
  top: 190px;
  width: 126px;
  height: 176px;
  z-index: 3;
  background-size: 500px 610px;
  background-position: -368px -178px;
}
.photo-detail-3 {
  left: 160px;
  bottom: 0;
  width: 140px;
  height: 126px;
  z-index: 3;
  background-size: 500px 610px;
  background-position: -162px -430px;
}
.product-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.product-thumb {
  width: 100%;
  height: 86px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid rgba(181, 127, 92, 0.38);
  box-shadow: 0 8px 18px rgba(54, 34, 22, 0.12);
}
.product-name {
  font-size: 11px;
  line-height: 1.2;
  text-align: center;
  color: var(--color-charcoal-700);
  letter-spacing: 0.02em;
}
@media (max-width: 1023px) {
  .capability-showcase {
    min-height: 640px;
    display: block;
  }
  .capability-showcase-content {
    width: 100%;
    padding: 22px 18px;
  }
  .capability-showcase-title {
    font-size: clamp(1.9rem, 8vw, 3.2rem);
  }
  .capability-showcase-desc {
    max-width: 100%;
    margin-bottom: 86px;
  }
  .capability-actions {
    left: 18px;
    bottom: 184px;
  }
  .capability-rail {
    width: auto;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }
  .capability-rail-wrap {
    left: 14px;
    right: 14px;
    bottom: 14px;
    width: auto;
  }
  .capability-rail-nav {
    display: none;
  }
  .capability-mini {
    min-width: 0;
    min-height: 150px;
  }

  .collage-grid {
    width: 340px;
    height: 450px;
    margin-top: 8px;
  }
  .shape-card {
    border-radius: 20px;
  }
  .shape-top-left {
    left: 6px;
    top: 34px;
    width: 88px;
    height: 74px;
  }
  .shape-top-right {
    right: 8px;
    top: 26px;
    width: 92px;
    height: 82px;
  }
  .shape-bottom-right {
    right: 8px;
    bottom: 22px;
    width: 84px;
    height: 72px;
  }
  .photo-card {
    border-radius: 20px;
  }
  .photo-main {
    left: 50px;
    top: 52px;
    width: 240px;
    height: 338px;
    background-position: center 22%;
  }
  .photo-detail-1 {
    left: 0;
    top: 160px;
    width: 88px;
    height: 116px;
    background-size: 340px 450px;
    background-position: -4px -152px;
  }
  .photo-detail-2 {
    right: 0;
    top: 176px;
    width: 92px;
    height: 130px;
    background-size: 340px 450px;
    background-position: -250px -156px;
  }
  .photo-detail-3 {
    left: 122px;
    bottom: 14px;
    width: 98px;
    height: 92px;
    background-size: 340px 450px;
    background-position: -120px -320px;
  }
}

/* Mobile sidebar transitions */
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

.cta-title {
  background: linear-gradient(120deg, #4a2c1e 0%, #996341 44%, #c89066 72%, #7b4e35 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 2px 14px rgba(45, 28, 18, 0.18);
}

.cta-social-wrap {
  position: absolute;
  left: clamp(12px, 3vw, 28px);
  bottom: clamp(12px, 2.4vw, 22px);
  z-index: 12;
}

.cta-social {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-bottom: 0.3rem;
}

.social-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid rgba(198, 148, 108, 0.45);
  background: rgba(255, 255, 255, 0.68);
  color: #8c5a3a;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.social-icon:hover {
  border-color: rgba(159, 105, 70, 0.6);
  background: rgba(255, 247, 232, 0.95);
  transform: translateY(-1px);
}

.cta-social-note {
  font-size: 0.78rem;
  color: rgba(84, 58, 41, 0.78);
}

.cta-quote {
  position: absolute;
  color: rgba(140, 90, 58, 0.35);
  font-family: "Playfair Display", serif;
  font-size: 1.35rem;
  line-height: 1;
  pointer-events: none;
}

.cta-quote-left {
  left: -4px;
  top: -18px;
}

.cta-quote-right {
  right: 8px;
  bottom: 16px;
}

@media (max-width: 768px) {
  .cta-social-wrap {
    left: 14px;
    bottom: 12px;
  }
  .cta-social-note {
    font-size: 0.72rem;
  }
}

/* Fade-in upward animation */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

</style>
