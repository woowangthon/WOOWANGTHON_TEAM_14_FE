import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
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

function setup(list: Note[] = notes) {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <HandbookPage api={instantApi} notes={list} />
    </MemoryRouter>,
  );
  return user;
}

describe("HandbookPage (화면 3): 확정된 인수인계서와 후임 질문", () => {
  it("확정한 기록을 항목별로 보여주고, 삭제한 기록은 보여주지 않는다", () => {
    setup();

    const doc = screen.getByRole("region", { name: "인수인계서" });
    expect(within(doc).getByRole("heading", { name: "회비 정산" })).toBeInTheDocument();
    expect(within(doc).getByText("단톡에 공지하고 개별로 연락한다")).toBeInTheDocument();
    expect(within(doc).queryByText("초안 내용")).not.toBeInTheDocument();
    expect(within(doc).queryByRole("heading", { name: "코트 대관" })).not.toBeInTheDocument();
  });

  it("각 기록에 요소 이름과 출처를 붙인다", () => {
    setup();

    const doc = screen.getByRole("region", { name: "인수인계서" });
    expect(within(doc).getByText("연락 경로")).toBeInTheDocument();
    expect(within(doc).getByText(/전임 경험/)).toBeInTheDocument();
    expect(within(doc).getByText(/answer#1, answer#2/)).toBeInTheDocument();
  });

  it("확정한 기록이 없으면 안내와 질문 화면 링크를 보여준다", () => {
    setup([]);

    expect(screen.getByText(/아직 확정한 내용이 없어요/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "질문 화면으로" })).toHaveAttribute("href", "/interview");
  });

  it("후임이 물어보면 확정된 기록을 근거와 함께 답한다", async () => {
    const user = setup();

    await user.type(screen.getByLabelText("후임 질문"), "회비 안 낸 사람은 어떻게 해요?");
    await user.click(screen.getByRole("button", { name: "물어보기" }));

    const answer = await screen.findByRole("region", { name: "답변" });
    expect(within(answer).getByText("단톡에 공지하고 개별로 연락한다")).toBeInTheDocument();
    expect(within(answer).getByText(/전임 경험/)).toBeInTheDocument();
    expect(within(answer).getByText(/answer#1, answer#2/)).toBeInTheDocument();
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
});
