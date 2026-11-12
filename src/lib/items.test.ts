import { describe, expect, it } from "vitest";
import mockJson from "../mock/mock.json";
import { ELEMENT_KEYS, type MockData } from "../types";
import { addItem, emptyElements, mergeItems, removeItem } from "./items";

const mock = mockJson as unknown as MockData;

describe("emptyElements", () => {
  it("6요소가 모두 '문서에없음'이다", () => {
    const elements = emptyElements();

    expect(Object.keys(elements)).toEqual([...ELEMENT_KEYS]);
    expect(Object.values(elements).every((e) => e.state === "문서에없음")).toBe(true);
  });
});

describe("addItem: 항목 추가", () => {
  it("이름의 앞뒤 공백을 지우고 키워드를 쉼표로 나눠 새 항목을 만든다", () => {
    const result = addItem(mock.items, "  장비 관리 ", "장비, 대여,  장비 ,보관");
    const added = result[result.length - 1];

    expect(result).toHaveLength(mock.items.length + 1);
    expect(added.title).toBe("장비 관리");
    expect(added.keywords).toEqual(["장비", "대여", "보관"]);
    expect(added.facts).toEqual([]);
    expect(added.score).toBe(6);
    expect(mock.items.map((i) => i.id)).not.toContain(added.id);
  });

  it("키워드를 안 적으면 항목 이름이 키워드가 된다", () => {
    const result = addItem(mock.items, "장비 관리", "");

    expect(result[result.length - 1].keywords).toEqual(["장비 관리"]);
  });

  it("이름이 비어 있으면 아무것도 추가하지 않는다", () => {
    expect(addItem(mock.items, "   ", "장비")).toEqual(mock.items);
  });

  it("이미 있는 이름은 추가하지 않는다", () => {
    expect(addItem(mock.items, "회비 정산", "회비")).toEqual(mock.items);
  });

  it("원본 목록을 바꾸지 않는다", () => {
    const before = mock.items.length;
    addItem(mock.items, "장비 관리", "장비");

    expect(mock.items).toHaveLength(before);
  });
});

describe("removeItem: 항목 빼기", () => {
  it("그 항목만 빠진다", () => {
    const result = removeItem(mock.items, "item_03");

    expect(result.map((i) => i.id)).toEqual(["item_01", "item_02", "item_04", "item_05"]);
  });

  it("없는 id면 그대로다", () => {
    expect(removeItem(mock.items, "item_99")).toEqual(mock.items);
  });
});

describe("mergeItems: 항목 합치기", () => {
  it("첫 번째로 고른 항목에 나머지가 합쳐지고, 키워드는 중복 없이 모이며, 사실은 이어 붙는다", () => {
    const result = mergeItems(mock.items, ["item_01", "item_02"]);
    const merged = result[0];

    expect(result).toHaveLength(mock.items.length - 1);
    expect(merged.id).toBe("item_01");
    expect(merged.title).toBe("회비 정산");
    expect(merged.keywords).toEqual(["회비", "미납", "정산", "입금", "코트", "대관", "예약", "체육시설과"]);
    expect(merged.facts).toHaveLength(6);
    expect(result.map((i) => i.id)).not.toContain("item_02");
  });

  it("합친 항목은 다시 분석해야 하므로 6요소가 모두 비어 있다", () => {
    const merged = mergeItems(mock.items, ["item_01", "item_02"])[0];

    expect(Object.values(merged.elements).every((e) => e.state === "문서에없음")).toBe(true);
    expect(merged.score).toBe(6);
  });

  it("고른 순서의 첫 항목이 남고, 그 항목의 원래 자리를 지킨다", () => {
    const result = mergeItems(mock.items, ["item_02", "item_01"]);

    expect(result[0].id).toBe("item_02");
    expect(result.map((i) => i.id)).toEqual(["item_02", "item_03", "item_04", "item_05"]);
  });

  it("두 개 미만이거나 없는 id뿐이면 그대로다", () => {
    expect(mergeItems(mock.items, ["item_01"])).toEqual(mock.items);
    expect(mergeItems(mock.items, ["item_01", "item_99"])).toEqual(mock.items);
  });
});
