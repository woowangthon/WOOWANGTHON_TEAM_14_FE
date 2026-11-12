import { emptyElements } from "../lib/items";
import { readText } from "../lib/materials";
import type { SetupValues } from "../lib/setup";
import type {
  Annotation,
  AskHit,
  AskResponse,
  ElementKey,
  Item,
  Question,
} from "../types";
import type { Api, QuestionCard } from "./types";

interface ApiError {
  code: string;
  message: string;
}
type WithError = { error?: ApiError };
type ItemPatch = {
  id?: string;
  title?: string;
  keywords?: string[];
  delete?: boolean;
};

const SESSION_KEY = "handoff-be-session";
const ITEMS_KEY = "handoff-be-items";

const store = {
  get(key: string): string | null {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    } catch {
      // 저장하지 못해도 화면은 동작한다
    }
  },
};

/** 서버는 파일을 한 개만 받는다. 여러 개면 글을 이어 붙여 한 파일로 만든다. */
async function combine(files: File[], name: string): Promise<File> {
  if (files.length === 1) return files[0];
  const texts = await Promise.all(files.map(readText));
  return new File([texts.join("\n\n")], name, { type: "text/plain" });
}

const sameList = (a: string[], b: string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i]);

/** 서버 응답의 항목을 화면이 쓰는 모양으로: 비어 있는 6요소는 채워 둔다. */
const normalize = (item: Item): Item => ({
  ...item,
  facts: item.facts ?? [],
  elements: { ...emptyElements(), ...(item.elements ?? {}) },
  score: item.score ?? 0,
});

/**
 * 실제 백엔드(FastAPI)와 이야기하는 구현. 백엔드는 에러도 HTTP 200으로 주고 본문의 `error`에 담는다.
 * 쓸 만한 결과가 하나도 없을 때만 그 메시지를 오류로 보여주고, 일부라도 있으면 있는 대로 보여준다.
 */
export function createHttpApi({
  base,
  fetchImpl = (input, init) => fetch(input, init),
}: {
  base: string;
  fetchImpl?: typeof fetch;
}): Api {
  const root = base.replace(/\/$/, "");
  let sessionId: string | null = store.get(SESSION_KEY);
  let pending: Promise<string> | null = null;
  let serverItems: Item[] = (() => {
    try {
      return JSON.parse(store.get(ITEMS_KEY) ?? "[]") as Item[];
    } catch {
      return [];
    }
  })();
  let setup: SetupValues | null = null; // 시작 화면에서 받은 값. 세션 만들기가 실패했을 때 같은 값으로 다시 만든다.
  const extras = new Map<string, string[]>(); // 한 답변이 여러 주석으로 나뉘었을 때, 첫 주석 id → 나머지 id

  const remember = (items: Item[]) => {
    serverItems = items;
    store.set(ITEMS_KEY, JSON.stringify(items));
  };

  async function call<T extends WithError>(
    method: string,
    path: string,
    payload?: unknown,
    form?: FormData,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        ...(form
          ? { body: form }
          : payload !== undefined
            ? {
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              }
            : {}),
      });
    } catch {
      throw new Error("서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요");
    }
    if (response.status === 404) {
      sessionId = null;
      store.set(SESSION_KEY, null);
      throw new Error(
        "서버가 이 작업을 기억하지 못해요. 시작 화면에서 다시 시작해 주세요",
      );
    }
    if (!response.ok)
      throw new Error(`서버 오류가 났어요 (${response.status})`);
    return (await response.json()) as T;
  }

  function createSession(
    clubName: string,
    giver: string,
    receiver: string,
  ): Promise<string> {
    pending = call<{ session_id: string } & WithError>("POST", "/sessions", {
      club_name: clubName,
      giver: giver || "전임",
      receiver: receiver || "후임",
    }).then((body) => {
      sessionId = body.session_id;
      store.set(SESSION_KEY, sessionId);
      return sessionId;
    });
    // 실패한 시도를 붙들고 있으면 다음 요청도 같은 실패를 받는다. 비워서 다시 만들 수 있게 한다.
    pending.catch(() => {
      pending = null;
    });
    return pending;
  }

  async function sid(): Promise<string> {
    if (sessionId) return sessionId;
    if (pending) return pending;
    return createSession(
      setup?.orgName ?? "조직",
      setup?.giver ?? "",
      setup?.receiver ?? "",
    );
  }

  return {
    async startSession(values: SetupValues) {
      setup = values;
      sessionId = null;
      extras.clear();
      remember([]);
      store.set(SESSION_KEY, null);
      await createSession(values.orgName, values.giver, values.receiver);
    },

    async uploadDocs(files) {
      if (files.length === 0)
        throw new Error("확정 자료를 한 개 이상 올려 주세요");
      if (files.length > 1 && files.some((f) => /\.pdf$/i.test(f.name))) {
        throw new Error(
          "PDF는 한 번에 한 개만 올릴 수 있어요. 여러 개를 올릴 때는 TXT로 올려 주세요",
        );
      }
      const file = await combine(files, "자료.txt");

      const id = await sid();
      const form = new FormData();
      form.append("file", file);
      const body = await call<{ items?: Item[] } & WithError>(
        "POST",
        `/sessions/${id}/docs`,
        undefined,
        form,
      );
      const items = body.items ?? [];
      if (items.length === 0)
        throw new Error(
          body.error?.message ??
            "업무 항목을 찾지 못했어요. 다른 자료로 다시 해 보세요",
        );
      remember(items);
      return items.map(normalize);
    },

    async closeElement(
      itemId: string,
      key: ElementKey,
      closedBy: "전임" | "후임",
    ) {
      const id = await sid();
      const body = await call<WithError>(
        "PATCH",
        `/sessions/${id}/items/${itemId}/elements/${encodeURIComponent(key)}`,
        {
          state: "해당없음",
          closed_by: closedBy,
        },
      );
      if (body.error) throw new Error(body.error.message);
    },

    async uploadChat(files, items) {
      if (items.length === 0) throw new Error("확인된 업무 항목이 없어요");
      if (files.length === 0) throw new Error("카톡 대화 파일을 올려 주세요");
      const file = await combine(files, "카톡 대화.txt");
      const id = await sid();

      // 사용자가 고친 항목(이름·키워드·빼기·직접 추가)을 서버에 먼저 반영한다. 사실은 카톡을 올릴 때 잡히므로 반드시 그 전에 해야 한다.
      const patches = serverItems.flatMap((server): ItemPatch[] => {
        const mine = items.find((i) => i.id === server.id);
        if (!mine) return [{ id: server.id, delete: true }];
        const patch: ItemPatch = { id: server.id };
        if (mine.title !== server.title) patch.title = mine.title;
        if (!sameList(mine.keywords, server.keywords))
          patch.keywords = mine.keywords;
        return patch.title !== undefined || patch.keywords !== undefined
          ? [patch]
          : [];
      });
      const additions = items
        .filter((mine) => !serverItems.some((server) => server.id === mine.id))
        .map((mine): ItemPatch => ({
          title: mine.title,
          keywords: mine.keywords,
        })); // id 없이 보내면 서버가 새 항목을 만든다
      const changes = [...patches, ...additions];
      if (changes.length > 0) {
        const patched = await call<{ items?: Item[] } & WithError>(
          "PATCH",
          `/sessions/${id}/items`,
          { items: changes },
        );
        if (patched.items) remember(patched.items);
      }

      const form = new FormData();
      form.append("file", file);
      const body = await call<{ items?: Item[] } & WithError>(
        "POST",
        `/sessions/${id}/chat`,
        undefined,
        form,
      );
      const result = body.items ?? [];
      if (result.length === 0)
        throw new Error(body.error?.message ?? "대화를 분석하지 못했어요");
      remember(result);
      return result.map(normalize);
    },

    async getQuestions(): Promise<QuestionCard[]> {
      const id = await sid();
      const body = await call<{ cards?: Question[] } & WithError>(
        "GET",
        `/sessions/${id}/questions`,
      );
      const cards = [...(body.cards ?? [])].sort((a, b) => a.rank - b.rank);
      if (cards.length === 0)
        throw new Error(body.error?.message ?? "질문을 만들지 못했어요");
      return cards.map((q) => ({
        ...q,
        item_title:
          serverItems.find((i) => i.id === q.item_id)?.title ?? q.item_id,
      }));
    },

    async draftAnnotation(question, answers): Promise<Annotation> {
      const texts = answers.map((a) => a.trim()).filter(Boolean);
      if (texts.length === 0)
        throw new Error("답변을 한 가지 이상 적어 주세요");
      const id = await sid();
      const body = await call<
        { annotations?: Annotation[]; skipped?: string[] } & WithError
      >("POST", `/sessions/${id}/answers`, {
        answers: [{ question_id: question.id, text: texts.join(" ") }],
      });
      const made = body.annotations ?? [];
      if (made.length === 0) {
        if ((body.skipped ?? []).length > 0)
          throw new Error("답변이 너무 짧아요. 10자 이상 적어 주세요");
        throw new Error(body.error?.message ?? "초안을 만들지 못했어요");
      }
      const [first, ...rest] = made;
      if (rest.length === 0) return first;
      extras.set(
        first.id,
        rest.map((a) => a.id),
      );
      return { ...first, text: made.map((a) => a.text).join(" ") };
    },

    async saveDecision(annotation) {
      const id = await sid();
      const rest = extras.get(annotation.id) ?? [];
      const patch = async (annId: string, payload: Record<string, string>) => {
        const body = await call<WithError>(
          "PATCH",
          `/sessions/${id}/annotations/${annId}`,
          payload,
        );
        if (body.error) throw new Error(body.error.message);
      };
      if (annotation.status === "edited") {
        await patch(annotation.id, { status: "edited", text: annotation.text });
        for (const other of rest) await patch(other, { status: "rejected" }); // 고친 글이 나머지를 대신한다
      } else {
        await patch(annotation.id, { status: annotation.status });
        for (const other of rest)
          await patch(other, { status: annotation.status });
      }
    },

    async ask(question): Promise<AskResponse> {
      const id = await sid();
      await call<WithError>("POST", `/sessions/${id}/publish`); // 후임은 발행된 기록만 볼 수 있다
      const body = await call<
        { hits?: (AskHit & { item?: string })[]; none?: boolean } & WithError
      >("POST", `/sessions/${id}/ask`, {
        question,
      });
      const hits = (body.hits ?? []).map(
        ({ annotation_id, text, source, label }) => ({
          annotation_id,
          text,
          source,
          label,
        }),
      );
      if (
        hits.length === 0 &&
        body.error &&
        body.error.code !== "NOT_PUBLISHED"
      )
        throw new Error(body.error.message);
      return { hits, summary: null, none: hits.length === 0 };
    },

    async forward(question) {
      const id = await sid();
      await call<WithError>("POST", `/sessions/${id}/ask/forward`, {
        question,
      });
    },
  };
}
