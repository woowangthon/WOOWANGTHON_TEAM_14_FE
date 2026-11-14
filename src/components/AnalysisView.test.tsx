import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createMockApi } from "../api/mockApi";
import mockJson from "../mock/mock.json";
import type { MockData } from "../types";
import AnalysisView from "./AnalysisView";

const mock = mockJson as unknown as MockData;

describe("AnalysisView (분석 결과: 항목 카드 + 체크표)", () => {
  it("항목 카드에 사실 건수와 키워드가 보인다", () => {
    render(<AnalysisView initialItems={mock.items} />);

    const card = screen.getByRole("article", { name: "회비 정산" });
    expect(within(card).getByText("사실 3건")).toBeInTheDocument();
    expect(within(card).getByText("미납")).toBeInTheDocument();
  });

  it("전임 모드에서 칸을 닫으면 그 항목의 빈 곳 점수가 줄어든다", async () => {
    const user = userEvent.setup();
    render(<AnalysisView initialItems={mock.items} />);
    const header = () => screen.getByRole("rowheader", { name: /회비 정산/ });
    expect(header()).toHaveTextContent("빈 곳 4");

    await user.click(screen.getByRole("button", { name: "회비 정산 · 연락 경로: 문서에 없음" }));
    await user.click(screen.getByRole("button", { name: "해당 없음으로 닫기" }));

    expect(header()).toHaveTextContent("빈 곳 3");
    expect(screen.getByRole("button", { name: "회비 정산 · 연락 경로: 해당 없음 (전임이 닫음)" })).toBeInTheDocument();
  });

  it("보는 사람을 바꾸는 전임/후임 전환 버튼은 없고, 항상 전임으로 닫을 수 있다", async () => {
    const user = userEvent.setup();
    render(<AnalysisView initialItems={mock.items} />);

    expect(screen.queryByRole("button", { name: /으로 보기/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "회비 정산 · 연락 경로: 문서에 없음" }));
    expect(screen.getByRole("button", { name: "해당 없음으로 닫기" })).toBeInTheDocument();
  });

  it("칸을 닫으면 서버에도 알린다", async () => {
    const user = userEvent.setup();
    const closeElement = vi.fn().mockResolvedValue(undefined);
    render(<AnalysisView initialItems={mock.items} api={{ ...createMockApi({ delayMs: 0 }), closeElement }} />);

    await user.click(screen.getByRole("button", { name: "회비 정산 · 연락 경로: 문서에 없음" }));
    await user.click(screen.getByRole("button", { name: "해당 없음으로 닫기" }));

    expect(closeElement).toHaveBeenCalledWith("item_01", "연락경로", "전임");
  });

  it("서버가 닫기를 받지 못하면 오류를 보여주고 칸은 닫지 않는다", async () => {
    const user = userEvent.setup();
    const closeElement = vi.fn().mockRejectedValue(new Error("서버에 연결하지 못했어요"));
    render(<AnalysisView initialItems={mock.items} api={{ ...createMockApi({ delayMs: 0 }), closeElement }} />);

    await user.click(screen.getByRole("button", { name: "회비 정산 · 연락 경로: 문서에 없음" }));
    await user.click(screen.getByRole("button", { name: "해당 없음으로 닫기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("서버에 연결하지 못했어요");
    expect(screen.getByRole("button", { name: "회비 정산 · 연락 경로: 문서에 없음" })).toBeInTheDocument();
  });

  it("사실이 많으면 상위 3개만 보여주고 '더 보기'로 펼친다", async () => {
    const user = userEvent.setup();
    const base = mock.items[0];
    const facts = Array.from({ length: 6 }, (_, i) => ({ ...base.facts[0], id: `fact_x${i}`, text: `사실 문장 ${i + 1}` }));
    render(<AnalysisView initialItems={[{ ...base, facts }]} />);

    const card = screen.getByRole("article", { name: base.title });
    expect(within(card).getByText("사실 문장 3")).toBeInTheDocument();
    expect(within(card).queryByText("사실 문장 4")).not.toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: /더 보기/ }));
    expect(within(card).getByText("사실 문장 6")).toBeInTheDocument();

    await user.click(within(card).getByRole("button", { name: "접기" }));
    expect(within(card).queryByText("사실 문장 4")).not.toBeInTheDocument();
  });

  it("사실이 3개 이하면 '더 보기'가 없다", () => {
    render(<AnalysisView initialItems={mock.items} />);

    expect(screen.queryByRole("button", { name: /더 보기/ })).not.toBeInTheDocument();
  });
});
