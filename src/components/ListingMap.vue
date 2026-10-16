<script setup>
// BR (E.2) — Map with two non-trivial features, built on Mapbox:
//   1. Place search: look up any Melbourne suburb, street or landmark
//      (or use your device location) and see every listing ranked by
//      real distance from that point.
//   2. Directions: walking / cycling / driving route from that point
//      to a listing's pickup area, drawn on the map, with distance,
//      travel time and turn-by-turn instructions.
//
// BR (E.3) — the map is never the only way in: every pin is a real
// <button> with a label, and the side panel lists the same listings
// and the route as text, all usable by keyboard and screen reader.
import { useOnline } from '../composables/useOnline'
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { MAPBOX_TOKEN, hasMapbox, searchPlaces, getRoute } from '../utils/mapboxApi'
import { MELBOURNE_CBD, listingCoords, distanceKm } from '../data/suburbs'
import { getCategory } from '../data/categories'
const { isOnline } = useOnline()

const props = defineProps({
  listings: { type: Array, required: true },
})
const emit = defineEmits(['request'])

const mapEl = ref(null)
let map = null
let listingMarkers = []
let originMarker = null

// ---- Start point (feature 1) ----
const query = ref('')
const searching = ref(false)
const searchError = ref('')
const results = ref([])
const origin = ref(null) // { label, coords }
const status = ref('') // screen-reader announcements

// ---- Selected listing + route (feature 2) ----
const selectedId = ref(null)
const profile = ref('walking')
const routing = ref(false)
const routeError = ref('')
const route = ref(null)

const ranked = computed(() =>
  props.listings
    .map((l) => {
      const coords = listingCoords(l)
      return { listing: l, coords, km: origin.value ? distanceKm(origin.value.coords, coords) : null }
    })
    .sort((a, b) => (a.km ?? 0) - (b.km ?? 0))
)
const selected = computed(() => ranked.value.find((r) => r.listing.id === selectedId.value) || null)

function formatKm(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

// ---------------- Map setup ----------------
onMounted(() => {
  if (!hasMapbox) return
  mapboxgl.accessToken = MAPBOX_TOKEN
  map = new mapboxgl.Map({
    container: mapEl.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: MELBOURNE_CBD,
    zoom: 11,
    cooperativeGestures: true, // page scroll isn't hijacked by the map
  })
  map.addControl(new mapboxgl.NavigationControl(), 'top-right')
  map.on('load', () => {
    map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map.addLayer({
      id: 'route-line',
      type: 'line',
      source: 'route',
      layout: { 'line-join': 'round', 'line-cap': 'round' },
      paint: { 'line-color': '#1F5C4D', 'line-width': 5, 'line-opacity': 0.85 },
    })
    drawListingMarkers()
  })
})

onBeforeUnmount(() => {
  map?.remove()
  map = null
})

function drawListingMarkers() {
  if (!map) return
  listingMarkers.forEach((m) => m.remove())
  listingMarkers = ranked.value.map(({ listing, coords }) => {
    const el = document.createElement('button')
    el.type = 'button'
    el.className = 'map-pin'
    el.style.setProperty('--pin-color', getCategory(listing.category).color)
    el.setAttribute('aria-label', `${listing.title}, ${listing.suburb}. Select to see directions.`)
    el.innerHTML = `<i class="bi ${getCategory(listing.category).icon}" aria-hidden="true"></i>`
    el.addEventListener('click', () => selectListing(listing.id))
    if (listing.id === selectedId.value) el.classList.add('is-selected')
    return new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map)
  })
}

watch(() => props.listings, drawListingMarkers)
watch(selectedId, drawListingMarkers)

function setRouteLine(geometry) {
  const source = map?.getSource('route')
  if (!source) return
  source.setData(geometry ? { type: 'Feature', geometry, properties: {} } : { type: 'FeatureCollection', features: [] })
}

function setOrigin(label, coords) {
  origin.value = { label, coords }
  results.value = []
  clearRoute()
  status.value = `Start point set to ${label}. Listings are now sorted by distance from there.`
  if (!map) return
  originMarker?.remove()
  const el = document.createElement('div')
  el.className = 'origin-pin'
  el.setAttribute('role', 'img')
  el.setAttribute('aria-label', `Start point: ${label}`)
  el.innerHTML = '<i class="bi bi-person-fill" aria-hidden="true"></i>'
  originMarker = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map)
  map.flyTo({ center: coords, zoom: 12.5 })
}

// ---------------- Feature 1: place search ----------------
async function onSearch() {
  searchError.value = ''
  const q = query.value.trim()
  if (q.length < 2) {
    searchError.value = 'Type at least 2 characters to search.'
    return
  }
  searching.value = true
  try {
    results.value = await searchPlaces(q, origin.value?.coords)
    status.value = results.value.length
      ? `${results.value.length} places found. Choose one below.`
      : 'No places found.'
    if (!results.value.length) searchError.value = 'No places found — try a suburb name like "Fitzroy".'
  } catch (err) {
    searchError.value = err.message
  } finally {
    searching.value = false
  }
}

function useMyLocation() {
  searchError.value = ''
  if (!('geolocation' in navigator)) {
    searchError.value = 'Your browser does not support location access. Search for a place instead.'
    return
  }
  status.value = 'Finding your location…'
  navigator.geolocation.getCurrentPosition(
    (pos) => setOrigin('your current location', [pos.coords.longitude, pos.coords.latitude]),
    () => {
      searchError.value = 'Could not get your location (permission denied or unavailable). Search for a place instead.'
      status.value = ''
    },
    { enableHighAccuracy: true, timeout: 10000 }
  )
}

// ---------------- Feature 2: directions ----------------
async function selectListing(id) {
  selectedId.value = id
  clearRoute()
  const sel = selected.value
  status.value = `Selected ${sel.listing.title} in ${sel.listing.suburb}.`
  map?.flyTo({ center: sel.coords, zoom: Math.max(map.getZoom(), 13) })
  await nextTick()
  document.getElementById('selected-listing-heading')?.focus()
}

function clearRoute() {
  route.value = null
  routeError.value = ''
  setRouteLine(null)
}

async function getDirections() {
  routeError.value = ''
  if (!origin.value) {
    routeError.value = 'Set a start point first — search for a place or use your location.'
    return
  }
  routing.value = true
  try {
    route.value = await getRoute(origin.value.coords, selected.value.coords, profile.value)
    setRouteLine(route.value.geometry)
    const bounds = new mapboxgl.LngLatBounds()
    route.value.geometry.coordinates.forEach((c) => bounds.extend(c))
    map?.fitBounds(bounds, { padding: 60, maxZoom: 15 })
    status.value = `Route found: ${formatKm(route.value.distanceKm)}, about ${route.value.durationMin} minutes ${profile.value}. ${route.value.steps.length} steps listed below.`
  } catch (err) {
    routeError.value = err.message
  } finally {
    routing.value = false
  }
}
watch(profile, () => route.value && getDirections())
</script>

<template>
  <div class="listing-map">
    <div v-if="!hasMapbox" class="alert alert-warning small" role="alert">
      <i class="bi bi-exclamation-triangle me-1" aria-hidden="true"></i>
      The map needs a Mapbox token. Add <code>VITE_MAPBOX_TOKEN</code> to your <code>.env</code> file and restart the dev server.
    </div>

    <p class="visually-hidden" role="status" aria-live="polite">{{ status }}</p>

    <div class="row g-3">
      <!-- Map -->
      <div class="col-12 col-lg-8">
        <div
          v-show="hasMapbox"
          ref="mapEl"
          class="map-canvas crate-card"
          role="region"
          aria-label="Map of listings. Every listing on the map is also in the list next to it."
        ></div>
      </div>

      <!-- Side panel -->
      <div class="col-12 col-lg-4">
        <!-- Feature 1: start point -->
        <section class="crate-card p-3 mb-3" aria-labelledby="start-heading">
          <h2 id="start-heading" class="h6 mb-2">1. Choose a start point</h2>
          <form role="search" class="mb-2" @submit.prevent="onSearch">
            <label for="place-search" class="field-label">Suburb, street or landmark</label>
            <div class="input-group input-group-sm">
              <input
                id="place-search"
                v-model="query"
                type="search"
                class="form-control"
                placeholder="e.g. Fitzroy or Monash Clayton"
                :aria-invalid="!!searchError"
                :aria-describedby="searchError ? 'place-search-error' : undefined"
                :disabled="!hasMapbox"
              />
              <button type="submit" class="btn btn-primary" :disabled="!hasMapbox || searching || !isOnline">
                {{ searching ? 'Searching…' : 'Search' }}
              </button>
            </div>
          </form>
          <button type="button" class="btn btn-ghost btn-sm w-100" :disabled="!hasMapbox" @click="useMyLocation">
            <i class="bi bi-crosshair me-1" aria-hidden="true"></i>Use my current location
          </button>
          <p v-if="!isOnline" class="small offline-note mt-2 mb-0">
            <i class="bi bi-wifi-off me-1" aria-hidden="true"></i>You're offline. Place search and directions need an internet connection.
          </p>
          <p v-if="searchError" id="place-search-error" class="field-error mb-0">
            <i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ searchError }}
          </p>

          <ul v-if="results.length" class="list-unstyled mt-2 mb-0 result-list" aria-label="Place search results">
            <li v-for="r in results" :key="r.id">
              <button type="button" class="result-btn" @click="setOrigin(r.name, r.coords)">
                <strong>{{ r.name }}</strong>
                <span class="d-block small text-soft">{{ r.address }}</span>
              </button>
            </li>
          </ul>

          <p v-if="origin" class="small mt-2 mb-0">
            <i class="bi bi-geo-alt-fill text-success" aria-hidden="true"></i>
            Starting from <strong>{{ origin.label }}</strong>
          </p>
        </section>

        <!-- Feature 2: selected listing + directions -->
        <section v-if="selected" class="crate-card p-3 mb-3" aria-labelledby="selected-listing-heading">
          <div class="eyebrow mb-1">2. Directions to pickup</div>
          <h2 id="selected-listing-heading" class="h6 mb-1" tabindex="-1">{{ selected.listing.title }}</h2>
          <p class="small text-soft mb-2">
            {{ selected.listing.suburb }} · {{ selected.listing.pickupWindow }}
            <template v-if="selected.km !== null"> · {{ formatKm(selected.km) }} away (straight line)</template>
          </p>

          <fieldset class="mb-2">
            <legend class="field-label">Travel by</legend>
            <div class="btn-group btn-group-sm w-100" role="group">
              <template v-for="m in [['walking', 'Walk', 'bi-person-walking'], ['cycling', 'Bike', 'bi-bicycle'], ['driving', 'Car', 'bi-car-front']]" :key="m[0]">
                <input :id="`mode-${m[0]}`" v-model="profile" type="radio" class="btn-check" name="travel-mode" :value="m[0]" />
                <label class="btn btn-ghost" :for="`mode-${m[0]}`"><i :class="['bi', m[2], 'me-1']" aria-hidden="true"></i>{{ m[1] }}</label>
              </template>
            </div>
          </fieldset>

          <div class="d-flex gap-2">
            <button type="button" class="btn btn-primary btn-sm flex-grow-1" :disabled="routing || !hasMapbox || !isOnline" @click="getDirections">
              {{ routing ? 'Finding route…' : 'Get directions' }}
            </button>
            <button type="button" class="btn btn-ghost btn-sm" @click="emit('request', selected.listing)">Request item</button>
          </div>
          <p v-if="routeError" class="field-error mb-0" role="alert">
            <i class="bi bi-exclamation-circle" aria-hidden="true"></i>{{ routeError }}
          </p>

          <div v-if="route" class="mt-3">
            <div class="d-flex gap-3 mb-2">
              <div><span class="stat-figure fs-5">{{ formatKm(route.distanceKm) }}</span><span class="d-block small text-soft">distance</span></div>
              <div><span class="stat-figure fs-5">{{ route.durationMin }} min</span><span class="d-block small text-soft">{{ profile }}</span></div>
            </div>
            <h3 class="h6 small mb-1">Turn-by-turn</h3>
            <ol class="small step-list mb-0">
              <li v-for="(s, i) in route.steps" :key="i">
                {{ s.instruction }}
                <span v-if="s.distanceM" class="text-soft">({{ s.distanceM < 1000 ? `${s.distanceM} m` : `${(s.distanceM / 1000).toFixed(1)} km` }})</span>
              </li>
            </ol>
          </div>
        </section>

        <!-- Text alternative to the pins -->
        <section class="crate-card p-3" aria-labelledby="nearby-heading">
          <h2 id="nearby-heading" class="h6 mb-2">
            {{ origin ? 'Listings by distance' : 'Listings on the map' }}
            <span class="text-soft fw-normal">({{ ranked.length }})</span>
          </h2>
          <ul class="list-unstyled mb-0 nearby-list">
            <li v-for="r in ranked" :key="r.listing.id">
              <button
                type="button"
                class="result-btn"
                :aria-current="r.listing.id === selectedId ? 'true' : undefined"
                @click="selectListing(r.listing.id)"
              >
                <span class="d-flex justify-content-between gap-2">
                  <strong>{{ r.listing.title }}</strong>
                  <span v-if="r.km !== null" class="small text-nowrap">{{ formatKm(r.km) }}</span>
                </span>
                <span class="d-block small text-soft">{{ r.listing.suburb }} · {{ r.listing.isFree ? 'Free' : `$${r.listing.price}` }}</span>
              </button>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-canvas {
  height: 520px;
  width: 100%;
}
@media (max-width: 991.98px) {
  .map-canvas { height: 360px; }
}
.result-btn {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: 0;
  border-bottom: 1px solid var(--line);
  padding: 0.5rem 0.25rem;
  color: var(--ink);
}
.result-btn:hover { background: var(--paper-dim); }
.result-btn[aria-current='true'] { background: var(--signal-tint); box-shadow: inset 3px 0 0 var(--signal); }
.nearby-list { max-height: 320px; overflow-y: auto; }
.step-list { padding-left: 1.2rem; max-height: 220px; overflow-y: auto; }
.step-list li { margin-bottom: 0.25rem; }
fieldset { border: 0; padding: 0; margin: 0; }
</style>

<style>
/* Marker elements are created outside Vue's scope, so these are global. */
.map-pin {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: var(--pin-color, #1F5C4D);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  padding: 0;
}
.map-pin:hover { transform: scale(1.12); }
.map-pin.is-selected { outline: 3px solid #C4501F; outline-offset: 2px; transform: scale(1.2); z-index: 2; }
.map-pin:focus-visible { outline: 3px solid #C4501F; outline-offset: 2px; }
.origin-pin {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: #17211C;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
</style>
