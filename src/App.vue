<template>
  <router-view :key="$route.fullPath" />
</template>

<script setup>
import { useAuth } from '@/composables/useAuth'

// Initialize auth state globally
useAuth()
</script>
