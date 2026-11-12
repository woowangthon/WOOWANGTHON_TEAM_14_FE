import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import mockJson from "../mock/mock.json";
import type { Item, MockData } from "../types";
import ItemsEditor from "./ItemsEditor";

const mock = mockJson as unknown as MockData;

function Harness({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState(initial);
  return <ItemsEditor items={items} onChange={setItems} />;
}

const rowOf = (title: string) => screen.getByRole("listitem", { name: title });

describe("ItemsEditor: 항목 확인·편집", () => {
  it("항목마다 이름과 키워드가 보이고 항목 수를 알려준다", () => {
    render(<Harness initial={mock.items} />);

    expect(screen.getByText("항목 5개")).toBeInTheDocument();
    expect(within(rowOf("회비 정산")).getByText("미납")).toBeInTheDocument();
  });

  it("고른 카드에만 '선택됨' 표시가 붙는다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={mock.items} />);
    expect(within(rowOf("회비 정산")).queryByText("선택됨")).not.toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "회비 정산 선택" }));

    expect(within(rowOf("회비 정산")).getByText("선택됨")).toBeInTheDocument();
    expect(within(rowOf("코트 대관")).queryByText("선택됨")).not.toBeInTheDocument();
  });

  it("'빼기'를 누르면 그 항목이 사라진다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={mock.items} />);

    await user.click(screen.getByRole("button", { name: "행사(MT) 빼기" }));

    expect(screen.queryByRole("listitem", { name: "행사(MT)" })).not.toBeInTheDocument();
    expect(screen.getByText("항목 4개")).toBeInTheDocument();
  });

  it("두 개를 고르기 전에는 합치기 버튼이 눌리지 않는다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={mock.items} />);
    const merge = screen.getByRole("button", { name: "선택한 항목 합치기" });
    expect(merge).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "회비 정산 선택" }));
    expect(merge).toBeDisabled();

    await user.click(screen.getByRole("checkbox", { name: "코트 대관 선택" }));
    expect(merge).toBeEnabled();
  });

  it("먼저 고른 항목에 나중에 고른 항목이 합쳐진다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={mock.items} />);

    await user.click(screen.getByRole("checkbox", { name: "코트 대관 선택" }));
    await user.click(screen.getByRole("checkbox", { name: "회비 정산 선택" }));
    await user.click(screen.getByRole("button", { name: "선택한 항목 합치기" }));

    expect(screen.queryByRole("listitem", { name: "회비 정산" })).not.toBeInTheDocument();
    expect(within(rowOf("코트 대관")).getByText("미납")).toBeInTheDocument(); // 회비 쪽 키워드가 합쳐짐
    expect(screen.getByText("항목 4개")).toBeInTheDocument();
  });

  it("합친 뒤에는 선택이 풀려서 합치기 버튼이 다시 잠긴다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={mock.items} />);

    await user.click(screen.getByRole("checkbox", { name: "회비 정산 선택" }));
    await user.click(screen.getByRole("checkbox", { name: "코트 대관 선택" }));
    await user.click(screen.getByRole("button", { name: "선택한 항목 합치기" }));

    expect(screen.getByRole("button", { name: "선택한 항목 합치기" })).toBeDisabled();
  });

  it("고른 항목을 빼면 선택에서도 사라져 합치기가 다시 잠긴다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={mock.items} />);
    await user.click(screen.getByRole("checkbox", { name: "회비 정산 선택" }));
    await user.click(screen.getByRole("checkbox", { name: "코트 대관 선택" }));

    await user.click(screen.getByRole("button", { name: "코트 대관 빼기" }));

    expect(screen.getByRole("button", { name: "선택한 항목 합치기" })).toBeDisabled();
  });

  it("이름과 키워드를 적고 추가하면 새 항목이 생기고 입력칸이 비워진다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={mock.items} />);

    await user.type(screen.getByLabelText("새 항목 이름"), "장비 관리");
    await user.type(screen.getByLabelText("키워드 (쉼표로 구분)"), "장비, 보관");
    await user.click(screen.getByRole("button", { name: "항목 추가" }));

    expect(within(rowOf("장비 관리")).getByText("보관")).toBeInTheDocument();
    expect(screen.getByText("항목 6개")).toBeInTheDocument();
    expect(screen.getByLabelText("새 항목 이름")).toHaveValue("");
  });

  it("이름을 적기 전에는 추가 버튼이 눌리지 않는다", () => {
    render(<Harness initial={mock.items} />);

    expect(screen.getByRole("button", { name: "항목 추가" })).toBeDisabled();
  });

  it("이미 있는 이름을 추가하면 알려주고 늘어나지 않는다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={mock.items} />);

    await user.type(screen.getByLabelText("새 항목 이름"), "회비 정산");
    await user.click(screen.getByRole("button", { name: "항목 추가" }));

    expect(screen.getByRole("alert")).toHaveTextContent("이미 있는 항목이에요");
    expect(screen.getByText("항목 5개")).toBeInTheDocument();
  });
});
