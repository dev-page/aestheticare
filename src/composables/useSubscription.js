// useSubscription.js
import { ref } from "vue";
import { auth, db } from "@/config/firebaseConfig";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where } from "firebase/firestore";

const activeFeatures = ref([]);
const activePlan = ref("");
const isLoading = ref(false);
const isReadOnly = ref(false);
const isExpired = ref(false);
const graceEndsAt = ref(null);
const subscriptionExpiresAt = ref(null);
const userRole = ref("");
let initialized = false;
let lastUserId = null;
const GRACE_DAYS = 7;
let unpublishAttempted = false;
let lastUnpublishUserId = null;
let unsubscribePlanPermissions = null;
let activePlanKey = "";

const OTP_API_BASE = (import.meta.env.VITE_OTP_API_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const PLAN_CACHE_KEY = "subscription:plan";
const PLAN_FEATURES_CACHE_PREFIX = "subscription:features:";
const PLAN_CACHE_TTL_MS = 5 * 60 * 1000;

const DEFAULT_FEATURES = {
  "free-trial": [
    "subscription",
    "multi_branch",
    "staff_management",
    "appointments",
    "pos_payments",
    "inventory",
    "services",
    "online_consultations",
    "reports",
    "hr",
    "payroll",
    "attendance",
    "dss",
  ],
  basic: [
    "subscription",
    "staff_management",
    "appointments",
    "pos_payments",
    "inventory",
    "services",
  ],
  premium: [
    "subscription",
    "multi_branch",
    "staff_management",
    "appointments",
    "pos_payments",
    "inventory",
    "services",
    "online_consultations",
    "reports",
    "hr",
    "payroll",
    "attendance",
    "dss",
  ],
};

DEFAULT_FEATURES.premium = [...DEFAULT_FEATURES["free-trial"]];

const normalizePlanKey = (value) => {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "free-trial";
  if (raw.includes("basic")) return "basic";
  if (raw.includes("premium")) return "premium";
  if (raw.includes("free")) return "free-trial";
  return raw;
};

const toDate = (value) => {
  if (!value) return null;
  if (typeof value?.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const resolveSubscriptionForUser = async (userId) => {
  const userSnap = await getDoc(doc(db, "users", userId));
  if (!userSnap.exists()) {
    return { planKey: "free-trial", expiresAt: null, role: "" };
  }
  const userData = userSnap.data() || {};
  const role = String(userData.role || "").trim();

  const hasDirectPlan = Boolean(userData.subscriptionPlan || userData.plan);
  if (hasDirectPlan) {
    const directPlan = normalizePlanKey(userData.subscriptionPlan || userData.plan);
    const directExpiresAt = toDate(userData.subscriptionExpiresAt);
    return { planKey: directPlan, expiresAt: directExpiresAt, role };
  }

  const branchId = userData.branchId;
  if (branchId) {
    const clinicSnap = await getDoc(doc(db, "clinics", branchId));
    if (clinicSnap.exists()) {
      const clinicData = clinicSnap.data() || {};
      const clinicPlan = clinicData.subscriptionPlan || clinicData.plan;
      if (clinicPlan) {
        return {
          planKey: normalizePlanKey(clinicPlan),
          expiresAt: toDate(clinicData.subscriptionExpiresAt),
          role
        };
      }
      const clinicOwnerId = String(clinicData.ownerId || "").trim();
      if (clinicOwnerId) {
        const ownerSnap = await getDoc(doc(db, "users", clinicOwnerId));
        if (ownerSnap.exists()) {
          const ownerData = ownerSnap.data() || {};
          const ownerPlan = ownerData.subscriptionPlan || ownerData.plan;
          if (ownerPlan) {
            return {
              planKey: normalizePlanKey(ownerPlan),
              expiresAt: toDate(ownerData.subscriptionExpiresAt),
              role
            };
          }
        }
      }
    }
  }

  const ownerQuery = query(collection(db, "clinics"), where("ownerId", "==", userId));
  const ownerSnap = await getDocs(ownerQuery);
  if (!ownerSnap.empty) {
    const clinicData = ownerSnap.docs[0].data() || {};
    const clinicPlan = clinicData.subscriptionPlan || clinicData.plan;
    if (clinicPlan) {
      return {
        planKey: normalizePlanKey(clinicPlan),
        expiresAt: toDate(clinicData.subscriptionExpiresAt),
        role
      };
    }
  }

  return { planKey: "free-trial", expiresAt: null, role };
};

const loadPlanPermissions = async (planKey) => {
  try {
    const cached = JSON.parse(localStorage.getItem(`${PLAN_FEATURES_CACHE_PREFIX}${planKey}`) || "null");
    if (cached && Array.isArray(cached.data) && cached.ts) {
      const isFresh = Date.now() - cached.ts < PLAN_CACHE_TTL_MS;
      if (isFresh && cached.data.length) {
        activeFeatures.value = cached.data;
      }
    }
  } catch (_error) {
    // ignore cache parse
  }

  const planDoc = await getDoc(doc(db, "planPermissions", planKey));
  if (planDoc.exists()) {
    const data = planDoc.data() || {};
    if (Array.isArray(data.permissions) && data.permissions.length) {
      const permissions = data.permissions.map((value) => String(value || "").trim()).filter(Boolean);
      try {
        localStorage.setItem(
          `${PLAN_FEATURES_CACHE_PREFIX}${planKey}`,
          JSON.stringify({ data: permissions, ts: Date.now() })
        );
      } catch (_error) {
        // ignore cache errors
      }
      return permissions;
    }
  }
  return DEFAULT_FEATURES[planKey] || DEFAULT_FEATURES["free-trial"];
};

const startPlanPermissionsListener = (planKey) => {
  if (!planKey) return;
  if (unsubscribePlanPermissions) {
    unsubscribePlanPermissions();
    unsubscribePlanPermissions = null;
  }

  unsubscribePlanPermissions = onSnapshot(
    doc(db, "planPermissions", planKey),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() || {};
        if (Array.isArray(data.permissions) && data.permissions.length) {
          activeFeatures.value = data.permissions
            .map((value) => String(value || "").trim())
            .filter(Boolean);
          try {
            localStorage.setItem(
              `${PLAN_FEATURES_CACHE_PREFIX}${planKey}`,
              JSON.stringify({ data: activeFeatures.value, ts: Date.now() })
            );
          } catch (_error) {
            // ignore cache errors
          }
          return;
        }
      }
      activeFeatures.value = DEFAULT_FEATURES[planKey] || DEFAULT_FEATURES["free-trial"];
    },
    (error) => {
      console.error("Failed to listen to plan permissions:", error);
    }
  );
};

const initSubscription = async () => {
  const currentUserId = auth.currentUser?.uid || null;
  if (initialized && lastUserId === currentUserId) return;
  isLoading.value = true;
  try {
    const user = auth.currentUser;
    if (!user) {
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith(PLAN_CACHE_KEY) || key.startsWith(PLAN_FEATURES_CACHE_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
      } catch (_error) {
        // ignore cache clear errors
      }
      activePlan.value = "";
      activeFeatures.value = [];
      isReadOnly.value = false;
      isExpired.value = false;
      graceEndsAt.value = null;
      subscriptionExpiresAt.value = null;
      initialized = false;
      lastUserId = null;
      return;
    }

    try {
      const cachedPlan = JSON.parse(localStorage.getItem(`${PLAN_CACHE_KEY}:${user.uid}`) || "null");
      if (cachedPlan?.planKey && cachedPlan?.ts) {
        const isFresh = Date.now() - cachedPlan.ts < PLAN_CACHE_TTL_MS;
        if (isFresh) {
          activePlan.value = cachedPlan.planKey;
          if (cachedPlan?.expiresAt) {
            subscriptionExpiresAt.value = toDate(cachedPlan.expiresAt);
          }
        }
      }
    } catch (_error) {
      // ignore cache errors
    }

    initialized = true;
    lastUserId = currentUserId;
    const subscriptionMeta = await resolveSubscriptionForUser(user.uid);
    const planKey = subscriptionMeta.planKey;
    activePlanKey = planKey;
    activePlan.value = planKey;
    subscriptionExpiresAt.value = subscriptionMeta.expiresAt;
    userRole.value = subscriptionMeta.role || "";
    const permissions = await loadPlanPermissions(planKey);
    activeFeatures.value = permissions;
    startPlanPermissionsListener(planKey);
    try {
      localStorage.setItem(
        `${PLAN_CACHE_KEY}:${user.uid}`,
        JSON.stringify({
          planKey,
          expiresAt: subscriptionMeta.expiresAt ? subscriptionMeta.expiresAt.toISOString() : null,
          ts: Date.now()
        })
      );
    } catch (_error) {
      // ignore cache errors
    }

    const now = new Date();
    if (subscriptionMeta.expiresAt) {
      const expiresAt = subscriptionMeta.expiresAt;
      const graceEnd = new Date(expiresAt.getTime() + GRACE_DAYS * 24 * 60 * 60 * 1000);
      graceEndsAt.value = graceEnd;
      const expired = now.getTime() > expiresAt.getTime();
      isExpired.value = expired;
      isReadOnly.value = expired;
      if (expired && userRole.value.toLowerCase() === "owner") {
        const shouldAttempt = !unpublishAttempted || lastUnpublishUserId !== user.uid;
        if (shouldAttempt) {
          unpublishAttempted = true;
          lastUnpublishUserId = user.uid;
          fetch(`${OTP_API_BASE}/admin/unpublish-expired-clinics`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ownerId: user.uid })
          }).catch((error) => {
            console.error("Failed to request unpublish of expired clinics:", error);
          });
        }
      }
    } else {
      isExpired.value = false;
      isReadOnly.value = false;
      graceEndsAt.value = null;
    }
  } catch (error) {
    console.error("Failed to load subscription features:", error);
    activePlan.value = "free-trial";
    activeFeatures.value = DEFAULT_FEATURES["free-trial"];
    isReadOnly.value = false;
    isExpired.value = false;
    graceEndsAt.value = null;
    subscriptionExpiresAt.value = null;
  } finally {
    isLoading.value = false;
  }
};

export function useSubscription() {
  const hasFeature = (feature) => {
    if (!feature) return true;
    if (feature === "subscription") return true;
    if (!initialized) {
      initSubscription();
    }
    return activeFeatures.value.includes(feature);
  };

  return {
    hasFeature,
    initSubscription,
    isLoading,
    activePlan,
    isReadOnly,
    isExpired,
    graceEndsAt,
    subscriptionExpiresAt,
    userRole
  };
}
