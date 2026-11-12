import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createMockApi } from "../api/mockApi";
import UploadPage from "./UploadPage";

const instantApi = createMockApi({ delayMs: 0 });
const pdf = new File(["x"], "회칙.pdf", { type: "application/pdf" });
const docx = new File(["x"], "회칙.docx");
const chat = new File(["x"], "chat.txt", { type: "text/plain" });

type User = ReturnType<typeof userEvent.setup>;

async function reachItemsStep(user: User) {
  await user.upload(screen.getByLabelText(/확정 자료/), pdf);
  await user.click(screen.getByRole("button", { name: "항목 뽑기" }));
  await screen.findByText("항목 5개");
}

async function reachChatStep(user: User) {
  await reachItemsStep(user);
  await user.click(screen.getByRole("button", { name: "항목 확인" }));
}

async function analyzeChat(user: User) {
  await user.upload(screen.getByLabelText(/카톡 대화/), chat);
  await user.click(screen.getByRole("button", { name: "분석하기" }));
}

const currentStep = () => screen.getByRole("listitem", { current: "step" });

describe("UploadPage (화면 1): 자료 → 항목 확인 → 카톡 → 분석 결과", () => {
  it("처음에는 확정 자료 단계이고, 파일을 고르기 전에는 항목 뽑기가 잠겨 있다", () => {
    render(<UploadPage api={instantApi} />);

    expect(currentStep()).toHaveTextContent("확정 자료");
    expect(screen.getByRole("button", { name: "항목 뽑기" })).toBeDisabled();
  });

  it("정리 안 된 자료도 전부 올려도 된다고 안내한다", () => {
    render(<UploadPage api={instantApi} />);
    expect(screen.getByText(/정리 안 된 자료도 괜찮아요/)).toBeInTheDocument();
    expect(screen.getByText(/있는 대로 다 넣어 주세요/)).toBeInTheDocument();
  });

  it("목 데이터로 보는 화면이라는 안내를 항상 보여준다", () => {
    render(<UploadPage api={instantApi} />);

    expect(screen.getByText(/목 데이터/)).toBeInTheDocument();
  });

  it("자료를 올리고 항목 뽑기를 누르면 항목 확인 단계로 넘어간다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);

    await reachItemsStep(user);

    expect(currentStep()).toHaveTextContent("항목 확인");
    expect(screen.getByRole("listitem", { name: "회비 정산" })).toBeInTheDocument();
  });

  it("항목을 뽑는 동안 진행 중이라는 안내가 보인다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={createMockApi({ delayMs: 60 })} />);

    await user.upload(screen.getByLabelText(/확정 자료/), pdf);
    await user.click(screen.getByRole("button", { name: "항목 뽑기" }));

    expect(screen.getByRole("status")).toHaveTextContent("항목을 뽑는 중이에요");
    await screen.findByText("항목 5개");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("지원하지 않는 자료면 오류를 보여주고 단계가 넘어가지 않는다", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<UploadPage api={instantApi} />);

    await user.upload(screen.getByLabelText(/확정 자료/), docx);
    await user.click(screen.getByRole("button", { name: "항목 뽑기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("지원하지 않는 파일: 회칙.docx");
    expect(currentStep()).toHaveTextContent("확정 자료");
  });

  it("항목을 확인하면 카톡 단계로 넘어가고, 파일을 고르기 전에는 분석하기가 잠겨 있다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);

    await reachChatStep(user);

    expect(currentStep()).toHaveTextContent("카톡 대화");
    expect(screen.getByRole("button", { name: "분석하기" })).toBeDisabled();
  });

  it("카톡 대화를 분석하면 체크표가 있는 분석 결과가 나온다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);
    await reachChatStep(user);

    await analyzeChat(user);

    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(currentStep()).toHaveTextContent("분석 결과");
    const card = screen.getByRole("article", { name: "회비 정산" });
    expect(within(card).getByText("사실 3건")).toBeInTheDocument();
  });

  it("항목 확인 단계에서 뺀 항목은 분석 결과에도 없다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);
    await reachItemsStep(user);
    await user.click(screen.getByRole("button", { name: "행사(MT) 빼기" }));
    await user.click(screen.getByRole("button", { name: "항목 확인" }));

    await analyzeChat(user);

    await screen.findByRole("table");
    expect(screen.queryByRole("rowheader", { name: /행사/ })).not.toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: /회비 정산/ })).toBeInTheDocument();
  });

  it("직접 추가한 항목은 분석 결과에 빈 곳 6으로 나온다", async () => {
    const user = userEvent.setup();
    render(<UploadPage api={instantApi} />);
    await reachItemsStep(user);
    await user.type(screen.getByLabelText("새 항목 이름"), "장비 관리");
    await user.click(screen.getByRole("button", { name: "항목 추가" }));
    await user.click(screen.getByRole("button", { name: "항목 확인" }));

    await analyzeChat(user);

    expect(await screen.findByRole("rowheader", { name: /장비 관리/ })).toHaveTextContent("빈 곳 6");
  });

  it("카톡 파일이 TXT가 아니면 오류를 보여주고 결과로 넘어가지 않는다", async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<UploadPage api={instantApi} />);
    await reachChatStep(user);

    await user.upload(screen.getByLabelText(/카톡 대화/), new File(["x"], "대화.pdf"));
    await user.click(screen.getByRole("button", { name: "분석하기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("지원하지 않는 파일: 대화.pdf");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
