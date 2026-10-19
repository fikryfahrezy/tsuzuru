import n5 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar/n5.json";
import n4 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar/n4.json";
import n3 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar/n3.json";
import n2 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar/n2.json";
import n1 from "../../data/sources/openjlpt/0d1d3410bec90bd4098a7c72de820543cb4f707c/data/json/grammar/n1.json";
import supplements from "../../data/grammar-supplements.json";

import type { GrammarEntry } from "../../shared/grammar";

export const grammarEntries = [
  ...n5,
  ...n4,
  ...n3,
  ...n2,
  ...n1,
  ...supplements,
] as GrammarEntry[];
export const grammarById = new Map(
  grammarEntries.map((entry) => [entry.id, entry]),
);
