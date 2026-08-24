// Shared category list used by the browse filters, the post-item
// form and the bulk-upload validator, so every part of the app
// dynamically reads from the same JS data structure.
export const categories = [
  { id: 'furniture', label: 'Furniture', icon: 'bi-house-door', color: '#5C7A5B' },
  { id: 'clothing', label: 'Clothing', icon: 'bi-bag', color: '#A6512E' },
  { id: 'toys-baby', label: 'Toys & Baby', icon: 'bi-controller', color: '#C79A2B' },
  { id: 'electronics', label: 'Electronics', icon: 'bi-camera', color: '#3A5A6B' },
  { id: 'homewares', label: 'Homewares', icon: 'bi-house-heart', color: '#7A5C6E' },
  { id: 'packaging', label: 'Packaging', icon: 'bi-box-seam', color: '#8C6A3E' },
  { id: 'food', label: 'Food (near-date)', icon: 'bi-cup-hot', color: '#B0602E' },
  { id: 'books', label: 'Books', icon: 'bi-book', color: '#41575F' },
  { id: 'garden', label: 'Garden', icon: 'bi-flower1', color: '#3F6B44' },
]

export function getCategory(id) {
  return categories.find((c) => c.id === id) || { label: id, icon: 'bi-basket', color: '#5C7A5B' }
}
