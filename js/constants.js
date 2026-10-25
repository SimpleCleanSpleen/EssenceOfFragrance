// Shared vocabulary for the journal.

export const STATUSES = [
  { id: 'have', tab: 'In My Collection', short: 'Collection', badge: 'Owned', icon: '💖', move: 'Move to Collection' },
  { id: 'had', tab: 'Used to Own', short: 'Had', badge: 'Had', icon: '🌙', move: 'Mark as Had' },
  { id: 'want', tab: 'Wishlist', short: 'Wishlist', badge: 'Wishlist', icon: '🌟', move: 'Add to Wishlist' },
  { id: 'testing', tab: 'To Test', short: 'To Test', badge: 'To Test', icon: '🧪', move: 'Move to To Test' },
];

export const STATUS_BY_ID = Object.fromEntries(STATUSES.map((s) => [s.id, s]));

export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
export const OCCASIONS = ['Daytime', 'Night out', 'Office', 'Date night', 'Cozy at home', 'Special occasion', 'Vacation'];
export const LONGEVITY = ['Very weak', 'Weak', 'Moderate', 'Long lasting', 'Eternal'];
export const SILLAGE = ['Intimate', 'Moderate', 'Strong', 'Enormous'];

export const SORTS = [
  { id: 'name', label: 'A–Z' },
  { id: 'brand', label: 'Brand' },
  { id: 'rating', label: 'Rating' },
  { id: 'recent', label: 'Recently added' },
];

export const PAGE_SIZE = 36;

// Every field a perfume document can have, with its empty value.
export const EMPTY_PERFUME = {
  fragranticaId: '',
  brand: '',
  name: '',
  originalName: '',
  originalBrand: '',
  status: 'have',
  fragranticaUrl: '',
  imageUrl: '',
  photo: null,
  rating: 0,
  topNotes: [],
  heartNotes: [],
  baseNotes: [],
  notes: [], // notes without a top/heart/base pyramid
  accords: [],
  season: [],
  occasion: [],
  longevity: '',
  sillage: '',
  review: '',
  memories: '',
  whereBought: '',
  sourceList: '',
  createdAt: null,
  updatedAt: null,
};
