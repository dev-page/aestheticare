<template>
  <div class="subscription-page w-full">
    <nav class="pricing-nav">
      <div class="pricing-nav-inner">
        <div class="pricing-breadcrumb">
          <router-link to="/" class="breadcrumb-link">Home</router-link>
          <span class="breadcrumb-sep">></span>
          <span class="breadcrumb-current">Pricing</span>
        </div>
      </div>
    </nav>
    <div class="subscription-popup w-full">
    <div class="popup-top">
      <div v-if="isLoading" class="popup-top-skeleton">
        <div class="skeleton-line skeleton-eyebrow"></div>
        <div class="skeleton-line skeleton-heading"></div>
        <div class="skeleton-line skeleton-subtitle"></div>
        <div class="skeleton-line skeleton-subtitle short"></div>
      </div>
      <div v-else>
        <p class="popup-eyebrow">AesthetiCare Plans</p>
        <h2 class="popup-title">Choose Your Plan</h2>
        <p class="popup-subtitle">
          Start with what fits your clinic today. You can always upgrade as your operations grow.
        </p>
      </div>
    </div>

    <p v-if="error" class="popup-subtitle" style="color:#b91c1c;">{{ error }}</p>

    <div v-if="isLoading" class="plan-grid plan-grid-skeleton">
      <div v-for="index in 3" :key="`pricing-skeleton-${index}`" class="plan-card skeleton-card">
        <div class="skeleton-line skeleton-title"></div>
        <div class="skeleton-line skeleton-price"></div>
        <div class="skeleton-line skeleton-desc"></div>
        <div class="skeleton-line skeleton-desc short"></div>
        <div class="skeleton-list">
          <div class="skeleton-line skeleton-item"></div>
          <div class="skeleton-line skeleton-item"></div>
          <div class="skeleton-line skeleton-item short"></div>
        </div>
      </div>
    </div>

    <div v-else class="plan-grid">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="plan-option"
      >
        <button
          type="button"
          class="plan-card group"
          :class="{
            'plan-card-active': selectedPlan === plan.id,
            'plan-card-basic': plan.id === 'basic',
            'plan-card-premium': plan.recommended
          }"
          @click="selectedPlan = plan.id"
        >
          <span class="card-shine"></span>
          <span v-if="plan.recommended" class="plan-badge">Recommended</span>
          <p class="plan-name">{{ plan.name }}</p>
          <p class="plan-price">
            {{ plan.price }}
            <span class="plan-cycle">{{ plan.cycle }}</span>
          </p>
          <p class="plan-desc">{{ plan.description }}</p>
          <ul class="plan-features">
            <li v-for="item in plan.features" :key="item">{{ item }}</li>
          </ul>
        </button>
        <span v-if="selectedPlan === plan.id" class="plan-selection-line" aria-hidden="true"></span>
      </div>
    </div>

    <div class="popup-actions" :class="{ 'popup-actions-skeleton': isLoading }">
      <template v-if="isLoading">
        <div class="skeleton-button"></div>
      </template>
      <template v-else>
        <button type="button" class="btn-primary" @click="continueWithPlan">
          {{ ctaLabel }}
        </button>
      </template>
    </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

const router = useRouter();

const plans = ref([]);
const error = ref("");
const isLoading = ref(true);

const selectedPlan = ref("basic");

const defaultPlans = () => [
  {
    id: "basic",
    name: "Basic",
    price: "PHP 999",
    cycle: "/month",
    description: "For single-branch clinics with streamlined daily operations.",
    features: ["Scheduling & billing", "Staff management", "Reports"],
    trialDays: 0,
    isActive: true,
    recommended: false,
  },
  {
    id: "premium",
    name: "Premium",
    price: "PHP 2499",
    cycle: "/month",
    description: "For multi-branch clinics that need complete operational control.",
    features: ["Everything in Basic", "Advanced analytics", "Priority support"],
    trialDays: 0,
    isActive: true,
    recommended: true,
  },
];

const formatCurrency = (amount) => {
  const value = Number(amount);
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP", currencyDisplay: "code",
    maximumFractionDigits: 0,
  }).format(safeValue);
};

const formatCycle = (cycle) => {
  const normalized = String(cycle || "").trim().toLowerCase();
  if (!normalized || normalized === "trial") return "";
  if (normalized.startsWith("/")) return normalized;
  return `/${normalized}`;
};

const mergePlans = (dbPlansMap) => {
  return defaultPlans().map((basePlan) => {
    const dbPlan = dbPlansMap.get(basePlan.id) || {};
    const merged = {
      ...basePlan,
      ...dbPlan,
      id: basePlan.id,
      recommended: basePlan.id === "premium",
      features: Array.isArray(dbPlan.features) ? dbPlan.features : basePlan.features,
    };

    return {
      ...merged,
      name: merged.name || basePlan.name,
      price: formatCurrency(merged.price),
      cycle: formatCycle(merged.billingCycle),
      description: merged.description || basePlan.description,
      trialDays: Number(merged.trialDays || 0),
      isActive: merged.isActive !== false,
    };
  });
};

const loadPlans = async () => {
  error.value = "";
  isLoading.value = true;
  try {
    const snapshot = await getDocs(collection(db, "subscriptionPlans"));
    const dbPlans = new Map(snapshot.docs.map((docSnap) => [docSnap.id, docSnap.data()]));
    const merged = mergePlans(dbPlans);
    const activePlans = merged.filter((plan) => plan.isActive);
    plans.value = activePlans.length ? activePlans : merged;

    if (!plans.value.some((plan) => plan.id === selectedPlan.value)) {
      selectedPlan.value = plans.value[0]?.id || "basic";
    }
  } catch (err) {
    console.error("Failed to load public subscription plans:", err);
    error.value = "Unable to load latest plans right now.";
    plans.value = defaultPlans();
  } finally {
    isLoading.value = false;
  }
};

const selectedPlanData = computed(() => plans.value.find((plan) => plan.id === selectedPlan.value) || null);

const ctaLabel = computed(() => {
  return selectedPlanData.value ? "Continue with Selected Plan" : "Continue";
});

const continueWithPlan = () => {
  router.push({ name: "login" });
};

onMounted(loadPlans);
</script>

<style scoped>
.subscription-page {
  width: 100%;
}

.pricing-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(90deg, rgba(255, 251, 244, 0.96), rgba(251, 238, 213, 0.94));
  border-bottom: 1px solid rgba(214, 169, 123, 0.35);
  backdrop-filter: blur(12px);
}

.pricing-nav-inner {
  width: 100%;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 1rem;
  padding: 1rem 1.25rem 1rem 0.75rem;
}

.pricing-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #9f7a5a;
}

.subscription-popup {
  padding: 1rem 1.25rem 1.5rem;
  max-width: 1320px;
  margin: 0 auto;
}

.breadcrumb-link {
  color: #7b4e35;
  transition: color 0.2s ease;
  position: relative;
}

.breadcrumb-link:hover {
  color: #9f6946;
}

.breadcrumb-link::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 0%;
  height: 2px;
  background: #9f6946;
  transition: width 0.2s ease;
}

.breadcrumb-link:hover::after {
  width: 100%;
}

.breadcrumb-sep {
  opacity: 0.5;
}

.breadcrumb-current {
  color: #6a4a34;
}

.popup-top {
  display: block;
  margin-bottom: 1.4rem;
}

.popup-top-skeleton {
  display: grid;
  gap: 0.55rem;
}

.skeleton-eyebrow {
  height: 10px;
  width: 140px;
}

.skeleton-heading {
  height: 26px;
  width: min(70%, 320px);
  border-radius: 0.6rem;
}

.skeleton-subtitle {
  height: 12px;
  width: min(85%, 520px);
  border-radius: 0.5rem;
}

.skeleton-subtitle.short {
  width: min(65%, 420px);
}


.popup-eyebrow {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: #996341;
  margin-bottom: 0.25rem;
}

.popup-title {
  font-family: "Playfair Display", "Times New Roman", serif;
  font-size: clamp(1.7rem, 2.4vw, 2.1rem);
  line-height: 1.05;
  background: linear-gradient(120deg, #4a2c1e 0%, #996341 44%, #c89066 72%, #7b4e35 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.popup-subtitle {
  margin-top: 0.35rem;
  color: #5f4b3a;
  font-size: 0.92rem;
  max-width: 760px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 1.35rem;
  padding-top: 0.75rem;
  padding-bottom: 0.85rem;
  justify-content: center;
}

.plan-option {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.45rem;
}

.plan-grid-skeleton {
  pointer-events: none;
}

.skeleton-card {
  border: 1px solid rgba(198, 148, 108, 0.22);
  background: linear-gradient(145deg, rgba(255, 255, 255, 0.7), rgba(248, 234, 206, 0.55));
}

.skeleton-line {
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(224, 197, 168, 0.52) 0%,
    rgba(244, 228, 206, 0.9) 45%,
    rgba(224, 197, 168, 0.52) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shine 1.4s ease-in-out infinite;
}

.skeleton-title {
  height: 14px;
  width: 40%;
}

.skeleton-price {
  margin-top: 0.6rem;
  height: 26px;
  width: 55%;
}

.skeleton-desc {
  margin-top: 0.6rem;
  height: 12px;
  width: 80%;
  border-radius: 0.5rem;
}

.skeleton-desc.short {
  width: 65%;
}

.skeleton-list {
  margin-top: 0.8rem;
  display: grid;
  gap: 0.4rem;
}

.skeleton-item {
  height: 10px;
  width: 75%;
  border-radius: 0.4rem;
}

.skeleton-item.short {
  width: 55%;
}

.popup-actions-skeleton {
  opacity: 0.6;
  pointer-events: none;
}

.skeleton-button {
  height: 42px;
  width: 100%;
  border-radius: 0.8rem;
  background: linear-gradient(
    90deg,
    rgba(224, 197, 168, 0.52) 0%,
    rgba(244, 228, 206, 0.9) 45%,
    rgba(224, 197, 168, 0.52) 100%
  );
  background-size: 200% 100%;
  animation: skeleton-shine 1.4s ease-in-out infinite;
}

@keyframes skeleton-shine {
  0% {
    background-position: 0% 50%;
  }
  100% {
    background-position: 200% 50%;
  }
}

.plan-card {
  position: relative;
  overflow: hidden;
  text-align: left;
  border-radius: 1rem;
  border: 1px solid rgba(198, 148, 108, 0.34);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.8), rgba(248, 234, 206, 0.56));
  min-height: 330px;
  padding: 1.45rem 1.25rem 1.5rem;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.plan-card:hover {
  transform: translateY(-2px);
  border-color: rgba(198, 148, 108, 0.62);
  box-shadow: 0 10px 22px rgba(54, 34, 22, 0.12);
}

.plan-card-active {
  border-color: rgba(123, 78, 53, 0.9);
  box-shadow: 0 18px 34px rgba(111, 63, 42, 0.22);
  transform: translateY(-4px);
  outline: 2px solid rgba(255, 244, 224, 0.7);
  outline-offset: -2px;
}

.plan-card-basic {
  border-color: rgba(205, 145, 92, 0.62);
  background: linear-gradient(145deg, #f2c998 0%, #deaa73 48%, #c78f5d 100%);
}

.plan-card-basic .plan-name,
.plan-card-basic .plan-price,
.plan-card-basic .plan-desc,
.plan-card-basic .plan-features {
  color: #fff9ee;
}

.plan-card-premium {
  border-color: rgba(235, 193, 93, 0.78);
  background: linear-gradient(145deg, #f0a74f 0%, #d07b34 45%, #a84f22 100%);
}

.plan-card-premium .plan-name,
.plan-card-premium .plan-price,
.plan-card-premium .plan-desc,
.plan-card-premium .plan-features {
  color: #fff7ea;
}

.card-shine {
  pointer-events: none;
  position: absolute;
  inset: 0;
  transform: translateX(-120%);
  background: linear-gradient(110deg, transparent 28%, rgba(255, 255, 255, 0.38) 52%, transparent 76%);
  transition: transform 0.7s ease;
}

.group:hover .card-shine {
  transform: translateX(120%);
}

.plan-badge {
  position: absolute;
  top: 0.7rem;
  right: 0.7rem;
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #fff;
  background: linear-gradient(120deg, #9f6946 0%, #7b4e35 100%);
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
}

.plan-selection-line {
  display: block;
  width: calc(100% - 2rem);
  margin: 0 auto;
  height: 4px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 247, 234, 0.18), rgba(255, 247, 234, 0.92), rgba(255, 247, 234, 0.18));
  box-shadow: 0 0 0 1px rgba(255, 241, 220, 0.2), 0 6px 16px rgba(54, 34, 22, 0.16);
}

.plan-name {
  font-size: 1rem;
  font-weight: 700;
  color: #3b281d;
}

.plan-price {
  margin-top: 0.15rem;
  font-size: 1.65rem;
  font-weight: 800;
  color: #6f3f2a;
}

.plan-cycle {
  font-size: 0.85rem;
  font-weight: 500;
  color: #8f6a51;
  margin-left: 0.22rem;
}

.plan-desc {
  margin-top: 0.25rem;
  font-size: 0.84rem;
  color: #66503f;
}

.plan-features {
  margin-top: 0.6rem;
  display: grid;
  gap: 0.25rem;
  font-size: 0.78rem;
  color: #4a3528;
}

.plan-features li::before {
  content: "\2713";
  color: #9f6946;
  margin-right: 0.4rem;
  font-weight: 700;
}

.popup-actions {
  margin-top: 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  align-items: center;
}

.btn-primary {
  width: 100%;
  border-radius: 0.8rem;
  padding: 0.72rem 0.95rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-primary {
  border: 1px solid transparent;
  color: #fff;
  background: linear-gradient(120deg, #9f6946 0%, #7b4e35 100%);
}

.btn-primary:hover {
  filter: brightness(1.03);
  transform: translateY(-1px);
}

@media (min-width: 768px) {
  .pricing-nav-inner {
    padding-top: 1.1rem;
    padding-bottom: 1.1rem;
    padding-left: 0.95rem;
  }
  .subscription-popup {
    padding: 1.35rem 1.5rem 1.8rem;
  }
  .plan-grid {
    grid-template-columns: repeat(2, minmax(420px, 1fr));
  }
  .popup-actions {
    justify-content: center;
  }
  .btn-primary {
    width: min(360px, 100%);
  }
}
</style>

