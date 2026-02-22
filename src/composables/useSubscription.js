// useSubscription.js
import { ref } from "vue";

// Example: user’s active features (replace with real data from Firestore or API)
const activeFeatures = ref(["subscription", "premium"]);

export function useSubscription() {
  const hasFeature = (feature) => {
    return activeFeatures.value.includes(feature);
  };

  return { hasFeature };
}