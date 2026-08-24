import { computed } from 'vue'
import { useLocalStorage } from './useLocalStorage'
import { seedListings } from '../data/seedListings'

// Module-level (singleton) reactive state so every component that
// imports useListings() reads and writes the very same JS data
// structure — this is what powers BR (B.2): the browse grid, the
// dashboard stats and the post-item form are all just different
// views onto one reactive array, persisted in localStorage.
const listings = useLocalStorage('ecoloop_listings', seedListings)
const requests = useLocalStorage('ecoloop_requests', [])

// Rough diversion estimate used for the business dashboard's
// "kg diverted" stat card — kilograms per category, used only for
// display purposes.
const AVG_KG_BY_CATEGORY = {
  furniture: 9, clothing: 0.6, 'toys-baby': 1.1, electronics: 2.5,
  homewares: 0.8, packaging: 0.3, food: 0.9, books: 0.5, garden: 1.4,
}

function estimateKg(item) {
  return AVG_KG_BY_CATEGORY[item.category] ?? 1
}

export function useListings() {
  function addListing(item) {
    const newItem = {
      id: `l-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      postedAt: new Date().toISOString(),
      ...item,
    }
    listings.value = [newItem, ...listings.value]
    return newItem
  }

  function addBulkListings(items) {
    const stamped = items.map((item, i) => ({
      id: `l-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
      postedAt: new Date().toISOString(),
      ownerType: 'business',
      isFree: false,
      ...item,
    }))
    listings.value = [...stamped, ...listings.value]
    return stamped
  }

  function removeListing(id) {
    listings.value = listings.value.filter((l) => l.id !== id)
  }

  function sendRequest(listingId, message) {
    requests.value = [
      ...requests.value,
      { id: `r-${Date.now()}`, listingId, message, sentAt: new Date().toISOString() },
    ]
  }

  const totalItems = computed(() => listings.value.length)
  const businessListings = computed(() => listings.value.filter((l) => l.ownerType === 'business'))
  const totalKgDiverted = computed(() =>
    Math.round(listings.value.reduce((sum, l) => sum + estimateKg(l), 0) * 10) / 10
  )

  return {
    listings,
    requests,
    addListing,
    addBulkListings,
    removeListing,
    sendRequest,
    estimateKg,
    totalItems,
    businessListings,
    totalKgDiverted,
  }
}
