// Emoji for perfume notes and accords. Exact names first, then keyword families,
// then a sparkle so every note gets something cute.

import { fold } from './util.js';

const EXACT = {
  vanilla: '🍦', 'vanilla orchid': '🍦', 'bourbon vanilla': '🍦', 'madagascar vanilla': '🍦', vanille: '🍦',
  rose: '🌹', 'damask rose': '🌹', 'turkish rose': '🌹', 'bulgarian rose': '🌹', 'rose petals': '🌹',
  jasmine: '🌼', 'jasmine sambac': '🌼', tuberose: '🤍', gardenia: '🤍', 'orange blossom': '🌼', neroli: '🌼',
  lavender: '🪻', iris: '🪻', violet: '🪻', orris: '🪻', 'violet leaf': '🌿',
  peony: '🌸', 'cherry blossom': '🌸', magnolia: '🌸', lily: '🌷', 'lily of the valley': '🔔', tulip: '🌷',
  freesia: '💐', 'ylang-ylang': '🌼', 'ylang ylang': '🌼', heliotrope: '💜', mimosa: '🌼', lotus: '🪷', 'water lily': '🪷',
  bergamot: '🍋', lemon: '🍋', lime: '🍋', yuzu: '🍋', grapefruit: '🍊', orange: '🍊', mandarin: '🍊',
  'mandarin orange': '🍊', tangerine: '🍊', 'blood orange': '🍊', citrus: '🍋',
  strawberry: '🍓', raspberry: '🍓', cherry: '🍒', 'black cherry': '🍒', peach: '🍑', apricot: '🍑', nectarine: '🍑',
  pear: '🍐', apple: '🍏', 'green apple': '🍏', 'red apple': '🍎', plum: '🫐', blackberry: '🫐', blueberry: '🫐',
  blackcurrant: '🫐', 'black currant': '🫐', cassis: '🫐', grape: '🍇', fig: '🫐', mango: '🥭', pineapple: '🍍',
  banana: '🍌', coconut: '🥥', melon: '🍈', watermelon: '🍉', lychee: '🍒', 'passion fruit': '🥭', pomegranate: '🍎',
  kiwi: '🥝', fruity: '🍓', tropical: '🍍',
  caramel: '🍮', 'salted caramel': '🍮', toffee: '🍮', praline: '🍮', 'creme brulee': '🍮',
  chocolate: '🍫', cacao: '🍫', cocoa: '🍫', 'dark chocolate': '🍫', 'white chocolate': '🍫',
  coffee: '☕', espresso: '☕', 'coffee bean': '☕', tea: '🍵', 'green tea': '🍵', 'black tea': '🍵', matcha: '🍵', chai: '🫖',
  honey: '🍯', milk: '🥛', cream: '🥛', 'whipped cream': '🥛', lactonic: '🥛', butter: '🧈',
  marshmallow: '☁️', 'cotton candy': '🍭', sugar: '🍬', 'brown sugar': '🍬', candy: '🍬', 'sugared almond': '🍬',
  almond: '🌰', 'bitter almond': '🌰', pistachio: '🥜', hazelnut: '🌰', 'tonka bean': '🫘', tonka: '🫘', nutty: '🌰',
  bread: '🍞', bready: '🍞', biscuit: '🍪', cookie: '🍪', cake: '🍰', 'birthday cake': '🎂', gourmand: '🧁', sweet: '🍬',
  rum: '🥃', cognac: '🥃', whiskey: '🥃', whisky: '🥃', champagne: '🍾', wine: '🍷', boozy: '🥃',
  cinnamon: '🫚', ginger: '🫚', cardamom: '🫛', 'pink pepper': '🌶️', pepper: '🌶️', 'black pepper': '🌶️',
  saffron: '🧡', clove: '🌰', nutmeg: '🌰', 'warm spicy': '🌶️', spicy: '🌶️', 'fresh spicy': '🌶️',
  sandalwood: '🪵', cedar: '🪵', cedarwood: '🪵', vetiver: '🌾', oud: '🪵', agarwood: '🪵', guaiac: '🪵',
  'guaiac wood': '🪵', cashmeran: '🧣', 'cashmere wood': '🧣', woody: '🪵', woods: '🪵', birch: '🌳', pine: '🌲',
  cypress: '🌲', fir: '🌲', 'fir balsam': '🌲',
  patchouli: '🍂', tobacco: '🍂', 'tobacco leaf': '🍂', leather: '👜', suede: '👜', smoke: '💨', smoky: '💨',
  incense: '🕯️', frankincense: '🕯️', myrrh: '🕯️', benzoin: '🕯️', labdanum: '🕯️', resins: '🕯️', balsamic: '🕯️',
  amber: '🔶', ambroxan: '🔶', ambergris: '🐚', ambery: '🔶',
  musk: '🤍', 'white musk': '🤍', musks: '🤍', musky: '🤍', powdery: '🧸', powder: '🧸', aldehydes: '🫧', aldehydic: '🫧',
  soapy: '🫧', clean: '🫧', 'sea salt': '🧂', salt: '🧂', 'sea notes': '🌊', marine: '🌊', aquatic: '🌊', ozonic: '🌊',
  water: '💧', 'water notes': '💧', rain: '🌧️', 'fresh': '🌬️', mint: '🌿', basil: '🌿', sage: '🌿', 'clary sage': '🌿',
  rosemary: '🌿', thyme: '🌿', 'green notes': '🌿', green: '🌿', grass: '🌱', moss: '🌿', 'oakmoss': '🌿', herbal: '🌿',
  aromatic: '🌿', earthy: '🍄', mushroom: '🍄', floral: '🌸', 'white floral': '🤍', 'yellow floral': '🌼',
  animalic: '🐾', metallic: '🔩',
  litchi: '🍒', osmanthus: '🌼', licorice: '🍬', frangipani: '🌺', geranium: '🌺', guava: '🍈', popcorn: '🍿',
  'solar notes': '☀️', papaya: '🥭', marigold: '🌼', olibanum: '🕯️', coumarin: '🫘', coriander: '🌿', hibiscus: '🌺',
  anise: '⭐', 'star anise': '⭐', carnation: '🌺', custard: '🍮', vanila: '🍦', croissant: '🥐', cyclamen: '🌸',
  narcissus: '🌼', styrax: '🕯️', cassia: '🫚', marshamallow: '☁️', hedione: '🌼', mahogany: '🪵', quince: '🍐',
  davana: '🌿', bellini: '🥂', rhubarb: '🌱', rhuburb: '🌱', ambrettolide: '🤍', cappuccino: '☕', immortelle: '🌼',
  dates: '🌴', amaretto: '🥃', rice: '🍚', hyacinth: '🪻', hiacynth: '🪻', caraway: '🌿', papyrus: '🌾', absinthe: '🍸',
  hawthorn: '🌸', 'palo santo': '🪵', 'carrot seeds': '🥕', carrot: '🥕', 'coca-cola': '🥤', macarons: '🍪',
  juniper: '🫐', kumquat: '🍊', ivy: '🌿', 'dew drop': '💧', cucumber: '🥒', chamomile: '🌼', ice: '🧊',
  macadamia: '🌰', lilac: '🪻', pomelo: '🍊', laurels: '🌿', oak: '🌳', pumpkin: '🎃', 'cade oil': '💨',
  sorbet: '🍧', pitahaya: '🐉', opoponax: '🕯️', artemisia: '🌿', jelly: '🍬', sesame: '🌰', pimento: '🌶️',
  bamboo: '🎋', yeast: '🍞', baobab: '🌳', verbena: '🌿', mate: '🧉', martini: '🍸', civet: '🐾',
  'monoi oil': '🌺', 'ebony tree': '🪵', buckwheat: '🌾', 'dulce de leche': '🍮', loukhoum: '🍬', panacotta: '🍮', soft: '☁️', warm: '🔥', cozy: '🧣',
};

// Keyword families for everything else (checked in order).
const FAMILIES = [
  [/vanill/, '🍦'], [/rose/, '🌹'], [/jasmin/, '🌼'], [/berr|currant|cassis/, '🫐'], [/cherr/, '🍒'],
  [/lemon|lime|yuzu|bergamot|citr/, '🍋'], [/orange|mandarin|tangerine|grapefruit|clementine/, '🍊'],
  [/apple/, '🍏'], [/pear/, '🍐'], [/peach|apricot/, '🍑'], [/coconut/, '🥥'], [/caramel|toffee|praline/, '🍮'],
  [/chocolat|cacao|cocoa/, '🍫'], [/coffee|espresso|latte/, '☕'], [/tea\b|matcha/, '🍵'], [/honey/, '🍯'],
  [/milk|cream|lacto/, '🥛'], [/sugar|candy|sweet|syrup|meringue/, '🍬'], [/cake|cookie|biscuit|pastr|bread|dough/, '🍰'],
  [/almond|nut|pistach|hazel|tonka/, '🌰'], [/rum|cognac|whisk|wine|liqu|champagne|booz/, '🥃'],
  [/pepper|spic|cinnamon|ginger|cardamom|clove|nutmeg|saffron/, '🌶️'],
  [/wood|cedar|sandal|oud|vetiver|birch|pine|fir|cypress/, '🪵'], [/leather|suede/, '👜'], [/tobacco|patchouli/, '🍂'],
  [/incense|myrrh|resin|benzoin|labdanum|balsam/, '🕯️'], [/amber/, '🔶'], [/musk/, '🤍'], [/powder|iris|orris/, '🧸'],
  [/ambr|cypriol|nagarmotha/, '🔶'], [/accord$/, '✨'],   [/sea|marine|aqua|ozon|water|rain/, '🌊'], [/mint|basil|sage|herb|green|leaf|leaves|grass|moss|tomato|fig leaf/, '🌿'],
  [/lily|tulip|lotus/, '🌷'], [/violet|lavender/, '🪻'], [/flower|blossom|petal|floral|peony|magnolia|orchid|bloom/, '🌸'],
  [/fruit|melon|mango|pineapple|lychee|plum|grape/, '🍓'], [/smoke|smoky|ash|burn/, '💨'], [/salt/, '🧂'],
];

export function noteEmoji(note) {
  const k = fold(note).trim();
  if (EXACT[k]) return EXACT[k];
  for (const [re, emoji] of FAMILIES) if (re.test(k)) return emoji;
  return '✨';
}

/** Canonical key for matching notes across perfumes ("Vanilla " == "vanilla"). */
export function noteKey(note) {
  return fold(note).trim().replace(/\s+/g, ' ');
}
