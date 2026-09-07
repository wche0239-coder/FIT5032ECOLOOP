import { listingImageMap } from '../data/listingImageMap'

// Same pattern as categoryImages.js, but for photos of specific
// listings rather than generic category photos. Only listings
// present in listingImageMap AND with a matching file in
// src/assets/listings/ will resolve to an image — everything else
// returns null so the caller can fall back to a category photo.
const imageModules = import.meta.glob(
  '/src/assets/listings/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true, import: 'default' }
)

const imageEntries = Object.entries(imageModules).map(([path, url]) => {
  const filename = path.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase()
  return { filename, url }
})

export function getListingImage(listingId) {
  const expectedName = listingImageMap[listingId]
  if (!expectedName) return null
  const match = imageEntries.find((e) => e.filename === expectedName.toLowerCase())
  return match ? match.url : null
}
