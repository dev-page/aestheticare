const PLAN_ORDER = {
  free: 0,
  'free-trial': 0,
  basic: 1,
  premium: 2,
}

export const normalizePlanId = (value) => {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return 'free'
  if (raw === 'free-trial' || raw === 'free_trial' || raw === 'free trial') return 'free-trial'
  if (raw === 'freeplan' || raw === 'free_plan' || raw === 'free') return 'free'
  if (raw.includes('basic')) return 'basic'
  if (raw.includes('premium')) return 'premium'
  if (raw.includes('free') || raw.includes('trial')) return 'free-trial'
  return raw
}

export const getPlanRank = (value) => {
  const planId = normalizePlanId(value)
  return PLAN_ORDER[planId] ?? -1
}

export const getPlanLabel = (value) => {
  const planId = normalizePlanId(value)
  if (planId === 'free' || planId === 'free-trial') return 'Free Plan'
  if (planId === 'basic') return 'Basic'
  if (planId === 'premium') return 'Premium'
  return value || 'Not set'
}

export const getPlanSelectionState = (currentPlan, targetPlan) => {
  const currentRank = getPlanRank(currentPlan)
  const targetRank = getPlanRank(targetPlan)
  const currentPlanId = normalizePlanId(currentPlan)
  const targetPlanId = normalizePlanId(targetPlan)

  if (!targetPlanId) {
    return { allowed: false, reason: 'invalid', currentRank, targetRank, currentPlanId, targetPlanId }
  }

  if (currentRank < 0) {
    return { allowed: true, reason: 'no-current-plan', currentRank, targetRank, currentPlanId, targetPlanId }
  }

  if (targetRank <= currentRank) {
    if (targetRank === currentRank) {
      return { allowed: false, reason: 'same-plan', currentRank, targetRank, currentPlanId, targetPlanId }
    }
    return { allowed: false, reason: 'downgrade', currentRank, targetRank, currentPlanId, targetPlanId }
  }

  return { allowed: true, reason: 'upgrade', currentRank, targetRank, currentPlanId, targetPlanId }
}

export const getPlanSelectionMessage = (currentPlan, targetPlan) => {
  const state = getPlanSelectionState(currentPlan, targetPlan)
  if (state.allowed) return ''
  if (state.reason === 'same-plan') {
    return 'You already have this plan.'
  }
  if (state.reason === 'downgrade') {
    return 'Downgrades are not available. Please choose a higher tier.'
  }
  return 'This plan cannot be selected right now.'
}

