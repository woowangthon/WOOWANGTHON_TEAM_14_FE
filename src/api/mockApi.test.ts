import { describe, expect, it } from "vitest";
import mockJson from "../mock/mock.json";
import { addItem } from "../lib/items";
import type { MockData } from "../types";
import { createMockApi } from "./mockApi";

const mock = mockJson as unknown as MockData;
const pdf = new File(["x"], "회칙.pdf", { type: "application/pdf" });
const txt = new File(["x"], "공지.txt", { type: "text/plain" });
const docx = new File(["x"], "회칙.docx");
const chat = new File(["x"], "chat.txt", { type: "text/plain" });

const api = createMockApi({ delayMs: 0 });

describe("mockApi.uploadDocs (API 2 흉내)", () => {
  it("확정 자료를 올리면 항목과 키워드가 오고, 사실은 아직 비어 있다", async () => {
    const items = await api.uploadDocs([pdf, txt]);

    expect(items.map((i) => i.title)).toEqual(mock.items.map((i) => i.title));
    expect(items[0].keywords).toEqual(mock.items[0].keywords);
    expect(items.every((i) => i.facts.length === 0 && i.score === 6)).toBe(true);
  });

  it("파일이 없으면 오류다", async () => {
    await expect(api.uploadDocs([])).rejects.toThrow("확정 자료를 한 개 이상 올려 주세요");
  });

  it("PDF·TXT가 아닌 파일은 이름을 알려 주며 거부한다", async () => {
    await expect(api.uploadDocs([pdf, docx])).rejects.toThrow("지원하지 않는 파일: 회칙.docx");
  });
});

describe("mockApi.getQuestions (질문 목록 흉내)", () => {
  it("우선순위(rank) 순서로 질문이 오고, 각 질문에 항목 이름이 붙는다", async () => {
    const questions = await api.getQuestions();

    expect(questions.map((q) => q.id)).toEqual(mock.questions.map((q) => q.id));
    expect(questions[0].item_title).toBe(mock.items.find((i) => i.id === questions[0].item_id)?.title);
    expect(questions.every((q) => q.step1 && q.step2 && q.step3)).toBe(true);
  });
});

describe("mockApi.draftAnnotation (답변 → 초안 흉내)", () => {
  it("답변을 정리한 초안은 draft 상태이고, 출처는 답변 번호이며, 내용이 있는 답변만 들어간다", async () => {
    const [question] = await api.getQuestions();

    const draft = await api.draftAnnotation(question, ["총무가 단톡에 공지한다", "", "작년에 한 건 있었다"]);

    expect(draft.status).toBe("draft");
    expect(draft.item_id).toBe(question.item_id);
    expect(draft.element).toBe(question.element);
    expect(draft.label).toBe("전임경험");
    expect(draft.source).toEqual({ type: "전임답변", ids: ["answer#1", "answer#3"] });
    expect(draft.text).toContain("총무가 단톡에 공지한다");
    expect(draft.text).toContain("작년에 한 건 있었다");
  });

  it("답변이 하나도 없으면 오류다", async () => {
    const [question] = await api.getQuestions();

    await expect(api.draftAnnotation(question, ["", "  ", ""])).rejects.toThrow("답변을 한 가지 이상 적어 주세요");
  });
});

describe("mockApi.ask (후임 질문 흉내)", () => {
  const confirmed = (id: string, itemId: string, text: string, status: "approved" | "edited" | "rejected" | "draft") => ({
    id,
    item_id: itemId,
    element: "연락경로" as const,
    text,
    slots: {},
    source: { type: "전임답변" as const, ids: ["answer#3"] },
    label: "전임경험" as const,
    status,
  });

  it("질문에 항목 키워드가 있으면 그 항목의 확정된 기록을 근거와 함께 돌려준다", async () => {
    const answer = await api.ask("회비 안 낸 사람은 어떻게 해요?", [confirmed("a1", "item_01", "단톡 공지 후 개별 연락", "approved")]);

    expect(answer.none).toBe(false);
    expect(answer.hits).toHaveLength(1);
    expect(answer.hits[0]).toMatchObject({ annotation_id: "a1", text: "단톡 공지 후 개별 연락", label: "전임경험" });
    expect(answer.hits[0].source).toEqual({ type: "전임답변", ids: ["answer#3"] });
  });

  it("확정(맞음·수정)된 기록만 쓰고, 삭제했거나 확정 전인 초안은 쓰지 않는다", async () => {
    const answer = await api.ask("회비 어떻게 해요?", [
      confirmed("a1", "item_01", "삭제된 내용", "rejected"),
      confirmed("a2", "item_01", "초안 내용", "draft"),
      confirmed("a3", "item_01", "고친 내용", "edited"),
    ]);

    expect(answer.hits.map((h) => h.annotation_id)).toEqual(["a3"]);
  });

  it("기록이 없으면 지어내지 않고 none이다", async () => {
    const answer = await api.ask("회비 어떻게 해요?", []);

    expect(answer).toMatchObject({ hits: [], none: true });
  });

  it("어떤 항목의 키워드도 없는 질문은 기록이 있어도 none이다", async () => {
    const answer = await api.ask("동아리 회장 생일이 언제예요?", [confirmed("a1", "item_01", "단톡 공지", "approved")]);

    expect(answer.none).toBe(true);
  });

  it("빈 질문은 오류다", async () => {
    await expect(api.ask("   ", [])).rejects.toThrow("질문을 적어 주세요");
  });
});

describe("mockApi.uploadChat (API 4 흉내)", () => {
  it("카톡 대화를 올리면 항목마다 사실과 6요소 판정이 채워진다", async () => {
    const items = await api.uploadDocs([pdf]);

    const analyzed = await api.uploadChat(chat, items);

    expect(analyzed.map((i) => i.facts.length)).toEqual(mock.items.map((i) => i.facts.length));
    expect(analyzed.map((i) => i.score)).toEqual(mock.items.map((i) => i.score));
  });

  it("사용자가 추가한 항목은 분석 결과를 지어내지 않고 비어 있는 채로 둔다", async () => {
    const withCustom = addItem(await api.uploadDocs([pdf]), "장비 관리", "장비");

    const analyzed = await api.uploadChat(chat, withCustom);
    const custom = analyzed[analyzed.length - 1];

    expect(custom.title).toBe("장비 관리");
    expect(custom.facts).toEqual([]);
    expect(custom.score).toBe(6);
  });

  it("사용자가 뺀 항목은 결과에도 없다", async () => {
    const items = (await api.uploadDocs([pdf])).filter((i) => i.id !== "item_05");

    const analyzed = await api.uploadChat(chat, items);

    expect(analyzed.map((i) => i.id)).not.toContain("item_05");
  });

  it("TXT가 아닌 파일은 거부한다", async () => {
    const items = await api.uploadDocs([pdf]);

    await expect(api.uploadChat(new File(["x"], "대화.pdf"), items)).rejects.toThrow("지원하지 않는 파일: 대화.pdf");
  });

  it("항목이 하나도 없으면 오류다", async () => {
    await expect(api.uploadChat(chat, [])).rejects.toThrow("확인된 업무 항목이 없어요");
  });
});
