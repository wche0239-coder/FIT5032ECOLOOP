// Approximate centre points ([longitude, latitude]) for suburbs used by
// listings. Listings store only a suburb, so map pins are placed near
// the suburb centre with a small, stable offset per listing — close
// enough to plan a trip, without publishing anyone's exact address.
export const MELBOURNE_CBD = [144.9631, -37.8136]

export const suburbCentres = {
  'box hill': [145.1218, -37.8189],
  carlton: [144.9671, -37.8001],
  fitzroy: [144.9784, -37.7987],
  brunswick: [144.9614, -37.767],
  richmond: [144.9988, -37.8183],
  footscray: [144.8995, -37.8016],
  coburg: [144.9654, -37.7437],
  'st kilda': [144.9809, -37.8676],
  northcote: [144.9998, -37.7699],
  collingwood: [144.9869, -37.8027],
  clayton: [145.1191, -37.9249],
  hawthorn: [145.0346, -37.822],
  melbourne: MELBOURNE_CBD,
}

function hash(text) {
  let h = 0
  for (const ch of String(text)) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

/** Find a known suburb mentioned anywhere in a free-text place name. */
export function suburbCentreFor(place = '') {
  const text = place.toLowerCase()
  const match = Object.keys(suburbCentres).find((name) => text.includes(name))
  return match ? suburbCentres[match] : null
}

/**
 * [lng, lat] for a listing: its own coordinates if it has them (set
 * when posted via geocoding), otherwise its suburb centre plus a small
 * deterministic offset (~±400 m) so pins in one suburb don't overlap.
 */
export function listingCoords(listing) {
  if (Number.isFinite(listing.lng) && Number.isFinite(listing.lat)) return [listing.lng, listing.lat]
  const base = suburbCentreFor(listing.suburb) || MELBOURNE_CBD
  const h = hash(listing.id)
  const dx = ((h % 1000) / 1000 - 0.5) * 0.009
  const dy = ((Math.floor(h / 1000) % 1000) / 1000 - 0.5) * 0.007
  return [base[0] + dx, base[1] + dy]
}

/** Great-circle distance in km between two [lng, lat] points. */
export function distanceKm([lng1, lat1], [lng2, lat2]) {
  const R = 6371
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}
