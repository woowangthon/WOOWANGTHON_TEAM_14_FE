import type { Annotation } from "../types";

/** 화면 2에서 전임이 결정한 주석 하나와, 문서에 보여줄 항목 이름. */
export interface Note {
  annotation: Annotation;
  item_title: string;
}

export const isConfirmed = (a: Annotation) => a.status === "approved" || a.status === "edited";

/** 확정(맞음·수정)된 노트만 항목별로 묶는다. 삭제했거나 확정 전인 초안은 문서와 후임에게 보이지 않는다. */
export function groupByItem(notes: Note[]): { item_title: string; annotations: Annotation[] }[] {
  const groups = new Map<string, { item_title: string; annotations: Annotation[] }>();
  for (const { annotation, item_title } of notes) {
    if (!isConfirmed(annotation)) continue;
    const group = groups.get(annotation.item_id) ?? { item_title, annotations: [] };
    group.annotations.push(annotation);
    groups.set(annotation.item_id, group);
  }
  return [...groups.values()];
}
