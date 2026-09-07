import { useLocalStorage } from './useLocalStorage'
import { sanitizeObject } from '../utils/sanitize'

// Two independent rating collections, per the requirement to support
// rating more than one "aspect": individual listings, and sellers
// (trust/reputation). Each rating is { id, value (1-5), comment,
// byUser, createdAt }, keyed by the id of the thing being rated.
const listingRatings = useLocalStorage('ecoloop_listing_ratings', {})
const sellerRatings = useLocalStorage('ecoloop_seller_ratings', {})

function average(ratings) {
  if (!ratings || ratings.length === 0) return 0
  const sum = ratings.reduce((acc, r) => acc + r.value, 0)
  return Math.round((sum / ratings.length) * 10) / 10
}

export function useRatings() {
  function rateListing(listingId, value, comment, byUser = 'Anonymous') {
    const clean = sanitizeObject({ comment }, ['comment'])
    const entry = { id: `r-${Date.now()}`, value, comment: clean.comment, byUser, createdAt: new Date().toISOString() }
    listingRatings.value = {
      ...listingRatings.value,
      [listingId]: [...(listingRatings.value[listingId] || []), entry],
    }
  }

  function rateSeller(sellerName, value, comment, byUser = 'Anonymous') {
    const clean = sanitizeObject({ comment }, ['comment'])
    const entry = { id: `r-${Date.now()}`, value, comment: clean.comment, byUser, createdAt: new Date().toISOString() }
    sellerRatings.value = {
      ...sellerRatings.value,
      [sellerName]: [...(sellerRatings.value[sellerName] || []), entry],
    }
  }

  function getListingRatings(listingId) {
    return listingRatings.value[listingId] || []
  }
  function getSellerRatingsFor(sellerName) {
    return sellerRatings.value[sellerName] || []
  }

  function getListingAverage(listingId) {
    return average(getListingRatings(listingId))
  }
  function getSellerAverage(sellerName) {
    return average(getSellerRatingsFor(sellerName))
  }

  return {
    listingRatings,
    sellerRatings,
    rateListing,
    rateSeller,
    getListingRatings,
    getSellerRatingsFor,
    getListingAverage,
    getSellerAverage,
  }
}
