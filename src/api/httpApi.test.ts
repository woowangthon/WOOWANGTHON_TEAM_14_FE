import { beforeEach, describe, expect, it } from "vitest";
import type { Annotation, Item } from "../types";
import { createHttpApi } from "./httpApi";

type Call = { method: string; path: string; body?: unknown; form?: FormData };
type Handler = (call: Call) => unknown;

/** 진짜 서버 대신 요청을 기록하고 정해 둔 응답을 돌려주는 가짜 fetch */
function fake(handler: Handler) {
  const calls: Call[] = [];
  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    const call: Call = { method: init.method ?? "GET", path: url.replace("http://be", "") };
    if (init.body instanceof FormData) call.form = init.body;
    else if (typeof init.body === "string") call.body = JSON.parse(init.body);
    calls.push(call);
    const out = handler(call) as { __status?: number } | undefined;
    return new Response(JSON.stringify(out ?? {}), {
      status: out?.__status ?? 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

const item = (id: string, title: string, keywords: string[] = ["키"]) =>
  ({ id, title, keywords, facts: [], elements: {}, score: 0 }) as unknown as Item;

const values = { orgName: "테니스 동아리", orgType: "기타" as const, department: "총무", giver: "", receiver: "" };
const readBlob = (f: Blob) =>
  new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsText(f);
  });
const txt = (name: string, body: string) => new File([body], name, { type: "text/plain" });

beforeEach(() => sessionStorage.clear());

describe("createHttpApi: 세션", () => {
  it("시작하면 조직 이름으로 세션을 만들고, 비어 있는 전임·후임 이름은 기본값으로 채운다", async () => {
    const { calls, fetchImpl } = fake(() => ({ session_id: "s1" }));
    const api = createHttpApi({ base: "http://be", fetchImpl });

    await api.startSession!(values);

    expect(calls).toEqual([
      { method: "POST", path: "/sessions", body: { club_name: "테니스 동아리", giver: "전임", receiver: "후임" } },
    ]);
  });

  it("시작할 때 세션 만들기가 실패해도, 다음 요청에서 다시 만들어 이어간다", async () => {
    let failOnce = true;
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      const path = String(url).replace("http://be", "");
      calls.push(path);
      if (path === "/sessions" && failOnce) {
        failOnce = false;
        throw new TypeError("network");
      }
      const body = path === "/sessions" ? { session_id: "s1" } : { items: [item("item_01", "회비")] };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;
    const api = createHttpApi({ base: "http://be", fetchImpl });

    await expect(api.startSession!(values)).rejects.toThrow(/연결/);
    const items = await api.uploadDocs([txt("a.txt", "내용")]);

    expect(items).toHaveLength(1);
    expect(calls.filter((p) => p === "/sessions")).toHaveLength(2);
  });

  it("서버가 세션을 모른다고 하면(404) 다시 시작하라고 알려준다", async () => {
    const { fetchImpl } = fake((c) => (c.path === "/sessions" ? { session_id: "s1" } : { __status: 404 }));
    const api = createHttpApi({ base: "http://be", fetchImpl });
    await api.startSession!(values);

    await expect(api.uploadDocs([txt("a.txt", "내용")])).rejects.toThrow(/다시 시작/);
  });
});

describe("createHttpApi: 자료와 카톡", () => {
  it("TXT 여러 개는 한 파일로 합쳐서 올린다", async () => {
    const { calls, fetchImpl } = fake((c) => (c.path === "/sessions" ? { session_id: "s1" } : { items: [item("item_01", "회비")] }));
    const api = createHttpApi({ base: "http://be", fetchImpl });
    await api.startSession!(values);

    const items = await api.uploadDocs([txt("a.txt", "회비는 매월 낸다"), txt("b.txt", "코트는 신청한다")]);

    const upload = calls.find((c) => c.path === "/sessions/s1/docs")!;
    const sent = upload.form!.get("file") as File;
    const text = await readBlob(sent);
    expect(text).toContain("회비는 매월 낸다");
    expect(text).toContain("코트는 신청한다");
    expect(items.map((i) => i.title)).toEqual(["회비"]);
  });

  it("PDF는 다른 파일과 함께 올릴 수 없다고 알려준다", async () => {
    const { fetchImpl } = fake(() => ({ session_id: "s1" }));
    const api = createHttpApi({ base: "http://be", fetchImpl });
    await api.startSession!(values);

    await expect(api.uploadDocs([new File(["x"], "a.pdf"), txt("b.txt", "내용")])).rejects.toThrow(/PDF/);
  });

  it("항목이 하나도 안 왔고 error가 있으면 그 메시지를 오류로 보여준다", async () => {
    const { fetchImpl } = fake((c) =>
      c.path === "/sessions" ? { session_id: "s1" } : { items: [], error: { code: "llm_no_key", message: "LLM_API_KEY가 설정되지 않았습니다" } },
    );
    const api = createHttpApi({ base: "http://be", fetchImpl });
    await api.startSession!(values);

    await expect(api.uploadDocs([txt("a.txt", "내용")])).rejects.toThrow("LLM_API_KEY가 설정되지 않았습니다");
  });

  it("카톡을 올리기 전에, 사용자가 고친 항목(이름·키워드·삭제)을 서버에 먼저 반영한다", async () => {
    const serverItems = [item("item_01", "회비 정산", ["회비"]), item("item_02", "코트 대관", ["코트"])];
    const { calls, fetchImpl } = fake((c) => {
      if (c.path === "/sessions") return { session_id: "s1" };
      if (c.path.endsWith("/docs")) return { items: serverItems };
      if (c.method === "PATCH") return { items: [] };
      return { items: [item("item_01", "회비 정산"), item("item_03", "신입")], chat_count: 10 };
    });
    const api = createHttpApi({ base: "http://be", fetchImpl });
    await api.startSession!(values);
    await api.uploadDocs([txt("a.txt", "내용")]);

    const mine = [item("item_01", "회비", ["회비", "미납"])];
    const result = await api.uploadChat([txt("chat.txt", "대화")], mine);

    const patchIndex = calls.findIndex((c) => c.method === "PATCH");
    const chatIndex = calls.findIndex((c) => c.path === "/sessions/s1/chat");
    expect(patchIndex).toBeGreaterThan(-1);
    expect(patchIndex).toBeLessThan(chatIndex);
    expect(calls[patchIndex].body).toEqual({
      items: [{ id: "item_01", title: "회비", keywords: ["회비", "미납"] }, { id: "item_02", delete: true }],
    });
    expect(result.map((i) => i.id)).toEqual(["item_01", "item_03"]);
  });

  it("카톡 파일이 여러 개면 한 파일로 합쳐서 올린다", async () => {
    const { calls, fetchImpl } = fake((c) => {
      if (c.path === "/sessions") return { session_id: "s1" };
      if (c.path.endsWith("/docs")) return { items: [item("item_01", "회비")] };
      return { items: [item("item_01", "회비")], chat_count: 2 };
    });
    const api = createHttpApi({ base: "http://be", fetchImpl });
    await api.startSession!(values);
    const first = await api.uploadDocs([txt("a.txt", "내용")]);

    await api.uploadChat([txt("1.txt", "첫째 대화"), txt("2.txt", "둘째 대화")], first);

    const upload = calls.find((c) => c.path === "/sessions/s1/chat")!;
    const text = await readBlob(upload.form!.get("file") as File);
    expect(text).toContain("첫째 대화");
    expect(text).toContain("둘째 대화");
  });

  it("직접 추가한 항목은 id 없이 이름과 키워드를 보내고, 서버가 준 항목으로 이어간다", async () => {
    const serverItems = [item("item_01", "회비 정산", ["회비"])];
    const { calls, fetchImpl } = fake((c) => {
      if (c.path === "/sessions") return { session_id: "s1" };
      if (c.path.endsWith("/docs")) return { items: serverItems };
      if (c.method === "PATCH") return { items: [...serverItems, item("item_02", "장비 관리", ["장비", "보관"])] };
      return { items: [item("item_01", "회비 정산"), item("item_02", "장비 관리")], chat_count: 5 };
    });
    const api = createHttpApi({ base: "http://be", fetchImpl });
    await api.startSession!(values);
    await api.uploadDocs([txt("a.txt", "내용")]);

    const mine = [serverItems[0], item("item_custom_2", "장비 관리", ["장비", "보관"])];
    const result = await api.uploadChat([txt("chat.txt", "대화")], mine);

    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(patch.body).toEqual({ items: [{ title: "장비 관리", keywords: ["장비", "보관"] }] });
    expect(result.map((i) => i.id)).toEqual(["item_01", "item_02"]);
  });

  it("고친 곳이 없으면 항목 수정 요청을 보내지 않는다", async () => {
    const serverItems = [item("item_01", "회비 정산", ["회비"])];
    const { calls, fetchImpl } = fake((c) => {
      if (c.path === "/sessions") return { session_id: "s1" };
      if (c.path.endsWith("/docs")) return { items: serverItems };
      return { items: serverItems, chat_count: 1 };
    });
    const api = createHttpApi({ base: "http://be", fetchImpl });
    await api.startSession!(values);
    await api.uploadDocs([txt("a.txt", "내용")]);

    await api.uploadChat([txt("chat.txt", "대화")], serverItems);

    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("칸을 '해당 없음'으로 닫으면 서버에 알린다", async () => {
    const { calls, fetchImpl } = fake((c) => (c.path === "/sessions" ? { session_id: "s1" } : { item: {} }));
    const api = createHttpApi({ base: "http://be", fetchImpl });
    await api.startSession!(values);

    await api.closeElement!("item_01", "연락경로", "전임");

    expect(calls.at(-1)).toEqual({
      method: "PATCH",
      path: "/sessions/s1/items/item_01/elements/" + encodeURIComponent("연락경로"),
      body: { state: "해당없음", closed_by: "전임" },
    });
  });
});

describe("createHttpApi: 질문과 답변", () => {
  const card = { id: "q_01", item_id: "item_01", element: "연락경로", kind: "빈칸", step1: "a", step2: "b", step3: "c", rank: 1 };

  async function ready(handler: Handler) {
    const server = fake((c) => {
      if (c.path === "/sessions") return { session_id: "s1" };
      if (c.path.endsWith("/docs")) return { items: [item("item_01", "회비 정산")] };
      return handler(c);
    });
    const api = createHttpApi({ base: "http://be", fetchImpl: server.fetchImpl });
    await api.startSession!(values);
    await api.uploadDocs([txt("a.txt", "내용")]);
    return { api, calls: server.calls };
  }

  it("질문 카드에 항목 이름을 붙이고 순서대로 돌려준다", async () => {
    const { api } = await ready(() => ({ cards: [{ ...card, id: "q_02", rank: 2 }, card], more: [] }));

    const cards = await api.getQuestions();

    expect(cards.map((q) => q.id)).toEqual(["q_01", "q_02"]);
    expect(cards[0].item_title).toBe("회비 정산");
  });

  it("카드가 없고 error가 있으면 그 메시지를 오류로 보여준다", async () => {
    const { api } = await ready(() => ({ cards: [], more: [], error: { code: "no_items", message: "문서와 대화를 먼저 올려주세요" } }));

    await expect(api.getQuestions()).rejects.toThrow("문서와 대화를 먼저 올려주세요");
  });

  it("세 단계 답변 중 적은 것만 이어 붙여 한 번에 보내고, 주석 초안을 돌려준다", async () => {
    const annotation = { id: "an_001", item_id: "item_01", element: "연락경로", text: "정리", slots: {}, source: { type: "전임답변", ids: ["q_01"] }, label: "전임경험", status: "draft" };
    const { api, calls } = await ready(() => ({ annotations: [annotation], skipped: [] }));

    const draft = await api.draftAnnotation(card as never, ["총무가 공지한다", "", "지난달에 전화했다"]);

    const sent = calls.find((c) => c.path === "/sessions/s1/answers")!;
    expect(sent.body).toEqual({ answers: [{ question_id: "q_01", text: "총무가 공지한다 지난달에 전화했다" }] });
    expect(draft.id).toBe("an_001");
    expect(draft.status).toBe("draft");
  });

  it("답변이 너무 짧아서 서버가 건너뛰면 10자 이상 적어 달라고 알려준다", async () => {
    const { api } = await ready(() => ({ annotations: [], skipped: ["q_01"] }));

    await expect(api.draftAnnotation(card as never, ["네", "", ""])).rejects.toThrow(/10자/);
  });

  it("맞음을 누르면 서버의 주석을 승인한다", async () => {
    const draft = { id: "an_001", item_id: "item_01", element: "연락경로", text: "정리", slots: {}, source: { type: "전임답변", ids: ["q_01"] }, label: "전임경험", status: "draft" };
    const { api, calls } = await ready(() => ({ annotations: [draft], skipped: [] }));
    const made = await api.draftAnnotation(card as never, ["충분히 긴 답변입니다", "", ""]);

    await api.saveDecision!({ ...made, status: "approved" } as Annotation);

    expect(calls.at(-1)).toEqual({ method: "PATCH", path: "/sessions/s1/annotations/an_001", body: { status: "approved" } });
  });

  it("고쳐서 저장하면 고친 글을 보내고, 삭제하면 거절로 보낸다", async () => {
    const draft = { id: "an_001", item_id: "item_01", element: "연락경로", text: "정리", slots: {}, source: { type: "전임답변", ids: ["q_01"] }, label: "전임경험", status: "draft" };
    const { api, calls } = await ready(() => ({ annotations: [draft], skipped: [] }));
    const made = await api.draftAnnotation(card as never, ["충분히 긴 답변입니다", "", ""]);

    await api.saveDecision!({ ...made, status: "edited", text: "고친 글" } as Annotation);
    expect(calls.at(-1)?.body).toEqual({ status: "edited", text: "고친 글" });

    await api.saveDecision!({ ...made, status: "rejected" } as Annotation);
    expect(calls.at(-1)?.body).toEqual({ status: "rejected" });
  });

  it("서버가 주석을 여러 개로 나눠 줘도 한 개의 초안으로 보이고, 결정은 모두에게 적용된다", async () => {
    const make = (id: string, text: string) => ({ id, item_id: "item_01", element: "연락경로", text, slots: {}, source: { type: "전임답변", ids: ["q_01"] }, label: "전임경험", status: "draft" });
    const { api, calls } = await ready(() => ({ annotations: [make("an_001", "첫째 요약"), make("an_002", "둘째 요약")], skipped: [] }));

    const draft = await api.draftAnnotation(card as never, ["충분히 긴 답변입니다", "", ""]);
    expect(draft.id).toBe("an_001");
    expect(draft.text).toBe("첫째 요약 둘째 요약");

    await api.saveDecision!({ ...draft, status: "approved" } as Annotation);
    const patches = calls.filter((c) => c.method === "PATCH").map((c) => c.path);
    expect(patches).toEqual(["/sessions/s1/annotations/an_001", "/sessions/s1/annotations/an_002"]);

    await api.saveDecision!({ ...draft, status: "edited", text: "내가 고친 글" } as Annotation);
    const last = calls.slice(-2);
    expect(last[0].body).toEqual({ status: "edited", text: "내가 고친 글" });
    expect(last[1].body).toEqual({ status: "rejected" }); // 고친 글이 나머지를 대신한다
  });
});

describe("createHttpApi: 후임 질문", () => {
  async function ready(askBody: unknown) {
    const { calls, fetchImpl } = fake((c) => {
      if (c.path === "/sessions") return { session_id: "s1" };
      if (c.path.endsWith("/publish")) return { document: { items: [], notice: "" } };
      if (c.path.endsWith("/ask")) return askBody;
      return { forwarded: true };
    });
    const api = createHttpApi({ base: "http://be", fetchImpl });
    await api.startSession!(values);
    return { api, calls };
  }

  it("질문하기 전에 확정본을 발행하고, 서버의 기록을 그대로 돌려준다", async () => {
    const hit = { annotation_id: "an_001", text: "단톡에 공지한다", source: { type: "전임답변", ids: ["q_01"] }, label: "전임경험", item: "회비 정산", score: 2 };
    const { api, calls } = await ready({ hits: [hit], summary: null, none: false });

    const answer = await api.ask("회비는요?", []);

    expect(calls.map((c) => c.path).slice(-2)).toEqual(["/sessions/s1/publish", "/sessions/s1/ask"]);
    expect(calls.at(-1)?.body).toEqual({ question: "회비는요?" });
    expect(answer.none).toBe(false);
    expect(answer.hits[0]).toMatchObject({ annotation_id: "an_001", text: "단톡에 공지한다", label: "전임경험" });
  });

  it("기록이 없으면 none으로 돌려준다", async () => {
    const { api } = await ready({ hits: [], summary: null, none: true });

    expect((await api.ask("우주선?", [])).none).toBe(true);
  });

  it("전임에게 질문을 보낸다", async () => {
    const { api, calls } = await ready({});

    await api.forward!("회비는요?");

    expect(calls.at(-1)).toEqual({ method: "POST", path: "/sessions/s1/ask/forward", body: { question: "회비는요?" } });
  });
});
