import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Api } from "../api/types";
import { createMockApi } from "../api/mockApi";
import type { Note } from "../lib/handbook";
import HandbookPage from "./HandbookPage";

const instantApi = createMockApi({ delayMs: 0 });

const notes: Note[] = [
  {
    item_title: "회비 정산",
    annotation: {
      id: "ann_q_01",
      item_id: "item_01",
      element: "연락경로",
      text: "단톡에 공지하고 개별로 연락한다",
      slots: {},
      source: { type: "전임답변", ids: ["answer#1", "answer#2"] },
      label: "전임경험",
      status: "approved",
    },
  },
  {
    item_title: "코트 대관",
    annotation: {
      id: "ann_q_02",
      item_id: "item_02",
      element: "판단기준",
      text: "초안 내용",
      slots: {},
      source: { type: "전임답변", ids: ["answer#1"] },
      label: "전임경험",
      status: "rejected",
    },
  },
];

function setup(list: Note[] = notes, api: Api = instantApi) {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <HandbookPage api={api} notes={list} />
    </MemoryRouter>,
  );
  return user;
}

const docRegion = () => screen.getByRole("region", { name: "인수인계서" });

describe("HandbookPage (화면 3): 발행된 인수인계서", () => {
  it("확정한 기록을 항목별로 보여주고, 삭제한 기록은 보여주지 않는다", async () => {
    setup();

    expect(await within(docRegion()).findByRole("heading", { name: "회비 정산" })).toBeInTheDocument();
    expect(within(docRegion()).getByText("단톡에 공지하고 개별로 연락한다")).toBeInTheDocument();
    expect(within(docRegion()).queryByText("초안 내용")).not.toBeInTheDocument();
    expect(within(docRegion()).queryByRole("heading", { name: "코트 대관" })).not.toBeInTheDocument();
  });

  it("각 기록에 요소 이름과 출처를 붙이고 내부 번호는 보이지 않는다", async () => {
    setup();

    await within(docRegion()).findByRole("heading", { name: "회비 정산" });
    expect(within(docRegion()).getByText("연락 경로")).toBeInTheDocument();
    expect(within(docRegion()).getByText(/전임 경험/)).toBeInTheDocument();
    expect(within(docRegion()).getByText(/출처: 전임 답변/)).toBeInTheDocument();
    expect(within(docRegion()).queryByText(/answer#/)).not.toBeInTheDocument();
  });

  it("전임이 나눠 적은 슬롯(절차·예외 등)은 이름과 함께 보여주고, 비어 있는 슬롯은 보여주지 않는다", async () => {
    const withSlots: Note[] = [
      {
        item_title: "회비 정산",
        annotation: { ...notes[0].annotation, slots: { 절차: "단톡에 공지한다", 예외: "장기 미납은 운영진이 논의한다" } },
      },
    ];
    setup(withSlots);

    await within(docRegion()).findByRole("heading", { name: "회비 정산" });
    expect(within(docRegion()).getByText("절차")).toBeInTheDocument();
    expect(within(docRegion()).getByText("장기 미납은 운영진이 논의한다")).toBeInTheDocument();
    expect(within(docRegion()).queryByText("사례")).not.toBeInTheDocument();
  });

  it("전임이 고친 기록에는 '전임이 고침' 표시가 붙는다", async () => {
    setup([{ item_title: "회비 정산", annotation: { ...notes[0].annotation, status: "edited" } }]);

    expect(await within(docRegion()).findByText(/전임이 고침/)).toBeInTheDocument();
  });

  it("고정 공지문(회칙·규정이 우선)이 항상 보인다", async () => {
    setup();

    expect(await screen.findByText(/회칙·규정이 우선합니다/)).toBeInTheDocument();
  });

  it("자료에서 찾은 사실을 항목 아래에 함께 보여준다", async () => {
    setup();

    expect(await within(docRegion()).findByText(/자료에서 찾은 사실/)).toBeInTheDocument();
  });

  it("확정한 기록이 없으면 안내와 질문 화면 링크, '승인된 기록이 없습니다'를 보여준다", async () => {
    setup([]);

    expect(await screen.findByText(/아직 확정한 내용이 없어요/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "질문 화면으로" })).toHaveAttribute("href", "/interview");
    expect(screen.getByText(/승인된 기록이 없습니다/)).toBeInTheDocument();
  });

  it("발행하지 못하면 오류를 보여준다", async () => {
    const failing = { ...instantApi, publish: vi.fn().mockRejectedValue(new Error("서버에 연결하지 못했어요")) };
    setup(notes, failing);

    expect(await screen.findByRole("alert")).toHaveTextContent("서버에 연결하지 못했어요");
  });
});

describe("HandbookPage (화면 3): 후임 질문", () => {
  it("후임이 물어보면 확정된 기록을 근거와 함께 답한다", async () => {
    const user = setup();

    await user.type(screen.getByLabelText("후임 질문"), "회비 안 낸 사람은 어떻게 해요?");
    await user.click(screen.getByRole("button", { name: "물어보기" }));

    const answer = await screen.findByRole("region", { name: "답변" });
    expect(within(answer).getByText("단톡에 공지하고 개별로 연락한다")).toBeInTheDocument();
    expect(within(answer).getByText(/전임 경험/)).toBeInTheDocument();
    expect(within(answer).getByText(/출처: 전임 답변/)).toBeInTheDocument();
    expect(within(answer).queryByText(/answer#/)).not.toBeInTheDocument();
    expect(within(answer).getByText("전임이 확정한 답변")).toBeInTheDocument();
  });

  it("기록에 없는 질문에는 '기록 없음'으로 답하고 지어내지 않는다", async () => {
    const user = setup();

    await user.type(screen.getByLabelText("후임 질문"), "동아리 회장 생일이 언제예요?");
    await user.click(screen.getByRole("button", { name: "물어보기" }));

    const answer = await screen.findByRole("region", { name: "답변" });
    expect(within(answer).getByText("기록 없음")).toBeInTheDocument();
    expect(within(answer).queryByText("단톡에 공지하고 개별로 연락한다")).not.toBeInTheDocument();
  });

  it("질문을 적기 전에는 물어보기가 잠겨 있다", () => {
    setup();

    expect(screen.getByRole("button", { name: "물어보기" })).toBeDisabled();
  });

  it("확정 날짜를 모르는 답변에는 날짜 문구를 붙이지 않는다", async () => {
    const user = userEvent.setup();
    const api = {
      ...instantApi,
      ask: async () => ({
        hits: [{ annotation_id: "an_1", text: "단톡에 공지한다", source: { type: "전임답변" as const, ids: ["q_01"] }, label: "전임경험" as const }],
        none: false,
      }),
    };
    render(
      <MemoryRouter>
        <HandbookPage api={api} notes={notes} />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("후임 질문"), "회비는?");
    await user.click(screen.getByRole("button", { name: "물어보기" }));

    const answer = await screen.findByRole("region", { name: "답변" });
    expect(within(answer).queryByText(/확정 undefined|확정 $/)).not.toBeInTheDocument();
    expect(within(answer).getByText(/출처: 전임 답변/)).toBeInTheDocument();
  });

  it("답변이 어느 항목의 기록인지 항목 이름을 함께 보여준다", async () => {
    const user = userEvent.setup();
    const api = {
      ...instantApi,
      ask: async () => ({
        hits: [{ annotation_id: "an_1", text: "단톡에 공지한다", item: "회비 정산", source: { type: "전임답변" as const, ids: ["q_01"] }, label: "전임경험" as const }],
        none: false,
      }),
    };
    render(
      <MemoryRouter>
        <HandbookPage api={api} notes={notes} />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("후임 질문"), "회비는?");
    await user.click(screen.getByRole("button", { name: "물어보기" }));

    const answer = await screen.findByRole("region", { name: "답변" });
    expect(within(answer).getByText(/회비 정산/)).toBeInTheDocument();
  });

  it("기록이 없을 때 '전임에게 질문 보내기'를 누르면 질문을 보내고 보냈다고 알려준다", async () => {
    const user = userEvent.setup();
    const forward = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter>
        <HandbookPage api={{ ...instantApi, forward }} notes={notes} />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("후임 질문"), "우주선 발사 일정은?");
    await user.click(screen.getByRole("button", { name: "물어보기" }));
    await user.click(await screen.findByRole("button", { name: "전임에게 질문 보내기" }));

    expect(forward).toHaveBeenCalledWith("우주선 발사 일정은?");
    expect(await screen.findByText("전임에게 보냈어요")).toBeInTheDocument();
  });
});

describe("HandbookPage (화면 3): 전임 질문함", () => {
  it("후임이 전임에게 보낸 질문을 시각과 함께 보여준다", async () => {
    const api = { ...instantApi, getForwarded: async () => [{ question: "회비는 언제까지 내요?", asked_at: "2026-11-13T10:05:00" }] };
    setup(notes, api);

    const inbox = await screen.findByRole("region", { name: "전임 질문함" });
    expect(await within(inbox).findByText("회비는 언제까지 내요?")).toBeInTheDocument();
    expect(within(inbox).getByText(/2026-11-13 10:05/)).toBeInTheDocument();
  });

  it("보낸 질문이 없으면 비어 있다고 알려준다", async () => {
    setup();

    const inbox = await screen.findByRole("region", { name: "전임 질문함" });
    expect(await within(inbox).findByText(/아직 받은 질문이 없어요/)).toBeInTheDocument();
  });

  it("질문을 보내면 질문함에 바로 나타난다", async () => {
    const user = userEvent.setup();
    const own = createMockApi({ delayMs: 0 });
    render(
      <MemoryRouter>
        <HandbookPage api={own} notes={notes} />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText("후임 질문"), "우주선 발사 일정은?");
    await user.click(screen.getByRole("button", { name: "물어보기" }));
    await user.click(await screen.findByRole("button", { name: "전임에게 질문 보내기" }));

    const inbox = screen.getByRole("region", { name: "전임 질문함" });
    expect(await within(inbox).findByText("우주선 발사 일정은?")).toBeInTheDocument();
  });
});
