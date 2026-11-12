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
  const [included, setIncluded] = useState(initial.map((i) => i.id));
  return <ItemsEditor items={items} onChange={setItems} included={included} onIncludedChange={setIncluded} />;
}

const rowOf = (title: string) => screen.getByRole("listitem", { name: title });

describe("ItemsEditor: 항목 고르기", () => {
  it("항목마다 이름과 키워드가 보이고, 처음에는 모두 선택돼 있다", () => {
    render(<Harness initial={mock.items} />);

    expect(screen.getByText("항목 5개 중 5개 선택")).toBeInTheDocument();
    expect(within(rowOf("회비 정산")).getByText("미납")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "회비 정산 선택" })).toBeChecked();
  });

  it("체크를 풀면 선택 개수가 줄고, 다시 누르면 돌아온다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={mock.items} />);

    await user.click(screen.getByRole("checkbox", { name: "행사(MT) 선택" }));
    expect(screen.getByText("항목 5개 중 4개 선택")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "행사(MT) 선택" })).not.toBeChecked();

    await user.click(screen.getByRole("checkbox", { name: "행사(MT) 선택" }));
    expect(screen.getByText("항목 5개 중 5개 선택")).toBeInTheDocument();
  });

  it("빼기와 합치기 버튼은 없다", () => {
    render(<Harness initial={mock.items} />);

    expect(screen.queryByRole("button", { name: /빼기/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /합치기/ })).not.toBeInTheDocument();
  });

  it("이름과 키워드를 적고 추가하면 새 항목이 선택된 채로 생기고 입력칸이 비워진다", async () => {
    const user = userEvent.setup();
    render(<Harness initial={mock.items} />);

    await user.type(screen.getByLabelText("새 항목 이름"), "장비 관리");
    await user.type(screen.getByLabelText("키워드 (쉼표로 구분)"), "장비, 보관");
    await user.click(screen.getByRole("button", { name: "항목 추가" }));

    expect(within(rowOf("장비 관리")).getByText("보관")).toBeInTheDocument();
    expect(screen.getByText("항목 6개 중 6개 선택")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "장비 관리 선택" })).toBeChecked();
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
    expect(screen.getByText("항목 5개 중 5개 선택")).toBeInTheDocument();
  });
});
