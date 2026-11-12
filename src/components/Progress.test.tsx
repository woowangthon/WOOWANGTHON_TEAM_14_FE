import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Progress from "./Progress";

afterEach(() => vi.useRealTimers());

describe("Progress: 오래 걸리는 일의 진행 표시", () => {
  it("무엇을 하는 중인지와 보통 걸리는 시간을 알려준다", () => {
    render(<Progress label="대화를 분석하는 중이에요…" hint="보통 30초~3분 걸려요" />);

    expect(screen.getByRole("status")).toHaveTextContent("대화를 분석하는 중이에요…");
    expect(screen.getByRole("status")).toHaveTextContent("보통 30초~3분 걸려요");
  });

  it("지난 시간이 1초씩 늘어난다", () => {
    vi.useFakeTimers();
    render(<Progress label="분석 중" hint="보통 30초~3분 걸려요" />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByRole("status")).toHaveTextContent("3초");
  });

  it("1분이 넘으면 분과 초로 보여준다", () => {
    vi.useFakeTimers();
    render(<Progress label="분석 중" />);

    act(() => {
      vi.advanceTimersByTime(75_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent("1분 15초");
  });
});
