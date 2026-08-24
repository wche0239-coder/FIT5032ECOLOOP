<script setup>
import { computed } from 'vue'
import { getCategory } from '../data/categories'
import MarketTag from './MarketTag.vue'

const props = defineProps({
  listing: { type: Object, required: true },
})
const emit = defineEmits(['request'])

const category = computed(() => getCategory(props.listing.category))
</script>

<template>
  <div class="crate-card h-100 d-flex flex-column">
    <div class="placeholder-thumb" :style="{ '--cat-color': category.color }">
      <i :class="['bi', category.icon]"></i>
    </div>
    <div class="p-3 d-flex flex-column flex-grow-1">
      <div class="d-flex justify-content-between align-items-start gap-2 mb-1">
        <h3 class="h6 mb-0" style="font-family: var(--font-body); font-weight: 700;">
          {{ listing.title }}
        </h3>
      </div>
      <div class="d-flex flex-wrap gap-1 text-faint small mb-2">
        <span>{{ category.label }}</span>
        <span>·</span>
        <span>{{ listing.condition }}</span>
        <span>·</span>
        <span><i class="bi bi-geo-alt"></i> {{ listing.distanceKm }} km</span>
      </div>
      <p class="text-soft small flex-grow-1 mb-3">{{ listing.description }}</p>
      <div class="d-flex align-items-center justify-content-between">
        <MarketTag :variant="listing.isFree ? 'free' : 'price'">
          {{ listing.isFree ? 'FREE' : `$${listing.price}` }}
        </MarketTag>
        <button class="btn btn-sm btn-primary" @click="emit('request', listing)">
          Request
        </button>
      </div>
    </div>
  </div>
</template>
