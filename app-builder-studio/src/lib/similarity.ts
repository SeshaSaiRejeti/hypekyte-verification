// Text similarity used by the mock name/address match. Normalises harmless
// formatting differences first, then compares token sets (Dice coefficient).
// Replace with the Python backend's matcher later.

const STATES = [
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat", "haryana",
  "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur",
  "meghalaya", "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana",
  "tripura", "uttar pradesh", "uttarakhand", "west bengal", "delhi", "new delhi", "jammu and kashmir",
  "ladakh", "puducherry", "chandigarh", "india",
];

const ADDRESS_ABBR: Record<string, string> = {
  rd: "road", st: "street", ave: "avenue", ln: "lane", nr: "near", opp: "opposite", bldg: "building",
  apt: "apartment", flr: "floor", fl: "floor", blk: "block", sec: "sector", ft: "feet", "100ft": "100 feet",
  no: "number", mkt: "market", chk: "chowk", w: "west", e: "east", n: "north", s: "south",
};

const NAME_ABBR: Record<string, string> = {
  pvt: "private", ltd: "limited", co: "company", corp: "corporation", "&": "and", llp: "llp", inc: "incorporated",
};

function tokens(text: string, abbr: Record<string, string>): string[] {
  return text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(\d{3})\s+(\d{3})\b/g, "$1$2") // "400 050" -> "400050"
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((t) => (abbr[t] ?? t).split(" "));
}

function dice(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size && !B.size) return 100;
  let common = 0;
  A.forEach((t) => B.has(t) && common++);
  return Math.round(((2 * common) / (A.size + B.size)) * 100);
}

export function normalizeAddress(address: string): string[] {
  let s = ` ${address.toLowerCase()} `;
  for (const st of STATES) s = s.replace(new RegExp(`[\\s,]${st}(?=[\\s,\\d])`, "g"), " ");
  return tokens(s, ADDRESS_ABBR);
}

export function addressSimilarity(a: string, b: string): number {
  return dice(normalizeAddress(a), normalizeAddress(b));
}

export function nameSimilarity(a: string, b: string): number {
  return dice(tokens(a, NAME_ABBR), tokens(b, NAME_ABBR));
}
