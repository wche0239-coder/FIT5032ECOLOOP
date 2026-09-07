<script setup>
import { computed } from 'vue'
import { getCategory } from '../data/categories'
import { getCategoryImage } from '../utils/categoryImages'
import { getListingImage } from '../utils/listingImages'
import { useRatings } from '../composables/useRatings'
import MarketTag from './MarketTag.vue'
import StarRating from './StarRating.vue'

const props = defineProps({
  listing: { type: Object, required: true },
})
const emit = defineEmits(['request', 'rate'])

const category = computed(() => getCategory(props.listing.category))
// Prefer a photo of this exact listing; fall back to a category photo.
const exactImage = computed(() => getListingImage(props.listing.id))
const displayImage = computed(() => exactImage.value || getCategoryImage(props.listing.category))
const imageAlt = computed(() =>
  exactImage.value
    ? `Photo of ${props.listing.title}`
    : `Example ${category.value.label.toLowerCase()} item, representative photo`
)

const { getListingAverage, getListingRatings, getSellerAverage, getSellerRatingsFor } = useRatings()
const listingAvg = computed(() => getListingAverage(props.listing.id))
const listingCount = computed(() => getListingRatings(props.listing.id).length)
const sellerAvg = computed(() => getSellerAverage(props.listing.ownerName))
const sellerCount = computed(() => getSellerRatingsFor(props.listing.ownerName).length)
</script>

<template>
  <div class="ticket-card h-100 d-flex flex-column">
    <div class="placeholder-thumb" :style="{ '--cat-color': category.color }">
      <img
        v-if="displayImage"
        :src="displayImage"
        :alt="imageAlt"
        class="thumb-img"
        loading="lazy"
      />
      <template v-else>
        <i :class="['bi', category.icon]" aria-hidden="true"></i>
        <span class="visually-hidden">{{ category.label }} item photo placeholder</span>
      </template>
    </div>
    <div class="perforation"></div>
    <div class="p-3 d-flex flex-column flex-grow-1">
      <h3 class="h6 mb-2" style="font-family: var(--font-display); font-weight: 600;">
        {{ listing.title }}
      </h3>

      <div class="d-flex flex-wrap gap-1 mb-2">
        <span class="meta-chip">{{ category.label }}</span>
        <span class="meta-chip">{{ listing.condition }}</span>
        <span class="meta-chip"><i class="bi bi-geo-alt"></i> {{ listing.distanceKm }} km</span>
      </div>

      <button
        type="button"
        class="btn btn-link btn-sm p-0 text-start mb-2 d-inline-flex align-items-center"
        @click="emit('rate', { type: 'listing', id: listing.id, label: listing.title })"
      >
        <StarRating :average="listingAvg" :count="listingCount" readonly size="0.8rem" />
        <span class="text-faint small ms-1">rate item</span>
      </button>

      <p class="text-soft small flex-grow-1 mb-2">{{ listing.description }}</p>

      <div class="d-flex align-items-center justify-content-between small text-faint mb-2">
        <span>by {{ listing.ownerName }}</span>
        <button
          type="button"
          class="btn btn-link btn-sm p-0 d-inline-flex align-items-center"
          @click="emit('rate', { type: 'seller', id: listing.ownerName, label: listing.ownerName })"
        >
          <StarRating :average="sellerAvg" :count="sellerCount" readonly size="0.8rem" />
          <span class="ms-1">rate seller</span>
        </button>
      </div>

      <div class="d-flex align-items-center justify-content-between pt-2 border-top hairline">
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
