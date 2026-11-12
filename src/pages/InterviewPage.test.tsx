import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { createMockApi } from "../api/mockApi";
import mockJson from "../mock/mock.json";
import type { Annotation, MockData } from "../types";
import InterviewPage from "./InterviewPage";

const mock = mockJson as unknown as MockData;
const instantApi = createMockApi({ delayMs: 0 });
const total = mock.questions.length;

function setup() {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <InterviewPage api={instantApi} />
    </MemoryRouter>,
  );
  return user;
}

/** 첫 질문 한 장을 답변 세 개로 끝내고 초안을 띄운다 */
async function answerAll(user: ReturnType<typeof userEvent.setup>, answers = ["첫째 답", "둘째 답", "셋째 답"]) {
  await user.type(await screen.findByLabelText("답변"), answers[0]);
  await user.click(screen.getByRole("button", { name: "다음 질문" }));
  await user.type(screen.getByLabelText("답변"), answers[1]);
  await user.click(screen.getByRole("button", { name: "다음 질문" }));
  await user.type(screen.getByLabelText("답변"), answers[2]);
  await user.click(screen.getByRole("button", { name: "초안 만들기" }));
}

describe("InterviewPage (화면 2): 질문 → 답변 → 초안 확인", () => {
  it("첫 질문과 진행 상황, 항목 이름을 보여준다", async () => {
    setup();

    expect(await screen.findByText(`질문 1 / ${total}`)).toBeInTheDocument();
    expect(screen.getByText(mock.questions[0].step1)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: new RegExp(mock.items[0].title) })).toBeInTheDocument();
  });

  it("답변을 적기 전에는 다음 질문이 잠겨 있다", async () => {
    setup();

    await screen.findByLabelText("답변");
    expect(screen.getByRole("button", { name: "다음 질문" })).toBeDisabled();
  });

  it("답변하면 다음 단계 질문이 나오고, 앞 답변은 그대로 남는다", async () => {
    const user = setup();

    await user.type(await screen.findByLabelText("답변"), "총무가 공지한다");
    await user.click(screen.getByRole("button", { name: "다음 질문" }));

    expect(screen.getByText(mock.questions[0].step2)).toBeInTheDocument();
    expect(screen.getByText("총무가 공지한다")).toBeInTheDocument();
  });

  it("'잘 모르겠어요'로 한 단계를 건너뛸 수 있다", async () => {
    const user = setup();

    await screen.findByLabelText("답변");
    await user.click(screen.getByRole("button", { name: "잘 모르겠어요" }));

    expect(screen.getByText(mock.questions[0].step2)).toBeInTheDocument();
  });

  it("세 단계를 마치면 초안이 나오고 맞음·수정·삭제를 고를 수 있다", async () => {
    const user = setup();

    await answerAll(user);

    expect(await screen.findByText(/첫째 답/, { selector: "blockquote *, blockquote" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "맞음" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "수정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "삭제" })).toBeInTheDocument();
  });

  it("답변을 모두 건너뛰면 초안을 만들 수 없다", async () => {
    const user = setup();

    await screen.findByLabelText("답변");
    await user.click(screen.getByRole("button", { name: "잘 모르겠어요" }));
    await user.click(screen.getByRole("button", { name: "잘 모르겠어요" }));
    await user.click(screen.getByRole("button", { name: "잘 모르겠어요" }));

    expect(screen.queryByRole("button", { name: "맞음" })).not.toBeInTheDocument();
    expect(screen.getByText(`질문 2 / ${total}`)).toBeInTheDocument();
  });

  it("맞음을 누르면 다음 질문으로 넘어간다", async () => {
    const user = setup();
    await answerAll(user);

    await user.click(await screen.findByRole("button", { name: "맞음" }));

    expect(await screen.findByText(`질문 2 / ${total}`)).toBeInTheDocument();
    expect(screen.getByText(mock.questions[1].step1)).toBeInTheDocument();
  });

  it("수정을 누르면 초안을 고칠 수 있고, 비운 채로는 저장되지 않는다", async () => {
    const user = setup();
    await answerAll(user);

    await user.click(await screen.findByRole("button", { name: "수정" }));
    const box = screen.getByLabelText("초안 수정");
    await user.clear(box);
    await user.click(screen.getByRole("button", { name: "수정 저장" }));

    expect(screen.getByRole("alert")).toHaveTextContent("수정할 내용을 적어 주세요");
    expect(screen.getByText(`질문 1 / ${total}`)).toBeInTheDocument();

    await user.type(box, "고친 내용");
    await user.click(screen.getByRole("button", { name: "수정 저장" }));

    expect(await screen.findByText(`질문 2 / ${total}`)).toBeInTheDocument();
  });

  it("결정할 때마다 확정 노트를 항목 이름과 함께 바깥으로 알린다", async () => {
    const user = userEvent.setup();
    const seen: { title: string; status: string; text: string }[] = [];
    render(
      <MemoryRouter>
        <InterviewPage api={instantApi} onDecide={(a, title) => seen.push({ title, status: a.status, text: a.text })} />
      </MemoryRouter>,
    );

    await answerAll(user);
    await user.click(await screen.findByRole("button", { name: "맞음" }));

    expect(seen).toEqual([{ title: mock.items[0].title, status: "approved", text: "첫째 답 둘째 답 셋째 답" }]);
  });

  it("이미 결정한 질문은 다시 들어와도 건너뛰고 첫 미결정 질문부터 이어서 묻는다", async () => {
    const q = mock.questions[0];
    const previous = {
      id: "ann_old",
      item_id: q.item_id,
      element: q.element,
      text: "이전에 확정",
      slots: {},
      source: { type: "전임답변" as const, ids: ["answer#1"] },
      label: "전임경험" as const,
      status: "approved" as const,
    };
    render(
      <MemoryRouter>
        <InterviewPage api={instantApi} decided={[previous]} />
      </MemoryRouter>,
    );

    expect(await screen.findByText(`질문 2 / ${total}`)).toBeInTheDocument();
    expect(screen.getByText(mock.questions[1].step1)).toBeInTheDocument();
  });

  it("모든 질문을 이미 결정했다면 바로 마침 화면이 나오고 이전 결정이 개수에 들어간다", async () => {
    const decidedAll = mock.questions.map((q) => ({
      id: `ann_${q.id}`,
      item_id: q.item_id,
      element: q.element,
      text: "확정",
      slots: {},
      source: { type: "전임답변" as const, ids: ["answer#1"] },
      label: "전임경험" as const,
      status: "approved" as const,
    }));
    render(
      <MemoryRouter>
        <InterviewPage api={instantApi} decided={decidedAll} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "질문을 모두 마쳤어요" })).toBeInTheDocument();
    expect(screen.getByText(`확정 ${total} · 삭제 0 · 건너뜀 0`)).toBeInTheDocument();
  });

  it("'이 질문 건너뛰기'로 질문 한 장을 통째로 넘길 수 있다", async () => {
    const user = setup();

    await screen.findByLabelText("답변");
    await user.click(screen.getByRole("button", { name: "이 질문 건너뛰기" }));

    expect(screen.getByText(`질문 2 / ${total}`)).toBeInTheDocument();
  });

  it("질문을 모두 마치면 확정·삭제·건너뜀 개수와 문서 보기 링크가 나온다", async () => {
    const user = setup();

    await answerAll(user);
    await user.click(await screen.findByRole("button", { name: "맞음" }));
    await answerAll(user);
    await user.click(await screen.findByRole("button", { name: "삭제" }));
    for (let i = 2; i < total; i += 1) {
      await user.click(await screen.findByRole("button", { name: "이 질문 건너뛰기" }));
    }

    expect(await screen.findByRole("heading", { name: "질문을 모두 마쳤어요" })).toBeInTheDocument();
    expect(screen.getByText(`확정 1 · 삭제 1 · 건너뜀 ${total - 2}`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "문서 보기" })).toHaveAttribute("href", "/handbook");
  });

  it("결정하면 서버에 저장하고, 저장하지 못하면 오류를 보여주며 다음으로 넘어가지 않는다", async () => {
    const user = userEvent.setup();
    const saveDecision = vi.fn().mockRejectedValueOnce(new Error("서버에 연결하지 못했어요")).mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <InterviewPage api={{ ...instantApi, saveDecision }} />
      </MemoryRouter>,
    );
    await answerAll(user);

    await user.click(await screen.findByRole("button", { name: "맞음" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("서버에 연결하지 못했어요");
    expect(screen.getByText(`질문 1 / ${total}`)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "맞음" }));
    expect(await screen.findByText(`질문 2 / ${total}`)).toBeInTheDocument();
    expect(saveDecision).toHaveBeenLastCalledWith(expect.objectContaining({ status: "approved" }));
  });
});

const q0 = mock.questions[0];
const makeDraft = (id: string, element: Annotation["element"], text: string, slots: Annotation["slots"] = {}): Annotation => ({
  id,
  item_id: q0.item_id,
  element,
  text,
  slots,
  source: { type: "전임답변", ids: [q0.id] },
  label: "전임경험",
  status: "draft",
});

const draftRegions = () => screen.getAllByRole("region", { name: "초안 확인" });

describe("InterviewPage: 한 답변이 여러 주석으로 나뉠 때", () => {
  it("나뉜 주석이 각각 초안으로 보이고, 모두 정한 뒤에야 다음 질문으로 넘어간다", async () => {
    const user = userEvent.setup();
    const saveDecision = vi.fn().mockResolvedValue(undefined);
    const api = {
      ...instantApi,
      saveDecision,
      draftAnnotations: async () => [makeDraft("an_1", "연락경로", "첫째 요약"), makeDraft("an_2", "자주틀리는점", "둘째 요약")],
    };
    render(
      <MemoryRouter>
        <InterviewPage api={api} />
      </MemoryRouter>,
    );
    await answerAll(user);

    expect(await screen.findAllByRole("region", { name: "초안 확인" })).toHaveLength(2);
    await user.click(within(draftRegions()[0]).getByRole("button", { name: "맞음" }));
    expect(screen.getByText(`질문 1 / ${total}`)).toBeInTheDocument(); // 아직 하나가 남았다

    await user.click(within(draftRegions()[1]).getByRole("button", { name: "삭제" }));

    expect(await screen.findByText(`질문 2 / ${total}`)).toBeInTheDocument();
    expect(saveDecision).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: "an_1", status: "approved" }));
    expect(saveDecision).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: "an_2", status: "rejected" }));
  });

  it("초안에는 전임이 적은 슬롯(절차·사례 등)이 이름과 함께 보이고 비어 있는 슬롯은 보이지 않는다", async () => {
    const user = userEvent.setup();
    const api = {
      ...instantApi,
      draftAnnotations: async () => [makeDraft("an_1", "연락경로", "요약", { 절차: "메일 후 전화", 사례: null as never })],
    };
    render(
      <MemoryRouter>
        <InterviewPage api={api} />
      </MemoryRouter>,
    );
    await answerAll(user);

    const region = (await screen.findAllByRole("region", { name: "초안 확인" }))[0];
    expect(within(region).getByText("절차")).toBeInTheDocument();
    expect(within(region).getByText("메일 후 전화")).toBeInTheDocument();
    expect(within(region).queryByText("사례")).not.toBeInTheDocument();
  });

  it("라벨을 '규정 근거'로 바꾸고 확정하면 바뀐 라벨로 저장된다", async () => {
    const user = userEvent.setup();
    const saveDecision = vi.fn().mockResolvedValue(undefined);
    const seen: Annotation[] = [];
    const api = { ...instantApi, saveDecision, draftAnnotations: async () => [makeDraft("an_1", "연락경로", "요약")] };
    render(
      <MemoryRouter>
        <InterviewPage api={api} onDecide={(a) => seen.push(a)} />
      </MemoryRouter>,
    );
    await answerAll(user);
    const region = (await screen.findAllByRole("region", { name: "초안 확인" }))[0];
    expect(within(region).getByRole("button", { name: "전임 경험" })).toHaveAttribute("aria-pressed", "true");

    await user.click(within(region).getByRole("button", { name: "규정 근거" }));
    await user.click(within(region).getByRole("button", { name: "맞음" }));

    expect(saveDecision).toHaveBeenCalledWith(expect.objectContaining({ status: "approved", label: "규정근거" }));
    expect(seen[0].label).toBe("규정근거");
  });
});

describe("InterviewPage: 추가 질문과 질문 카드 표시", () => {
  const withExtras = async () => {
    const base = await instantApi.getQuestions();
    return [
      ...base,
      { ...base[0], id: "q_x1", rank: 6, element: "배경" as const },
      { ...base[1], id: "q_x2", rank: 7, element: "미리할일" as const },
    ];
  };

  it("카드 5장을 마치면 추가 질문이 있다고 알려주고, 이어서 답할 수 있다", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <InterviewPage api={{ ...instantApi, getQuestions: withExtras }} />
      </MemoryRouter>,
    );
    for (let i = 0; i < total; i += 1) {
      await user.click(await screen.findByRole("button", { name: "이 질문 건너뛰기" }));
    }

    expect(await screen.findByRole("heading", { name: "질문을 모두 마쳤어요" })).toBeInTheDocument();
    expect(screen.getByText(`확정 0 · 삭제 0 · 건너뜀 ${total}`)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "추가 질문 2개 더 답하기" }));

    expect(await screen.findByText(`질문 ${total + 1} / ${total + 2}`)).toBeInTheDocument();
  });

  it("추가 질문이 없으면 그런 버튼이 없다", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <InterviewPage api={instantApi} />
      </MemoryRouter>,
    );
    for (let i = 0; i < total; i += 1) {
      await user.click(await screen.findByRole("button", { name: "이 질문 건너뛰기" }));
    }

    expect(await screen.findByRole("heading", { name: "질문을 모두 마쳤어요" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /추가 질문/ })).not.toBeInTheDocument();
  });

  it("서버가 기본 문장으로 채운 질문에는 '기본 질문' 표시가 붙는다", async () => {
    const withFallback = async () => {
      const base = await instantApi.getQuestions();
      return [{ ...base[0], fallback: true as const }, ...base.slice(1)];
    };
    render(
      <MemoryRouter>
        <InterviewPage api={{ ...instantApi, getQuestions: withFallback }} />
      </MemoryRouter>,
    );

    expect(await screen.findByText("기본 질문")).toBeInTheDocument();
  });
});

describe("InterviewPage: 질문을 불러오지 못할 때", () => {
  it("오류와 함께 다시 불러오기 버튼과 자료 화면 링크를 보여주고, 다시 누르면 불러온다", async () => {
    const user = userEvent.setup();
    const getQuestions = vi
      .fn()
      .mockRejectedValueOnce(new Error("업무 항목이 없습니다. 문서와 대화를 먼저 올려주세요."))
      .mockImplementation(() => instantApi.getQuestions());
    render(
      <MemoryRouter>
        <InterviewPage api={{ ...instantApi, getQuestions }} />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("업무 항목이 없습니다");
    expect(screen.getByRole("link", { name: "자료 화면으로" })).toHaveAttribute("href", "/upload");

    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(await screen.findByText(`질문 1 / ${total}`)).toBeInTheDocument();
    expect(getQuestions).toHaveBeenCalledTimes(2);
  });
});
