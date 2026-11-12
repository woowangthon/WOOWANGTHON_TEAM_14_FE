import { describe, expect, it } from "vitest";
import type { Annotation } from "../types";
import { decide, tally } from "./interview";

const draft: Annotation = {
  id: "ann_x",
  item_id: "item_01",
  element: "연락경로",
  text: "단톡 공지 후 개별 연락",
  slots: { 절차: "단톡 공지 후 개별 연락" },
  source: { type: "전임답변", ids: ["answer#1"] },
  label: "전임경험",
  status: "draft",
};

describe("decide: 전임이 초안에 내리는 결정", () => {
  it("맞음이면 내용은 그대로 두고 approved가 된다", () => {
    const result = decide(draft, "맞음");

    expect(result.status).toBe("approved");
    expect(result.text).toBe(draft.text);
  });

  it("수정이면 고친 내용이 들어가고 edited가 된다", () => {
    const result = decide(draft, "수정", "  단톡 공지 후 총무가 개별 연락  ");

    expect(result.status).toBe("edited");
    expect(result.text).toBe("단톡 공지 후 총무가 개별 연락");
  });

  it("수정인데 내용이 비어 있으면 오류다", () => {
    expect(() => decide(draft, "수정", "   ")).toThrow("수정할 내용을 적어 주세요");
    expect(() => decide(draft, "수정")).toThrow("수정할 내용을 적어 주세요");
  });

  it("삭제면 rejected가 된다", () => {
    expect(decide(draft, "삭제").status).toBe("rejected");
  });

  it("원본 초안을 바꾸지 않는다", () => {
    decide(draft, "수정", "다른 내용");

    expect(draft.status).toBe("draft");
    expect(draft.text).toBe("단톡 공지 후 개별 연락");
  });
});

describe("tally: 결정 결과 세기", () => {
  it("맞음·수정은 확정, 삭제는 삭제, 건너뛴 질문은 따로 센다", () => {
    const list = [
      decide(draft, "맞음"),
      decide(draft, "수정", "고침"),
      decide(draft, "삭제"),
    ];

    expect(tally(list, 5)).toEqual({ confirmed: 2, rejected: 1, skipped: 2 });
  });

  it("결정이 없으면 전부 건너뛴 것이다", () => {
    expect(tally([], 3)).toEqual({ confirmed: 0, rejected: 0, skipped: 3 });
  });
});
