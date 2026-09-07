// Maps a category id (e.g. "furniture") to a real photo placed in
// src/assets/categories/, if one exists. Categories without a photo
// yet simply return null — callers fall back to the colour+icon
// placeholder, so adding images is incremental and never breaks
// the build if some categories are still missing a photo.
//
// Matching rule: a file matches a category if its filename (without
// extension) starts with the category id — e.g. "furniture.jpg" or
// "furniture-chair.jpg" both match the "furniture" category.

const imageModules = import.meta.glob(
  '/src/assets/categories/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}',
  { eager: true, import: 'default' }
)

const imageEntries = Object.entries(imageModules).map(([path, url]) => {
  const filename = path.split('/').pop().replace(/\.[^.]+$/, '').toLowerCase()
  return { filename, url }
})

export function getCategoryImage(categoryId) {
  const id = categoryId.toLowerCase()
  const exact = imageEntries.find((e) => e.filename === id)
  if (exact) return exact.url
  const prefixMatch = imageEntries.find((e) => e.filename.startsWith(id))
  return prefixMatch ? prefixMatch.url : null
}
