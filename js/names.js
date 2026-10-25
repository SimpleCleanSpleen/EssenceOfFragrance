// Fragrantica names were rebuilt from URL slugs, so apostrophes went missing.
// These rules fix the obvious cases only; anything odd stays as-is and is editable.

const RULES = [
  // "Angel s Bread" -> "Angel's Bread", "It s You" -> "It's You"
  [/\b(\w+) s\b(?!['’])/g, "$1's"],
  // "Can t" / "Don t" -> "Can't" / "Don't"
  [/\b(\w+n) t\b/g, "$1't"],
  // Elided French/Italian articles before a vowel or h: "L eau", "d Elmar", "J adore", "Reve D Ylang"
  [/\b([LlDdJj]) (?=[AEIOUYHaeiouyhÀ-ÿ])/g, "$1'"],
  // "D G Anthology" -> "D&G Anthology"
  [/\bD G\b/g, 'D&G'],
];

export function tidyName(name) {
  let out = String(name || '').trim();
  for (const [re, rep] of RULES) out = out.replace(re, rep);
  return out;
}
