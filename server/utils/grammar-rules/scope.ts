export const scopeAdverbs = [
  ["amari-nai", ["あまり", "余り"]],
  ["zenzen-nai", ["全然", "ぜんぜん"]],
  ["nakanaka-nai", ["なかなか", "中々"]],
] as const;

export const negativeQuantifiers = [
  "何も",
  "誰も",
  "だれも",
  "なにも",
] as const;

// 少しも / ちっとも + negative is "not at all", not "a little, also".
export const negativeEmphasis = ["少しも", "ちっとも"] as const;

// A scope relates its opening marker to a later predicate. Words after that
// marker keep their own grammar; the marker itself is explained by the scope.
export const clauseScopeMarkers: Record<string, readonly string[]> = {
  ...Object.fromEntries(scopeAdverbs.map(([id, markers]) => [id, markers])),
  "nani-mo-nai-dare-mo-nai": negativeQuantifiers,
  "sukoshi-mo-nai": negativeEmphasis,
  "shika-nai": ["しか"],
  "mada-te-inai": ["まだ"],
};
