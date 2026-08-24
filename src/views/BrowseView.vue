<script setup>
import { ref, computed } from 'vue'
import { useListings } from '../composables/useListings'
import { categories, getCategory } from '../data/categories'
import ListingCard from '../components/ListingCard.vue'
import RequestModal from '../components/RequestModal.vue'

const { listings, sendRequest } = useListings()

// ---- Filter / sort state (dynamic, reactive — BR B.2) ----
const search = ref('')
const categoryFilter = ref('')
const freeOnly = ref(false)
const maxDistance = ref(6)
const sortBy = ref('newest')
const view = ref('list') // 'list' | 'map'
const visibleCount = ref(6)

const filtered = computed(() => {
  let result = listings.value.filter((l) => {
    const matchesSearch =
      !search.value ||
      l.title.toLowerCase().includes(search.value.toLowerCase()) ||
      l.description.toLowerCase().includes(search.value.toLowerCase())
    const matchesCategory = !categoryFilter.value || l.category === categoryFilter.value
    const matchesFree = !freeOnly.value || l.isFree
    const matchesDistance = l.distanceKm <= maxDistance.value
    return matchesSearch && matchesCategory && matchesFree && matchesDistance
  })

  if (sortBy.value === 'newest') {
    result = [...result].sort((a, b) => new Date(b.postedAt) - new Date(a.postedAt))
  } else if (sortBy.value === 'nearest') {
    result = [...result].sort((a, b) => a.distanceKm - b.distanceKm)
  } else if (sortBy.value === 'price-asc') {
    result = [...result].sort((a, b) => (a.isFree ? 0 : a.price) - (b.isFree ? 0 : b.price))
  }
  return result
})

const visibleListings = computed(() => filtered.value.slice(0, visibleCount.value))
const hasMore = computed(() => filtered.value.length > visibleCount.value)

function loadMore() {
  visibleCount.value += 6
}

// ---- Request modal ----
const activeListing = ref(null)
const toastMessage = ref('')

function openRequest(listing) {
  activeListing.value = listing
}
function closeRequest() {
  activeListing.value = null
}
function onSent(message) {
  sendRequest(activeListing.value.id, message)
  toastMessage.value = `Request sent for "${activeListing.value.title}"`
  setTimeout(() => (toastMessage.value = ''), 3200)
}

// ---- Pseudo-map placement (no external map dependency) ----
function angleFor(id) {
  let hash = 0
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) % 360
  return hash
}
function pinStyle(listing) {
  const radiusPct = Math.min(46, 8 + listing.distanceKm * 6.5)
  const angle = (angleFor(listing.id) * Math.PI) / 180
  const x = 50 + radiusPct * Math.cos(angle)
  const y = 50 + radiusPct * Math.sin(angle)
  return { left: `${x}%`, top: `${y}%`, '--pin-color': getCategory(listing.category).color }
}
</script>

<template>
  <div class="section-pad">
    <div class="container">
      <div class="d-flex flex-wrap justify-content-between align-items-end gap-2 mb-4">
        <div>
          <div class="eyebrow mb-1">Marketplace</div>
          <h1 class="h3 mb-0">Browse listings</h1>
        </div>
        <div class="btn-group" role="group" aria-label="View toggle">
          <button
            class="btn btn-sm"
            :class="view === 'list' ? 'btn-primary' : 'btn-ghost'"
            @click="view = 'list'"
          >
            <i class="bi bi-list-ul me-1"></i>List view
          </button>
          <button
            class="btn btn-sm"
            :class="view === 'map' ? 'btn-primary' : 'btn-ghost'"
            @click="view = 'map'"
          >
            <i class="bi bi-map me-1"></i>Map view
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="input-group mb-3" style="max-width: 480px;">
        <span class="input-group-text bg-white hairline"><i class="bi bi-search"></i></span>
        <input
          v-model="search"
          type="search"
          class="form-control"
          placeholder="Search listings by keyword..."
        />
      </div>

      <!-- Filter bar -->
      <div class="d-flex flex-wrap gap-2 align-items-center mb-4 pb-3 border-bottom hairline">
        <select v-model="categoryFilter" class="form-select form-select-sm w-auto">
          <option value="">All categories</option>
          <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.label }}</option>
        </select>

        <div class="form-check d-flex align-items-center gap-2">
          <input id="freeOnly" v-model="freeOnly" class="form-check-input mt-0" type="checkbox" />
          <label class="form-check-label small" for="freeOnly">Free only</label>
        </div>

        <div class="d-flex align-items-center gap-2">
          <label for="distanceRange" class="small text-soft mb-0">Distance</label>
          <input
            id="distanceRange"
            v-model.number="maxDistance"
            type="range"
            min="0.5"
            max="6"
            step="0.5"
            style="width: 120px;"
          />
          <span class="small text-faint stat-figure">{{ maxDistance }} km</span>
        </div>

        <select v-model="sortBy" class="form-select form-select-sm w-auto ms-lg-auto">
          <option value="newest">Sort: Newest</option>
          <option value="nearest">Sort: Nearest</option>
          <option value="price-asc">Sort: Price (low to high)</option>
        </select>
      </div>

      <p class="text-faint small mb-3">{{ filtered.length }} listings match your filters</p>

      <!-- List view -->
      <div v-if="view === 'list'">
        <div v-if="visibleListings.length" class="row g-3">
          <div v-for="listing in visibleListings" :key="listing.id" class="col-12 col-sm-6 col-lg-4">
            <ListingCard :listing="listing" @request="openRequest" />
          </div>
        </div>
        <div v-else class="text-center py-5 text-soft">
          <i class="bi bi-inboxes fs-2 d-block mb-2"></i>
          No listings match those filters yet — try widening the distance or clearing a filter.
        </div>

        <div v-if="hasMore" class="text-center mt-4">
          <button class="btn btn-ghost" @click="loadMore">Load more</button>
        </div>
      </div>

      <!-- Map view (lightweight, dependency-free radial placement) -->
      <div v-else class="crate-card p-3">
        <div class="pseudo-map">
          <div class="pseudo-map__you">
            <i class="bi bi-geo-alt-fill"></i>
            <span class="small">You</span>
          </div>
          <div
            v-for="listing in filtered"
            :key="listing.id"
            class="pseudo-map__pin"
            :style="pinStyle(listing)"
            :title="`${listing.title} · ${listing.distanceKm} km`"
            @click="openRequest(listing)"
          >
            <i :class="['bi', getCategory(listing.category).icon]"></i>
          </div>
        </div>
        <p class="text-faint small mt-3 mb-0">
          Pins are placed by approximate distance from you. Tap a pin to request that item.
        </p>
      </div>
    </div>

    <RequestModal :listing="activeListing" @close="closeRequest" @sent="onSent" />

    <transition name="fade">
      <div v-if="toastMessage" class="eco-toast">
        <i class="bi bi-check-circle"></i>{{ toastMessage }}
      </div>
    </transition>
  </div>
</template>

<style scoped>
.pseudo-map {
  position: relative;
  height: 380px;
  border-radius: var(--radius-md);
  background:
    radial-gradient(circle at 50% 50%, transparent 0, transparent 24%, var(--line) 24.6%, transparent 25%),
    radial-gradient(circle at 50% 50%, transparent 0, transparent 44%, var(--line) 44.6%, transparent 45%),
    var(--bg-kraft);
  overflow: hidden;
}
.pseudo-map__you {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  color: var(--primary);
  font-weight: 700;
}
.pseudo-map__pin {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--pin-color, var(--primary));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 2px solid var(--bg);
  box-shadow: 0 2px 6px rgba(0,0,0,0.2);
  transition: transform .12s ease;
}
.pseudo-map__pin:hover { transform: translate(-50%, -50%) scale(1.15); }
</style>
