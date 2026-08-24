// Seed data loaded into localStorage the very first time the app
// runs. After that, everything the user posts/edits lives in
// localStorage and this file is no longer read.
export const seedListings = [
  {
    id: 'seed-1', title: 'Timber toddler bed frame', category: 'furniture', condition: 'Used',
    description: 'Solid pine toddler bed, a few surface scratches but sturdy. Outgrown after one year.',
    isFree: true, price: null, distanceKm: 1.2, ownerType: 'individual', ownerName: 'Mia Chen',
    suburb: 'Box Hill', pickupWindow: 'Weekday evenings', postedAt: '2026-08-18T09:00:00',
  },
  {
    id: 'seed-2', title: 'IKEA desk lamp, works fine', category: 'homewares', condition: 'Like New',
    description: 'Barely used adjustable desk lamp. Swapping to a wall-mounted one.',
    isFree: false, price: 8, distanceKm: 0.6, ownerType: 'individual', ownerName: 'Jordan Blake',
    suburb: 'Carlton', pickupWindow: 'Weekends', postedAt: '2026-08-20T14:30:00',
  },
  {
    id: 'seed-3', title: 'Box of assorted kids picture books (12)', category: 'books', condition: 'Used',
    description: 'Great condition picture books, ages 2-6. Happy to bundle.',
    isFree: true, price: null, distanceKm: 2.4, ownerType: 'individual', ownerName: 'Mia Chen',
    suburb: 'Box Hill', pickupWindow: 'Weekday evenings', postedAt: '2026-08-15T11:00:00',
  },
  {
    id: 'seed-4', title: 'Café takeaway cups — surplus stock (200)', category: 'packaging', condition: 'New',
    description: 'Unopened compostable cup sleeves, wrong size for our new supplier. Bulk lot.',
    isFree: false, price: 15, distanceKm: 3.1, ownerType: 'business', ownerName: "Priya Nair — Fitzroy Café & Homewares",
    suburb: 'Fitzroy', pickupWindow: 'Weekday mornings', postedAt: '2026-08-21T08:15:00',
  },
  {
    id: 'seed-5', title: 'Near-date pantry staples bundle', category: 'food', condition: 'New',
    description: 'Rice, pasta and tinned goods nearing best-before, all sealed. Collect today/tomorrow.',
    isFree: true, price: null, distanceKm: 3.1, ownerType: 'business', ownerName: "Priya Nair — Fitzroy Café & Homewares",
    suburb: 'Fitzroy', pickupWindow: 'Weekday mornings', postedAt: '2026-08-22T07:40:00',
  },
  {
    id: 'seed-6', title: 'Flat-pack office chair, minor wobble', category: 'furniture', condition: 'Used',
    description: 'Mesh back office chair, one castor a bit loose but an easy fix.',
    isFree: false, price: 12, distanceKm: 4.8, ownerType: 'individual', ownerName: 'Sam Osei',
    suburb: 'Brunswick', pickupWindow: 'Weekends', postedAt: '2026-08-12T16:00:00',
  },
  {
    id: 'seed-7', title: "Kids' winter jackets, size 4-6 (bundle of 3)", category: 'clothing', condition: 'Like New',
    description: 'Grown out of these within a season. Clean, no stains or tears.',
    isFree: true, price: null, distanceKm: 1.8, ownerType: 'individual', ownerName: 'Mia Chen',
    suburb: 'Box Hill', pickupWindow: 'Weekday evenings', postedAt: '2026-08-19T18:20:00',
  },
  {
    id: 'seed-8', title: 'Second monitor, 24" — some dead pixels', category: 'electronics', condition: 'Used',
    description: 'Works fine for everyday use, small dead-pixel cluster in one corner.',
    isFree: false, price: 20, distanceKm: 5.6, ownerType: 'individual', ownerName: 'Jordan Blake',
    suburb: 'Carlton', pickupWindow: 'Weekends', postedAt: '2026-08-10T10:00:00',
  },
  {
    id: 'seed-9', title: 'Terracotta planter pots (set of 6)', category: 'garden', condition: 'Used',
    description: 'Downsizing the balcony garden — pots are clean and chip-free.',
    isFree: true, price: null, distanceKm: 2.9, ownerType: 'individual', ownerName: 'Sam Osei',
    suburb: 'Brunswick', pickupWindow: 'Weekday evenings', postedAt: '2026-08-14T13:10:00',
  },
  {
    id: 'seed-10', title: 'Homeware off-cuts — ceramic seconds box', category: 'homewares', condition: 'New',
    description: 'Cosmetic seconds from our workshop, all functional. Mixed mugs and bowls.',
    isFree: false, price: 5, distanceKm: 3.1, ownerType: 'business', ownerName: "Priya Nair — Fitzroy Café & Homewares",
    suburb: 'Fitzroy', pickupWindow: 'Weekday mornings', postedAt: '2026-08-16T09:30:00',
  },
  {
    id: 'seed-11', title: 'Toddler toy bin, assorted', category: 'toys-baby', condition: 'Used',
    description: 'Blocks, puzzles and a few soft toys. All washed and complete.',
    isFree: true, price: null, distanceKm: 1.2, ownerType: 'individual', ownerName: 'Mia Chen',
    suburb: 'Box Hill', pickupWindow: 'Weekday evenings', postedAt: '2026-08-21T19:45:00',
  },
  {
    id: 'seed-12', title: 'Cardboard shipping boxes, flattened (30)', category: 'packaging', condition: 'Used',
    description: 'Clean flattened boxes, mixed sizes — great for a move or storage.',
    isFree: true, price: null, distanceKm: 4.0, ownerType: 'individual', ownerName: 'Sam Osei',
    suburb: 'Brunswick', pickupWindow: 'Weekends', postedAt: '2026-08-09T12:00:00',
  },
]
