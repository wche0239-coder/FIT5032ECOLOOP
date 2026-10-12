// Thin wrappers over the Mapbox REST APIs used by BR (E.2).
// The public (pk.) token is safe in front-end code as long as it is
// URL-restricted to this site in the Mapbox account settings.
import { MELBOURNE_CBD } from '../data/suburbs'

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || ''
export const hasMapbox = MAPBOX_TOKEN.startsWith('pk.')

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Map service error (${res.status})`)
  }
  return res.json()
}

/**
 * Feature 1 — place search (Geocoding v6, forward).
 * Biased towards Melbourne and limited to Australia.
 * @returns {Promise<Array<{ id, name, address, coords: [number, number] }>>}
 */
export async function searchPlaces(query, near = MELBOURNE_CBD) {
  const params = new URLSearchParams({
    q: query.slice(0, 200),
    country: 'au',
    proximity: near.join(','),
    limit: '5',
    language: 'en',
    access_token: MAPBOX_TOKEN,
  })
  const data = await getJson(`https://api.mapbox.com/search/geocode/v6/forward?${params}`)
  return (data.features || []).map((f) => ({
    id: f.id,
    name: f.properties.name_preferred || f.properties.name,
    address: f.properties.full_address || f.properties.place_formatted || '',
    coords: f.geometry.coordinates,
  }))
}

/**
 * Feature 2 — routing between two points (Directions v5).
 * @param {'walking'|'cycling'|'driving'} profile
 * @returns {Promise<{ distanceKm, durationMin, geometry, steps: Array<{ instruction, distanceM }> }>}
 */
export async function getRoute(from, to, profile = 'walking') {
  const coords = `${from.join(',')};${to.join(',')}`
  const params = new URLSearchParams({
    geometries: 'geojson',
    steps: 'true',
    overview: 'full',
    language: 'en',
    access_token: MAPBOX_TOKEN,
  })
  const data = await getJson(`https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?${params}`)
  const route = data.routes?.[0]
  if (!route) throw new Error('No route found between those two points.')
  return {
    distanceKm: route.distance / 1000,
    durationMin: Math.max(1, Math.round(route.duration / 60)),
    geometry: route.geometry,
    steps: route.legs.flatMap((leg) =>
      leg.steps.map((s) => ({ instruction: s.maneuver.instruction, distanceM: Math.round(s.distance) }))
    ),
  }
}
