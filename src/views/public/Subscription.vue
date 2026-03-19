<template>
  <div class="subscription-popup w-full">
    <div class="popup-top">
      <div>
        <p class="popup-eyebrow">AesthetiCare Plans</p>
        <h2 class="popup-title">Choose Your Plan</h2>
        <p class="popup-subtitle">
          Start with what fits your clinic today. You can always upgrade as your operations grow.
        </p>
      </div>
    </div>

    <p v-if="error" class="popup-subtitle" style="color:#b91c1c;">{{ error }}</p>

    <div class="plan-grid">
      <button
        v-for="plan in plans"
        :key="plan.id"
        type="button"
        class="plan-card group"
        :class="{
          'plan-card-active': selectedPlan === plan.id,
          'plan-card-free': plan.id === 'free-trial',
          'plan-card-basic': plan.id === 'basic',
          'plan-card-premium': plan.recommended
        }"
        @click="selectedPlan = plan.id"
      >
        <span v-if="plan.id !== 'free-trial'" class="card-shine"></span>
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
    </div>

    <div class="popup-actions">
      <button type="button" class="btn-secondary" @click="maybeLater">Maybe Later</button>
      <button type="button" class="btn-outline" @click="toggleResume">
        Continue Registration
      </button>
      <button type="button" class="btn-primary" @click="continueWithPlan">
        {{ ctaLabel }}
      </button>
    </div>

    <div v-if="showResume" class="resume-card">
      <label class="resume-label">Use the email you paid with</label>
      <input v-model="resumeEmail" type="email" placeholder="you@email.com" class="resume-input" />
      <p v-if="resumeError" class="resume-error">{{ resumeError }}</p>
      <button type="button" class="btn-primary" :disabled="resumeLoading" @click="resumeRegistration">
        {{ resumeLoading ? 'Checking...' : 'Continue to Registration' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/config/firebaseConfig";

const emit = defineEmits(["close"]);
const router = useRouter();
const route = useRoute();

const plans = ref([]);
const error = ref("");

const selectedPlan = ref(String(route.query.plan || "free-trial").trim().toLowerCase() || "free-trial");
const showResume = ref(false);
const resumeEmail = ref("");
const resumeError = ref("");
const resumeLoading = ref(false);

const defaultPlans = () => [
  {
    id: "free-trial",
    name: "Free Trial",
    price: "PHP 0",
    cycle: "",
    description: "Try all core features for 14 days. No card required.",
    features: ["14-day full access", "All clinic essentials", "Cancel anytime"],
    trialDays: 14,
    isActive: true,
    recommended: false,
  },
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
    currency: "PHP",
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
  try {
    const snapshot = await getDocs(collection(db, "subscriptionPlans"));
    const dbPlans = new Map(snapshot.docs.map((docSnap) => [docSnap.id, docSnap.data()]));
    const merged = mergePlans(dbPlans);
    const activePlans = merged.filter((plan) => plan.isActive);
    plans.value = activePlans.length ? activePlans : merged;

    if (!plans.value.some((plan) => plan.id === selectedPlan.value)) {
      selectedPlan.value = plans.value[0]?.id || "free-trial";
    }
  } catch (err) {
    console.error("Failed to load public subscription plans:", err);
    error.value = "Unable to load latest plans right now.";
    plans.value = defaultPlans();
  }
};

const selectedPlanData = computed(() => plans.value.find((plan) => plan.id === selectedPlan.value) || null);

const ctaLabel = computed(() => {
  const current = selectedPlanData.value;
  if (!current) return "Continue";
  if (current.id === "free-trial") {
    const days = Number(current.trialDays || 14);
    return `Proceed to ${days}-day Free Trial`;
  }
  return "Continue with Selected Plan";
});

const continueWithPlan = () => {
  if (selectedPlan.value === "free-trial") {
    router.push({ name: "register-clinic" });
    return;
  }
  router.push({ path: "/subscription/checkout", query: { plan: selectedPlan.value, from: route.query.from } });
};

const maybeLater = () => {
  emit("close");
  const fallback = route.query.from === "owner" ? "/owner/account/subscription" : "/";
  router.back();
  setTimeout(() => {
    if (router.currentRoute.value.path === route.path) {
      router.replace({ path: fallback });
    }
  }, 0);
};

const toggleResume = () => {
  showResume.value = !showResume.value;
  resumeError.value = "";
};

const resumeRegistration = async () => {
  const normalizedEmail = String(resumeEmail.value || "").trim().toLowerCase();
  resumeError.value = "";

  if (!normalizedEmail) {
    resumeError.value = "Email is required.";
    return;
  }

  resumeLoading.value = true;
  try {
    const userSnap = await getDocs(query(
      collection(db, "users"),
      where("email", "==", normalizedEmail)
    ));
    if (!userSnap.empty) {
      resumeError.value = "Account already registered.";
      return;
    }

    const paymentsSnap = await getDocs(query(
      collection(db, "planPayments"),
      where("payerEmail", "==", normalizedEmail),
      where("status", "==", "Paid")
    ));

    if (paymentsSnap.empty) {
      resumeError.value = "No paid subscription found for that email.";
      return;
    }

    let latestPayment = null;
    paymentsSnap.forEach((docSnap) => {
      const data = docSnap.data() || {};
      const createdAt = data.createdAt?.seconds || 0;
      if (!latestPayment || createdAt > latestPayment.createdAt) {
        latestPayment = {
          id: docSnap.id,
          planId: String(data.planId || data.planName || "").trim().toLowerCase(),
          firstName: data.payerFirstName || "",
          lastName: data.payerLastName || "",
        };
      }
    });

    if (!latestPayment?.planId) {
      resumeError.value = "Payment record missing plan data.";
      return;
    }

    router.push({
      name: "register-clinic",
      query: {
        plan: latestPayment.planId,
        paymentId: latestPayment.id,
        paymentStatus: "paid",
        firstName: latestPayment.firstName,
        lastName: latestPayment.lastName,
        email: normalizedEmail,
      },
    });
  } catch (err) {
    console.error("Failed to resume registration:", err);
    resumeError.value = "Unable to resume right now. Please try again.";
  } finally {
    resumeLoading.value = false;
  }
};

onMounted(loadPlans);
</script>

<style scoped>
.subscription-popup {
  padding: 0.75rem;
}

.popup-top {
  display: block;
  margin-bottom: 1.15rem;
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
  max-width: 660px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 0.85rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
}

.plan-card {
  position: relative;
  overflow: hidden;
  text-align: left;
  border-radius: 1rem;
  border: 1px solid rgba(198, 148, 108, 0.34);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.8), rgba(248, 234, 206, 0.56));
  padding: 1.2rem 1rem;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.plan-card:hover {
  transform: translateY(-2px);
  border-color: rgba(198, 148, 108, 0.62);
  box-shadow: 0 10px 22px rgba(54, 34, 22, 0.12);
}

.plan-card-active {
  border-color: rgba(159, 105, 70, 0.72);
  box-shadow: 0 12px 24px rgba(111, 63, 42, 0.18);
}

.plan-card-free {
  background: linear-gradient(165deg, rgba(255, 255, 255, 0.88), rgba(246, 238, 223, 0.78));
}

.plan-card-free:hover {
  transform: none;
  border-color: rgba(198, 148, 108, 0.34);
  box-shadow: none;
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
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.btn-outline {
  width: 100%;
  border-radius: 0.8rem;
  padding: 0.72rem 0.95rem;
  font-weight: 600;
  border: 1px solid rgba(198, 148, 108, 0.6);
  color: #7b4e35;
  background: transparent;
  transition: all 0.2s ease;
}

.btn-outline:hover {
  background: rgba(255, 248, 235, 0.6);
}

.resume-card {
  border-radius: 0.9rem;
  border: 1px solid rgba(198, 148, 108, 0.35);
  background: rgba(255, 255, 255, 0.9);
  padding: 0.9rem;
  display: grid;
  gap: 0.6rem;
}

.resume-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #7b4e35;
}

.resume-input {
  height: 44px;
  border-radius: 0.65rem;
  border: 1px solid rgba(198, 148, 108, 0.5);
  padding: 0 0.75rem;
  font-size: 0.9rem;
  color: #4a2c1e;
  background: #fff;
  outline: none;
}

.resume-input:focus {
  border-color: rgba(159, 105, 70, 0.8);
}

.resume-error {
  color: #b91c1c;
  font-size: 0.75rem;
}

.btn-secondary,
.btn-primary {
  width: 100%;
  border-radius: 0.8rem;
  padding: 0.72rem 0.95rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-secondary {
  border: 1px solid rgba(198, 148, 108, 0.45);
  color: #7b4e35;
  background: rgba(255, 255, 255, 0.6);
}

.btn-secondary:hover {
  background: rgba(255, 248, 235, 0.95);
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

.resume-card {
  margin-top: 1rem;
}

@media (min-width: 768px) {
  .subscription-popup {
    padding: 0.95rem;
  }
  .plan-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .popup-actions {
    flex-direction: row;
    justify-content: flex-end;
  }
  .btn-secondary {
    width: 170px;
  }
  .btn-outline {
    width: 220px;
  }
  .btn-primary {
    width: 290px;
  }
}
</style>
