import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMockApi } from "../api/mockApi";
import UploadPage from "./UploadPage";

const instantApi = createMockApi({ delayMs: 0 });

const CHAT = [
  "--------------- 2026년 4월 2일 목요일 ---------------",
  "[회장] [오후 7:45] 회비 걷어요",
  "[총무] [오후 7:46] 네 알겠습니다",
  "[부원] [오후 7:50] 입금했어요",
].join("\n");

const rules = new File(["제1조 회비는 매월 말 정산한다."], "회칙.txt", { type: "text/plain" });
const pdf = new File(["x"], "공지.pdf", { type: "application/pdf" });
const kakao = new File([CHAT], "카카오톡 대화.txt", { type: "text/plain" });
const docx = new File(["x"], "회칙.docx");

type User = ReturnType<typeof userEvent.setup>;

const fileInput = () => screen.getByLabelText(/자료 파일/);
const currentStep = () => screen.getByRole("listitem", { current: "step" });

/** 파일을 올리고, 문서·카톡 대화로 나누는 읽기 작업이 끝날 때까지 기다린다 */
async function addFiles(user: User, ...files: File[]) {
  await user.upload(fileInput(), files);
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
}

async function reachItemsStep(user: User) {
  await addFiles(user, rules, kakao);
  await user.click(screen.getByRole("button", { name: "항목 뽑기" }));
  await screen.findByText(/항목 5개 중/);
}

async function goToChatStep(user: User) {
  await user.click(screen.getByRole("button", { name: "카톡으로 넘어가기" }));
  await screen.findByRole("heading", { name: "카톡에서 내용 뽑기" });
}

async function analyze(user: User) {
  await goToChatStep(user);
  await user.click(screen.getByRole("button", { name: "카톡에서 내용 뽑기" }));
}

describe("UploadPage (화면 1): 자료 올리기 → 항목 고르기 → 분석 결과", () => {
  it("처음에는 자료 올리기 단계이고, 파일을 넣기 전에는 항목 뽑기가 잠겨 있다", () => {
    render(<UploadPage api={instantApi} />);

    expect(currentStep()).toHaveTextContent("자료 올리기");
    expect(screen.getByRole("heading", { name: "흩어진 자료 모두 올리기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "항목 뽑기" })).toBeDisabled();
  });

  it("정리 안 된 자료도, 카톡 대화도 한꺼번에 넣으면 된다고 안내한다", () => {
    render(<UploadPage api={instantApi} />);

    expect(screen.getByText(/정리 안 된 자료도 괜찮아요/)).toBeInTheDocument();
    expect(screen.getByText(/카톡 대화/, { selector: "p" })).toBeInTheDocument();
  });

  it("개발용 안내(목 데이터)는 화면에 보이지 않는다", () => {
    render(<UploadPage api={instantApi} />);

    expect(screen.queryByText(/목 데이터/)).not.toBeInTheDocument();
  });

  it("파일을 여러 번에 나눠 올려도 목록에 계속 쌓이고, 문서와 카톡 대화로 구분해 보여준다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);

    await addFiles(user, rules);
    await addFiles(user, kakao);

    const list = screen.getByRole("list", { name: "올린 자료" });
    expect(within(list).getByText("회칙.txt")).toBeInTheDocument();
    expect(within(list).getByText("카카오톡 대화.txt")).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "회칙.txt" })).getByText("문서")).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: "카카오톡 대화.txt" })).getByText("카톡 대화")).toBeInTheDocument();
  });

  it("한 번에 여러 개를 골라도 모두 들어간다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);

    await addFiles(user, rules, pdf, kakao);

    expect(within(screen.getByRole("list", { name: "올린 자료" })).getAllByRole("listitem")).toHaveLength(3);
  });

  it("같은 파일을 또 올려도 한 번만 보인다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);

    await addFiles(user, rules);
    await addFiles(user, rules);

    expect(within(screen.getByRole("list", { name: "올린 자료" })).getAllByRole("listitem")).toHaveLength(1);
  });

  it("잘못 올린 파일은 목록에서 지울 수 있다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);
    await addFiles(user, rules, kakao);

    await user.click(screen.getByRole("button", { name: "회칙.txt 지우기" }));

    expect(screen.queryByText("회칙.txt")).not.toBeInTheDocument();
    expect(screen.getByText("카카오톡 대화.txt")).toBeInTheDocument();
  });

  it("문서만 올려도 항목을 뽑을 수 있고, 카톡은 나중에 넣어도 된다고 알려준다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);

    await addFiles(user, rules);

    expect(screen.getByText(/카톡 대화는 다음 단계에서 넣어도 돼요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "항목 뽑기" })).toBeEnabled();
  });

  it("카톡 대화만 올렸다면 회칙·공지 같은 문서가 필요하다고 알려준다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);

    await addFiles(user, kakao);

    expect(screen.getByText(/문서 파일도 필요해요/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "항목 뽑기" })).toBeDisabled();
  });

  it("항목 뽑기를 누르면 항목 고르기 단계로 넘어가고 모든 항목이 선택돼 있다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);

    await reachItemsStep(user);

    expect(currentStep()).toHaveTextContent("항목 고르기");
    expect(screen.getByText("항목 5개 중 5개 선택")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "회비 정산 선택" })).toBeChecked();
  });

  it("항목을 뽑는 동안 진행 중이라는 안내가 보인다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={createMockApi({ delayMs: 60 })} />);
    await addFiles(user, rules, kakao);

    await user.click(screen.getByRole("button", { name: "항목 뽑기" }));

    expect(screen.getByRole("status")).toHaveTextContent("항목을 뽑는 중이에요");
    await screen.findByText(/항목 5개 중/);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("지원하지 않는 자료면 오류를 보여주고 단계가 넘어가지 않는다", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<UploadPage api={instantApi} />);
    await addFiles(user, docx, kakao);

    await user.click(screen.getByRole("button", { name: "항목 뽑기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("지원하지 않는 파일: 회칙.docx");
    expect(currentStep()).toHaveTextContent("자료 올리기");
  });

  it("선택한 항목으로 분석하면 체크표가 있는 분석 결과가 나온다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);
    await reachItemsStep(user);

    await analyze(user);

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(currentStep()).toHaveTextContent("분석 결과");
    const card = screen.getByRole("article", { name: "회비 정산" });
    expect(within(card).getByText("사실 3건")).toBeInTheDocument();
  });

  it("체크를 푼 항목은 분석 결과에도 없다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);
    await reachItemsStep(user);

    await user.click(screen.getByRole("checkbox", { name: "행사(MT) 선택" }));
    await analyze(user);

    await screen.findByRole("table");
    expect(screen.queryByRole("rowheader", { name: /행사/ })).not.toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /회비 정산/ })).toBeInTheDocument();
  });

  it("항목을 하나도 고르지 않으면 카톡 단계로 넘어갈 수 없다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);
    await reachItemsStep(user);

    for (const name of ["회비 정산", "코트 대관", "대회 참가", "신입 모집", "행사(MT)"]) {
      await user.click(screen.getByRole("checkbox", { name: `${name} 선택` }));
    }

    expect(screen.getByRole("button", { name: "카톡으로 넘어가기" })).toBeDisabled();
  });

  it("직접 추가한 항목도 선택된 채로 분석 결과에 빈 곳 6으로 나온다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);
    await reachItemsStep(user);

    await user.type(screen.getByLabelText("새 항목 이름"), "장비 관리");
    await user.click(screen.getByRole("button", { name: "항목 추가" }));
    await analyze(user);

    expect(await screen.findByRole("rowheader", { name: /장비 관리/ })).toHaveTextContent("빈 곳 6");
  });

  it("진행 단계에 '카톡에서 내용 뽑기'가 항목 고르기 다음 단계로 보인다", () => {
    render(<UploadPage api={instantApi} />);

    const steps = within(screen.getByRole("list", { name: "진행 단계" })).getAllByRole("listitem");
    expect(steps.map((step) => step.textContent)).toEqual(["1 자료 올리기", "2 항목 고르기", "3 카톡에서 내용 뽑기", "4 분석 결과"]);
  });

  it("항목을 고른 뒤 카톡 단계로 가면, 고른 항목 수와 올려 둔 카톡 대화를 보여준다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);
    await reachItemsStep(user);
    await user.click(screen.getByRole("checkbox", { name: "행사(MT) 선택" }));

    await goToChatStep(user);

    expect(currentStep()).toHaveTextContent("카톡에서 내용 뽑기");
    expect(screen.getByText("고른 항목 4개 · 카톡 대화 1개")).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "올린 카톡 대화" })).getByText("카카오톡 대화.txt")).toBeInTheDocument();
  });

  it("카톡을 아직 안 올렸다면 카톡 단계에서 올릴 수 있고, 올리기 전에는 뽑기가 잠겨 있다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);
    await addFiles(user, rules);
    await user.click(screen.getByRole("button", { name: "항목 뽑기" }));
    await screen.findByText(/항목 5개 중/);
    await goToChatStep(user);
    expect(screen.getByRole("button", { name: "카톡에서 내용 뽑기" })).toBeDisabled();

    await user.upload(screen.getByLabelText(/카톡 대화 파일 고르기/), new File(["x"], "단톡.txt", { type: "text/plain" }));

    expect(await screen.findByText("단톡.txt")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "카톡에서 내용 뽑기" })).toBeEnabled();
  });

  it("카톡 단계에서 '항목 다시 고르기'로 돌아가도 체크한 항목이 그대로 남는다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);
    await reachItemsStep(user);
    await user.click(screen.getByRole("checkbox", { name: "행사(MT) 선택" }));
    await goToChatStep(user);

    await user.click(screen.getByRole("button", { name: "항목 다시 고르기" }));

    expect(currentStep()).toHaveTextContent("항목 고르기");
    expect(screen.getByRole("checkbox", { name: "행사(MT) 선택" })).not.toBeChecked();
    expect(screen.getByText("항목 5개 중 4개 선택")).toBeInTheDocument();
  });

  it("카톡에서 내용을 뽑는 동안 진행 안내가 보인다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={createMockApi({ delayMs: 60 })} />);
    await addFiles(user, rules, kakao);
    await user.click(screen.getByRole("button", { name: "항목 뽑기" }));
    await screen.findByText(/항목 5개 중/);
    await goToChatStep(user);

    await user.click(screen.getByRole("button", { name: "카톡에서 내용 뽑기" }));

    expect(screen.getByRole("status")).toHaveTextContent("카톡에서 내용을 뽑는 중이에요");
    await screen.findByRole("table");
  });

  it("분석 결과에서 '질문으로 넘어가기'를 누르면 다음 화면으로 넘어간다", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    render(<UploadPage api={instantApi} onNext={onNext} />);
    await reachItemsStep(user);
    expect(screen.queryByRole("button", { name: "질문으로 넘어가기" })).not.toBeInTheDocument();

    await analyze(user);
    await screen.findByRole("table");
    expect(screen.getByText(/필요 없는 칸은 지금 닫아 주세요/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "질문으로 넘어가기" }));

    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
