import { computed } from 'vue'
import { useLocalStorage } from './useLocalStorage'
import { seedListings } from '../data/seedListings'
import { sanitizeObject } from '../utils/sanitize'

// Module-level (singleton) reactive state so every component that
// imports useListings() reads and writes the very same JS data
// structure — this is what powers BR (B.2): the browse grid, the
// dashboard stats and the post-item form are all just different
// views onto one reactive array, persisted in localStorage.
const listings = useLocalStorage('ecoloop_listings', seedListings)
const requests = useLocalStorage('ecoloop_requests', [])

/**
 * Who may delete a listing (BR C.2 role-based authorisation):
 *  - admins can delete any listing (moderation)
 *  - everyone else only listings they posted themselves (matched by
 *    Firebase user id, not display name, so two people called "Sam"
 *    can't delete each other's items)
 *  - signed-out visitors can't delete anything
 * Seed listings have no ownerId, so only admins can remove them.
 */
export function canDeleteListing(listing, user) {
  if (!listing || !user) return false
  if (user.role === 'admin') return true
  return Boolean(listing.ownerId) && listing.ownerId === user.id
}

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
  // Free-text fields get an extra sanitisation pass before they're
  // persisted (BR C.4: defense-in-depth beyond Vue's default
  // template escaping — see src/utils/sanitize.js).
  const TEXT_FIELDS = ['title', 'description', 'ownerName', 'suburb']

  function addListing(item) {
    const clean = sanitizeObject(item, TEXT_FIELDS)
    const newItem = {
      id: `l-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      postedAt: new Date().toISOString(),
      ...clean,
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
      ...sanitizeObject(item, TEXT_FIELDS),
    }))
    listings.value = [...stamped, ...listings.value]
    return stamped
  }

  /**
   * Deletes a listing if `user` is allowed to. The permission check
   * lives here as well as in the UI, so hiding the button isn't the
   * only thing stopping an unauthorised delete.
   * @returns {boolean} true if a listing was removed
   */
  function removeListing(id, user) {
    const target = listings.value.find((l) => l.id === id)
    if (!canDeleteListing(target, user)) return false
    listings.value = listings.value.filter((l) => l.id !== id)
    // Drop pending requests for the deleted item too.
    requests.value = requests.value.filter((r) => r.listingId !== id)
    return true
  }

  function sendRequest(listingId, message) {
    const clean = sanitizeObject({ message }, ['message'])
    requests.value = [
      ...requests.value,
      { id: `r-${Date.now()}`, listingId, message: clean.message, sentAt: new Date().toISOString() },
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
    canDeleteListing,
    sendRequest,
    estimateKg,
    totalItems,
    businessListings,
    totalKgDiverted,
  }
}
