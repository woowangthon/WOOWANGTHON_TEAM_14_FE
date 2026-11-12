import { isConfirmed } from "../lib/handbook";
import { emptyElements } from "../lib/items";
import mockJson from "../mock/mock.json";
import type { MockData } from "../types";
import type { Api } from "./types";

const mock = mockJson as unknown as MockData;
const DOC_FILE = /\.(pdf|txt)$/i;
const CHAT_FILE = /\.txt$/i;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 서버 없이 화면을 만들기 위한 가짜 서버. 올린 파일의 내용은 읽지 않고, 항상 같은 가상 자료(테니스 동아리)를 돌려준다.
 * 사용자가 직접 추가한 항목은 분석 결과를 지어내지 않고 비어 있는 채로 둔다.
 */
export function createMockApi({ delayMs = 700 }: { delayMs?: number } = {}): Api {
  return {
    async uploadDocs(files) {
      await wait(delayMs);
      if (files.length === 0) throw new Error("확정 자료를 한 개 이상 올려 주세요");
      const unsupported = files.find((f) => !DOC_FILE.test(f.name));
      if (unsupported) throw new Error(`지원하지 않는 파일: ${unsupported.name}`);
      return mock.items.map((item) => ({ ...item, facts: [], elements: emptyElements(), score: 6 }));
    },

    async uploadChat(files, items) {
      await wait(delayMs);
      if (items.length === 0) throw new Error("확인된 업무 항목이 없어요");
      if (files.length === 0) throw new Error("카톡 대화 파일을 올려 주세요");
      const unsupported = files.find((f) => !CHAT_FILE.test(f.name));
      if (unsupported) throw new Error(`지원하지 않는 파일: ${unsupported.name}`);
      return items.map((item) => mock.items.find((m) => m.id === item.id) ?? item);
    },

    async getQuestions() {
      await wait(delayMs);
      return [...mock.questions]
        .sort((a, b) => a.rank - b.rank)
        .map((q) => ({ ...q, item_title: mock.items.find((i) => i.id === q.item_id)?.title ?? q.item_id }));
    },

    async forward(question) {
      await wait(delayMs);
      if (question.trim() === "") throw new Error("질문을 적어 주세요");
    },

    // 후임 질문 흉내: 질문에 항목 키워드가 들어 있으면 그 항목의 확정된 기록만 돌려준다. 그 밖에는 지어내지 않고 none.
    async ask(question, annotations) {
      await wait(delayMs);
      const q = question.trim();
      if (q === "") throw new Error("질문을 적어 주세요");
      const itemIds = mock.items
        .filter((item) => [item.title, ...item.keywords].some((word) => q.includes(word)))
        .map((item) => item.id);
      const hits = annotations
        .filter((a) => isConfirmed(a) && itemIds.includes(a.item_id))
        .map((a) => ({
          annotation_id: a.id,
          text: a.text,
          source: a.source,
          label: a.label,
          approved_at: new Date().toISOString().slice(0, 10),
        }));
      return { hits, summary: null, none: hits.length === 0 };
    },

    // AI 정리를 흉내 낸다: 답변을 지어내지 않고, 적은 답변만 이어 붙여 초안으로 돌려준다.
    async draftAnnotation(question, answers) {
      await wait(delayMs);
      const filled = answers.map((text, index) => ({ text: text.trim(), id: `answer#${index + 1}` })).filter((a) => a.text);
      if (filled.length === 0) throw new Error("답변을 한 가지 이상 적어 주세요");
      const [procedure, exception, example] = answers.map((a) => a.trim());
      return {
        id: `ann_${question.id}`,
        item_id: question.item_id,
        element: question.element,
        text: filled.map((a) => a.text).join(" "),
        slots: {
          ...(procedure ? { 절차: procedure } : {}),
          ...(exception ? { 예외: exception } : {}),
          ...(example ? { 사례: example } : {}),
        },
        source: { type: "전임답변" as const, ids: filled.map((a) => a.id) },
        label: "전임경험" as const,
        status: "draft" as const,
      };
    },
  };
}
