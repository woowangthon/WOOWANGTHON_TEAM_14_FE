import { describe, expect, it } from "vitest";
import type { Annotation } from "../types";
import { groupByItem, type Note } from "./handbook";

function note(id: string, itemId: string, itemTitle: string, status: Annotation["status"], element: Annotation["element"] = "연락경로"): Note {
  return {
    item_title: itemTitle,
    annotation: {
      id,
      item_id: itemId,
      element,
      text: `내용 ${id}`,
      slots: {},
      source: { type: "전임답변", ids: ["answer#1"] },
      label: "전임경험",
      status,
    },
  };
}

describe("groupByItem: 확정된 노트만 항목별로 묶는다", () => {
  it("같은 항목의 노트는 한 묶음이고, 항목은 처음 나온 순서를 지킨다", () => {
    const groups = groupByItem([
      note("a1", "item_02", "코트 대관", "approved"),
      note("a2", "item_01", "회비 정산", "edited"),
      note("a3", "item_02", "코트 대관", "approved", "판단기준"),
    ]);

    expect(groups.map((g) => g.item_title)).toEqual(["코트 대관", "회비 정산"]);
    expect(groups[0].annotations.map((a) => a.id)).toEqual(["a1", "a3"]);
  });

  it("삭제했거나 아직 확정 전인 노트는 문서에 들어가지 않는다", () => {
    const groups = groupByItem([
      note("a1", "item_01", "회비 정산", "rejected"),
      note("a2", "item_01", "회비 정산", "draft"),
      note("a3", "item_02", "코트 대관", "approved"),
    ]);

    expect(groups.map((g) => g.item_title)).toEqual(["코트 대관"]);
  });

  it("노트가 없으면 빈 목록이다", () => {
    expect(groupByItem([])).toEqual([]);
  });
});
