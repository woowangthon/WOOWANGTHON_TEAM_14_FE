import { ELEMENT_KEYS, type Element, type ElementKey, type Item } from "../types";

export type CellVariant = "ok" | "weak" | "missing" | "vague" | "closed";
export type Mode = "전임" | "후임";

/** 칸 색을 정한다. 근거가 확인되지 않은 '있음'은 확인된 것으로 보지 않는다. */
export function cellVariant(element: Element): CellVariant {
  switch (element.state) {
    case "있음":
      return element.fill === "확인됨" ? "ok" : "weak";
    case "문서에없음":
      return "missing";
    case "모호함":
      return "vague";
    case "해당없음":
      return "closed";
  }
}

/** 빈 곳 점수 = 문서에없음 + 모호함 + 추가확인권장 (각 1점). 백엔드 계약과 같은 규칙이다. */
export function computeScore(elements: Record<ElementKey, Element>): number {
  return ELEMENT_KEYS.filter((key) => {
    const e = elements[key];
    return e.state === "문서에없음" || e.state === "모호함" || (e.state === "있음" && e.fill === "추가확인권장");
  }).length;
}

/** 점수가 높은 순으로 n개. 점수가 같으면 원래 순서를 지킨다. 원본은 바꾸지 않는다. */
export function topItems(items: Item[], n = 5): Item[] {
  return [...items].sort((a, b) => b.score - a.score).slice(0, n);
}

/** '해당 없음'으로 닫는 일은 사람(전임)만 할 수 있다. */
export function canCloseElement(mode: Mode, element: Element): boolean {
  return mode === "전임" && element.state !== "해당없음";
}

/** 칸을 '해당 없음'으로 닫은 새 항목 목록을 돌려준다. 이미 닫힌 칸이면 그대로 둔다. */
export function closeElement(items: Item[], itemId: string, key: ElementKey, by: Mode): Item[] {
  return items.map((item) => {
    if (item.id !== itemId || item.elements[key].state === "해당없음") return item;
    const elements = { ...item.elements, [key]: { state: "해당없음" as const, closed_by: by } };
    return { ...item, elements, score: computeScore(elements) };
  });
}

/** 근거가 사실 id면 그 문장을, 아니면 적힌 문장 그대로를 보여준다. */
export function evidenceText(item: Item, element: Element): string {
  if (!element.evidence) return "";
  const fact = item.facts.find((f) => f.id === element.evidence);
  return fact ? fact.text : element.evidence;
}

const ELEMENT_LABELS: Record<ElementKey, string> = {
  시기: "시기·기한",
  연락경로: "연락 경로",
  판단기준: "판단 기준",
  자주틀리는점: "자주 틀리는 점",
  미리할일: "미리 할 일",
  배경: "배경",
};

export function elementLabel(key: ElementKey): string {
  return ELEMENT_LABELS[key];
}

export function stateLabel(element: Element): string {
  switch (element.state) {
    case "있음":
      if (element.fill === "확인됨") return "있음 · 확인됨";
      if (element.fill === "추가확인권장") return "있음 · 추가 확인 권장";
      return "있음";
    case "문서에없음":
      return "문서에 없음";
    case "모호함":
      return "모호함";
    case "해당없음":
      return element.closed_by ? `해당 없음 (${element.closed_by}이 닫음)` : "해당 없음";
  }
}

/** 표 위에 보여줄 요약: 전체 칸 수, 종류별 칸 수, 먼저 물어볼 업무(빈 곳이 가장 많은 항목). */
export function summarize(items: Item[]) {
  const counts: Record<CellVariant, number> = { ok: 0, weak: 0, missing: 0, vague: 0, closed: 0 };
  for (const item of items) for (const key of ELEMENT_KEYS) counts[cellVariant(item.elements[key])] += 1;
  return { total: items.length * ELEMENT_KEYS.length, counts, first: topItems(items, 1)[0] as Item | undefined };
}
