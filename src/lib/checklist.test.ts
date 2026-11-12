import { describe, expect, it } from "vitest";
import mockJson from "../mock/mock.json";
import type { Element, Item, MockData } from "../types";
import {
  canCloseElement,
  cellVariant,
  closeElement,
  computeScore,
  elementLabel,
  evidenceText,
  stateLabel,
  summarize,
  topItems,
} from "./checklist";

const mock = mockJson as unknown as MockData;
const byTitle = (title: string): Item => mock.items.find((i) => i.title === title)!;

describe("cellVariant: 칸 색 구분", () => {
  it("근거가 확인된 '있음'은 ok", () => {
    expect(cellVariant({ state: "있음", fill: "확인됨" })).toBe("ok");
  });

  it("'있음'이어도 추가 확인 권장이면 weak", () => {
    expect(cellVariant({ state: "있음", fill: "추가확인권장" })).toBe("weak");
  });

  it("충족도가 없는 '있음'은 확인된 것으로 보지 않고 weak", () => {
    expect(cellVariant({ state: "있음" })).toBe("weak");
  });

  it("문서에없음은 missing, 모호함은 vague, 해당없음은 closed", () => {
    expect(cellVariant({ state: "문서에없음" })).toBe("missing");
    expect(cellVariant({ state: "모호함" })).toBe("vague");
    expect(cellVariant({ state: "해당없음", closed_by: "전임" })).toBe("closed");
  });
});

describe("computeScore: 빈 곳 점수", () => {
  it("목 데이터의 모든 항목 점수와 같다", () => {
    for (const item of mock.items) {
      expect(computeScore(item.elements)).toBe(item.score);
    }
  });
});

describe("topItems: 상위 항목", () => {
  it("점수가 높은 순으로 n개만 고른다", () => {
    const titles = topItems(mock.items, 3).map((i) => i.title);

    expect(titles[0]).toBe("신입 모집"); // 6점
    expect(titles).toHaveLength(3);
  });

  it("점수가 같으면 원래 순서를 지킨다", () => {
    // 회비 정산(4), 대회 참가(4), 행사(MT)(4) 는 원래 순서대로
    const tied = topItems(mock.items, 5)
      .filter((i) => i.score === 4)
      .map((i) => i.title);

    expect(tied).toEqual(["회비 정산", "대회 참가", "행사(MT)"]);
  });

  it("원본 배열을 바꾸지 않는다", () => {
    const before = mock.items.map((i) => i.id);
    topItems(mock.items, 5);
    expect(mock.items.map((i) => i.id)).toEqual(before);
  });
});

describe("canCloseElement: 해당 없음은 사람(전임)만 닫는다", () => {
  const open: Element = { state: "문서에없음" };

  it("전임 모드에서는 열린 칸을 닫을 수 있다", () => {
    expect(canCloseElement("전임", open)).toBe(true);
  });

  it("후임 모드에서는 닫을 수 없다", () => {
    expect(canCloseElement("후임", open)).toBe(false);
  });

  it("이미 닫힌 칸은 다시 닫을 수 없다", () => {
    expect(canCloseElement("전임", { state: "해당없음", closed_by: "전임" })).toBe(false);
  });
});

describe("closeElement: 칸을 해당 없음으로 닫기", () => {
  it("닫으면 해당없음이 되고 닫은 사람이 기록되며 점수가 1 줄어든다", () => {
    const item = byTitle("회비 정산"); // 4점, 연락경로는 문서에없음

    const [closed] = closeElement([item], item.id, "연락경로", "전임");

    expect(closed.elements["연락경로"]).toEqual({ state: "해당없음", closed_by: "전임" });
    expect(closed.score).toBe(3);
  });

  it("원본 항목을 바꾸지 않는다", () => {
    const item = byTitle("회비 정산");
    closeElement([item], item.id, "연락경로", "전임");

    expect(item.elements["연락경로"].state).toBe("문서에없음");
    expect(item.score).toBe(4);
  });

  it("이미 해당없음인 칸을 다시 닫아도 점수는 그대로다", () => {
    const item = byTitle("회비 정산"); // 배경은 이미 해당없음

    const [again] = closeElement([item], item.id, "배경", "전임");

    expect(again.score).toBe(item.score);
  });
});

describe("evidenceText: 근거 문장", () => {
  it("fact id이면 그 사실의 문장을 보여준다", () => {
    const item = byTitle("회비 정산");

    expect(evidenceText(item, item.elements["시기"])).toBe("회비는 매월 말 정산한다");
  });

  it("fact id가 아니면 적힌 문장 그대로 보여준다", () => {
    const item = byTitle("회비 정산");

    expect(evidenceText(item, item.elements["자주틀리는점"])).toBe("미납 반복");
  });

  it("근거가 없으면 빈 문자열이다", () => {
    const item = byTitle("회비 정산");

    expect(evidenceText(item, item.elements["연락경로"])).toBe("");
  });
});

describe("표시용 글자", () => {
  it("요소 이름을 사람이 읽는 말로 바꾼다", () => {
    expect(elementLabel("시기")).toBe("시기·기한");
    expect(elementLabel("자주틀리는점")).toBe("자주 틀리는 점");
  });

  it("상태 글자에 충족도와 닫은 사람이 드러난다", () => {
    expect(stateLabel({ state: "있음", fill: "확인됨" })).toBe("있음 · 확인됨");
    expect(stateLabel({ state: "있음", fill: "추가확인권장" })).toBe("있음 · 추가 확인 권장");
    expect(stateLabel({ state: "문서에없음" })).toBe("문서에 없음");
    expect(stateLabel({ state: "해당없음", closed_by: "전임" })).toBe("해당 없음 (전임이 닫음)");
  });
});

describe("summarize: 표 위에 보여줄 한 줄 요약", () => {
  const data = mockJson as unknown as MockData;

  it("전체 칸 수와 종류별 칸 수를 센다", () => {
    const s = summarize(data.items);
    const total = data.items.length * 6;

    expect(s.total).toBe(total);
    expect(s.counts.ok + s.counts.weak + s.counts.missing + s.counts.vague + s.counts.closed).toBe(total);
  });

  it("먼저 물어볼 업무는 빈 곳이 가장 많은 항목이다", () => {
    expect(summarize(data.items).first?.id).toBe(topItems(data.items, 1)[0].id);
  });

  it("항목이 없으면 먼저 물어볼 업무도 없다", () => {
    expect(summarize([])).toMatchObject({ total: 0, first: undefined });
  });
});
