import { ELEMENT_KEYS, type Element, type ElementKey, type Item } from "../types";

/** 아직 분석하지 않은 항목의 6요소: 모두 '문서에없음'. */
export function emptyElements(): Record<ElementKey, Element> {
  return Object.fromEntries(ELEMENT_KEYS.map((key) => [key, { state: "문서에없음" }])) as Record<ElementKey, Element>;
}

const EMPTY_SCORE = ELEMENT_KEYS.length;

function parseKeywords(text: string): string[] {
  const parts = text
    .split(/[,，\n]/)
    .map((k) => k.trim())
    .filter(Boolean);
  return [...new Set(parts)];
}

function uniqueId(items: Item[]): string {
  let n = items.length + 1;
  while (items.some((i) => i.id === `item_custom_${n}`)) n++;
  return `item_custom_${n}`;
}

/** 항목을 직접 추가한다. 이름이 비었거나 이미 있으면 그대로 둔다. 키워드가 없으면 이름이 키워드가 된다. */
export function addItem(items: Item[], title: string, keywordsText: string): Item[] {
  const name = title.trim();
  if (!name) return items;
  if (items.some((i) => i.title.trim().toLowerCase() === name.toLowerCase())) return items;

  const keywords = parseKeywords(keywordsText);
  const added: Item = {
    id: uniqueId(items),
    title: name,
    keywords: keywords.length > 0 ? keywords : [name],
    facts: [],
    elements: emptyElements(),
    score: EMPTY_SCORE,
  };
  return [...items, added];
}

export function removeItem(items: Item[], id: string): Item[] {
  return items.filter((i) => i.id !== id);
}

/** 고른 항목들을 첫 번째 항목에 합친다. 합친 항목은 다시 분석해야 하므로 6요소를 비운다. */
export function mergeItems(items: Item[], ids: string[]): Item[] {
  const found = [...new Set(ids)].filter((id) => items.some((i) => i.id === id));
  if (found.length < 2) return items;

  const [targetId, ...otherIds] = found;
  const target = items.find((i) => i.id === targetId)!;
  const others = otherIds.map((id) => items.find((i) => i.id === id)!);

  const merged: Item = {
    ...target,
    keywords: [...new Set([...target.keywords, ...others.flatMap((i) => i.keywords)])],
    facts: [...target.facts, ...others.flatMap((i) => i.facts)],
    elements: emptyElements(),
    score: EMPTY_SCORE,
  };

  return items.filter((i) => !otherIds.includes(i.id)).map((i) => (i.id === targetId ? merged : i));
}
