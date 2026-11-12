import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import mockJson from "../mock/mock.json";
import type { MockData } from "../types";
import ChecklistTable from "./ChecklistTable";

const mock = mockJson as unknown as MockData;

describe("ChecklistTable", () => {
  it("표 위에 먼저 물어볼 업무와 칸 수 요약을 보여준다", () => {
    render(<ChecklistTable items={mock.items} mode="전임" />);

    const summary = screen.getByRole("region", { name: "요약" });
    expect(within(summary).getByText(/먼저 물어볼 업무/)).toBeInTheDocument();
    expect(within(summary).getByText(new RegExp(`전체 ${mock.items.length * 6}칸 중`))).toBeInTheDocument();
  });

  it("칸 안에는 글자를 반복하지 않고, 뜻은 색 설명과 칸의 이름표로 전한다", () => {
    render(<ChecklistTable items={mock.items} mode="전임" />);

    const cell = screen.getByRole("button", { name: "회비 정산 · 연락 경로: 문서에 없음" });
    expect(cell).not.toHaveTextContent("없음");
    expect(cell).toHaveAttribute("title", "문서에 없음");
  });

  it("좁은 화면에서 표가 옆으로 밀린다는 안내가 있고, 항목 이름 칸은 밀려도 보이도록 고정된다", () => {
    render(<ChecklistTable items={mock.items} mode="전임" />);

    expect(screen.getByText("표를 옆으로 밀어서 보세요")).toBeInTheDocument();
    const rowHeader = screen.getByRole("rowheader", { name: new RegExp(mock.items[0].title) });
    expect(rowHeader.className).toContain("sticky");
  });

  it("항목 5개 × 6요소 = 칸 30개를 보여준다", () => {
    render(<ChecklistTable items={mock.items} mode="전임" />);

    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("button")).toHaveLength(30);
  });

  it("빈 곳 점수가 높은 항목이 위에 온다", () => {
    render(<ChecklistTable items={mock.items} mode="전임" />);

    const rows = screen.getAllByRole("row");
    // rows[0]은 머리글, rows[1]이 첫 항목
    expect(within(rows[1]).getByRole("rowheader")).toHaveTextContent("신입 모집");
  });

  it("칸 이름에 항목·요소·상태가 모두 드러난다", () => {
    render(<ChecklistTable items={mock.items} mode="전임" />);

    expect(screen.getByRole("button", { name: "회비 정산 · 연락 경로: 문서에 없음" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "회비 정산 · 판단 기준: 있음 · 확인됨" })).toBeInTheDocument();
  });

  it("아무것도 고르지 않았을 때 안내 문구를 보여준다", () => {
    render(<ChecklistTable items={mock.items} mode="전임" />);

    expect(screen.getByRole("region", { name: "선택한 칸 상세" })).toHaveTextContent("칸을 눌러 근거를 확인하세요");
  });

  it("칸을 누르면 근거 문장을 보여준다", async () => {
    const user = userEvent.setup();
    render(<ChecklistTable items={mock.items} mode="전임" />);

    await user.click(screen.getByRole("button", { name: "회비 정산 · 시기·기한: 있음 · 추가 확인 권장" }));

    expect(screen.getByRole("region", { name: "선택한 칸 상세" })).toHaveTextContent("회비는 매월 말 정산한다");
  });

  it("후임 모드에서는 '해당 없음으로 닫기' 버튼이 없다", async () => {
    const user = userEvent.setup();
    render(<ChecklistTable items={mock.items} mode="후임" />);

    await user.click(screen.getByRole("button", { name: "회비 정산 · 연락 경로: 문서에 없음" }));

    expect(screen.queryByRole("button", { name: "해당 없음으로 닫기" })).not.toBeInTheDocument();
  });

  it("전임 모드에서 닫기를 누르면 항목과 요소를 알려준다", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ChecklistTable items={mock.items} mode="전임" onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "회비 정산 · 연락 경로: 문서에 없음" }));
    await user.click(screen.getByRole("button", { name: "해당 없음으로 닫기" }));

    expect(onClose).toHaveBeenCalledWith("item_01", "연락경로");
  });

  it("이미 닫힌 칸에서는 닫기 버튼이 없다", async () => {
    const user = userEvent.setup();
    render(<ChecklistTable items={mock.items} mode="전임" />);

    await user.click(screen.getByRole("button", { name: "회비 정산 · 배경: 해당 없음 (전임이 닫음)" }));

    expect(screen.queryByRole("button", { name: "해당 없음으로 닫기" })).not.toBeInTheDocument();
  });
});
