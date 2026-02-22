<template>
  <div class="flex flex-col items-center py-8 px-4">
    <div class="text-center mb-12">
      <h1 class="text-3xl sm:text-4xl font-playfair text-gold-700 mb-4">Choose Your Plan</h1>
      <p class="text-gray-700 max-w-xl mx-auto">
        Start with a plan that suits your clinic. Upgrade anytime and enjoy full access to all features.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">

      <!-- Free Trial -->
      <div
        @click="selectPlan('Free Trial')"
        class="cursor-pointer bg-gray-100/70 backdrop-blur-xl border border-gray-300 rounded-2xl p-8 text-center shadow-lg hover:shadow-[0_0_25px_rgba(255,255,255,0.6)] transition transform hover:scale-105"
      >
        <h3 class="text-lg font-semibold text-gold-700 mb-2">Free Trial</h3>
        <p class="text-3xl font-bold mb-4">₱0</p>
        <p class="text-gray-600">Try all features for 14 days. No credit card required.</p>
      </div>

      <div
  @click="selectPlan('Basic')"
  class="relative overflow-hidden group cursor-pointer
         bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600
         text-white rounded-2xl p-8 text-center
         transition transform hover:scale-105"
>
  <!-- Shine -->
  <span
    class="pointer-events-none absolute inset-0
           -translate-x-full group-hover:translate-x-full
           bg-gradient-to-r from-transparent via-white/40 to-transparent
           transition-transform duration-700 ease-out"
  ></span>

  <h3 class="text-lg font-semibold mb-2">Basic</h3>
  <p class="text-3xl font-bold mb-4">
    ₱499<span class="text-sm font-normal">/month</span>
  </p>
  <p class="text-yellow-100">
    One branch only. Includes essential features for your clinic.
  </p>
</div>


<!-- Premium -->
<div
  @click="selectPlan('Premium')"
  class="relative overflow-hidden group cursor-pointer
         bg-gradient-to-br from-yellow-500 via-yellow-600 to-yellow-700
         rounded-2xl p-8 text-center
         shadow-lg hover:shadow-[0_0_45px_rgba(255,215,0,1)]
         transition transform hover:scale-105
         border-2 border-yellow-400"
>
  <span
    class="pointer-events-none absolute inset-0
           -translate-x-full group-hover:translate-x-full
           bg-gradient-to-r from-transparent via-white/40 to-transparent
           transition-transform duration-700 ease-out"
  ></span>
  <div class="absolute top-4 right-4 z-10 bg-gold-700 text-white text-xs font-semibold px-2 py-1 rounded-full uppercase tracking-wide">
    Recommended
  </div>

  <h3 class="text-lg font-semibold mb-2 text-white">Premium</h3>
  <p class="text-3xl font-bold mb-4 text-white">
    ₱999<span class="text-sm font-normal">/month</span>
  </p>
  <p class="text-yellow-100">
    Multiple branches. Full features including advanced analytics.
  </p>
</div>



    </div>

    <button @click="proceedToFreeTrial" class="mt-12 w-full max-w-md py-3 rounded-xl bg-gold-700 text-white font-semibold text-lg hover:bg-gold-800 transition transform hover:scale-105">
      Proceed to 14-day Free Trial
    </button>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const selectPlan = (plan) => {
  router.push("/subscription-features");
};

import { defineEmits } from "vue";

const emit = defineEmits(["close"]);

const proceedToFreeTrial = () => {
  router.push({ name: 'register-clinic' });
};
</script>

<style scoped>
.card-glow:hover {
  box-shadow: 0 0 30px rgba(255, 215, 0, 0.8);
}
</style>