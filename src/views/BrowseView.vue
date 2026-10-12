<script setup>
import { ref, computed, defineAsyncComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useListings } from '../composables/useListings'
import { useAuth } from '../composables/useAuth'
import { setFlash } from '../composables/useFlash'
import { categories } from '../data/categories'
import ListingCard from '../components/ListingCard.vue'
import RequestModal from '../components/RequestModal.vue'
import RatingModal from '../components/RatingModal.vue'

// BR (E.2) — the Mapbox map is loaded only when someone opens Map view,
// so the list view stays fast.
const ListingMap = defineAsyncComponent(() => import('../components/ListingMap.vue'))

const router = useRouter()
const { isLoggedIn } = useAuth()
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

// ---- Rating modal (requires login — BR C.1/C.2) ----
const ratingTarget = ref(null)
function openRating(target) {
  if (!isLoggedIn.value) {
    setFlash('Please log in to leave a rating.')
    router.push({ path: '/login', query: { redirect: '/browse' } })
    return
  }
  ratingTarget.value = target
}
function closeRating() {
  ratingTarget.value = null
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
        <div class="btn-group" role="group" aria-label="Choose how to view listings">
          <button
            type="button"
            class="btn btn-sm"
            :class="view === 'list' ? 'btn-primary' : 'btn-ghost'"
            :aria-pressed="view === 'list'"
            @click="view = 'list'"
          >
            <i class="bi bi-list-ul me-1" aria-hidden="true"></i>List view
          </button>
          <button
            type="button"
            class="btn btn-sm"
            :class="view === 'map' ? 'btn-primary' : 'btn-ghost'"
            :aria-pressed="view === 'map'"
            @click="view = 'map'"
          >
            <i class="bi bi-map me-1" aria-hidden="true"></i>Map view
          </button>
        </div>
      </div>

      <!-- Search -->
      <label for="listing-search" class="field-label">Search listings</label>
      <div class="input-group mb-3" style="max-width: 480px;">
        <span class="input-group-text bg-white hairline" aria-hidden="true"><i class="bi bi-search" aria-hidden="true"></i></span>
        <input
          id="listing-search"
          v-model="search"
          type="search"
          class="form-control"
          placeholder="Search listings by keyword..."
        />
      </div>

      <!-- Filter bar -->
      <div class="d-flex flex-wrap gap-2 align-items-center mb-4 pb-3 border-bottom hairline">
        <select v-model="categoryFilter" class="form-select form-select-sm w-auto" aria-label="Filter by category">
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

        <select v-model="sortBy" class="form-select form-select-sm w-auto ms-lg-auto" aria-label="Sort listings">
          <option value="newest">Sort: Newest</option>
          <option value="nearest">Sort: Nearest</option>
          <option value="price-asc">Sort: Price (low to high)</option>
        </select>
      </div>

      <p class="text-faint small mb-3" role="status" aria-live="polite">{{ filtered.length }} listings match your filters</p>

      <!-- List view -->
      <div v-if="view === 'list'">
        <div v-if="visibleListings.length" class="row g-3">
          <div v-for="listing in visibleListings" :key="listing.id" class="col-12 col-sm-6 col-md-6 col-lg-4 col-xl-4">
            <ListingCard :listing="listing" @request="openRequest" @rate="openRating" />
          </div>
        </div>
        <div v-else class="text-center py-5 text-soft">
          <i class="bi bi-inboxes fs-2 d-block mb-2" aria-hidden="true"></i>
          No listings match those filters yet — try widening the distance or clearing a filter.
        </div>

        <div v-if="hasMore" class="text-center mt-4">
          <button class="btn btn-ghost" @click="loadMore">Load more</button>
        </div>
      </div>

      <!-- Map view: Mapbox place search + directions (BR E.2) -->
      <ListingMap v-else :listings="filtered" @request="openRequest" />
    </div>

    <RequestModal :listing="activeListing" @close="closeRequest" @sent="onSent" />
    <RatingModal :target="ratingTarget" @close="closeRating" />

    <transition name="fade">
      <div v-if="toastMessage" class="eco-toast" role="status">
        <i class="bi bi-check-circle" aria-hidden="true"></i>{{ toastMessage }}
      </div>
    </transition>
  </div>
</template>
