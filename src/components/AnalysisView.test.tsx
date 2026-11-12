import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
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

  it("후임으로 바꾸면 닫기 버튼이 사라진다", async () => {
    const user = userEvent.setup();
    render(<AnalysisView initialItems={mock.items} />);

    await user.click(screen.getByRole("button", { name: "후임으로 보기" }));
    await user.click(screen.getByRole("button", { name: "회비 정산 · 연락 경로: 문서에 없음" }));

    expect(screen.queryByRole("button", { name: "해당 없음으로 닫기" })).not.toBeInTheDocument();
  });
});
