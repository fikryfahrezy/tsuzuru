import { clauseScopeMarkers } from "./scope";

interface LessonPolicy {
  retainNestedDerivation?: boolean;
  explainPredicateInflection?: boolean;
  clauseContentAfter?: readonly string[];
  // The words after the first one are grammatical here, so their dictionary
  // senses mislead (いる "to exist" in 〜ている, 方 "person" in 〜ほうがいい).
  explainInnerWords?: boolean;
}

const grammaticalizedLessons = [
  "te-iru",
  "te-shimau-chau",
  "te-kuru",
  "te-iku",
  "kamo-shirenai",
  "hou-ga-ii",
  "you-to-suru",
  "to-shite",
  "na-na-adjective",
  "you-na-you-ni-like",
  "na-prohibition",
  "sou-da-appearance",
  "kana-kashira",
  "noni-although",
  "ni-yotte-ni-yoru",
  "ni-taishite",
  "ni-kanshite-ni-kansuru",
  "koto-ga-dekiru",
  "ta-koto-ga-aru",
  "te-oku",
  "te-miru",
  "te-ageru",
  "te-kureru",
  "te-morau",
  "te-kudasai",
  "nasai",
  "kakeru",
  "wake-ni-wa-ikanai",
  "wake-ga-nai",
  "nai-koto-wa-nai",
  "ki-ga-suru",
  "ni-kimatte-iru",
  "furi-o-suru",
  "mo-ba-mo",
  "nuku",
  "te-wa-irarenai",
  "te-naranai",
  "te-kara-de-nai-to",
  "you-de-wa-nai-ka",
  "ka-to-omottara-ka-to-omou-to",
  "dokoro-de-wa-nai",
  "to-iu-mono-de-wa-nai",
  "dake-no-koto-wa-aru",
  "ni-koshita-koto-wa-nai",
  "ni-hoka-naranai",
  "ni-atatte",
  "ni-kagitte",
  "o-chuushin-ni",
  "o-hajime",
  "o-megutte",
  "to-ieba-to-iu-to",
  "ka-to-iu-to",
  "kara-suru-to-kara-sureba",
  "kara-iu-to-kara-itte",
  "ni-sureba-ni-shitara",
  "hoka-nai",
  "te-yamanai",
  "te-kara-to-iu-mono",
  "te-habakaranai",
  "o-yogi-naku-sareru",
  "o-kinjienai",
  "o-motte",
  "o-oite",
  "o-mono-tomo-sezu",
  "zu-ni-wa-okanai-nai-de-wa-okanai",
  "zu-ni-wa-sumanai-nai-de-wa-sumanai",
  "to-ittara-nai",
  "to-iedomo",
  "to-wa-ie",
  "ka-to-omoikiya",
  "nara-iza-shirazu-wa-iza-shirazu",
  "ni-wa-ataranai",
  "ni-iwasereba",
  "mo-saru-koto-nagara",
  "ba-sore-made-da",
  "nai-to-mo-kagiranai",
  "to-mieru-to-miete",
];

// These are separate capabilities: retaining a derivation inside a construction
// does not grant its component inflections permission to bypass that construction.
export const lessonPolicies: Record<string, LessonPolicy> = {
  ...Object.fromEntries(
    Object.entries(clauseScopeMarkers).map(([id, markers]) => [
      id,
      { clauseContentAfter: markers },
    ]),
  ),
  au: { retainNestedDerivation: true },
  naosu: { retainNestedDerivation: true },
  "eru-rareru-potential": {
    retainNestedDerivation: true,
    explainPredicateInflection: true,
  },
  "reru-rareru-passive": { explainPredicateInflection: true },
  sonkeigo: { explainPredicateInflection: true },
  "reru-rareru-honorific": { explainPredicateInflection: true },
  kenjougo: { explainPredicateInflection: true },
};
for (const id of grammaticalizedLessons)
  lessonPolicies[id] = { ...lessonPolicies[id], explainInnerWords: true };
