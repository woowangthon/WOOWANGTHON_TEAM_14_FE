import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import App from "./App";
import type { Note } from "./lib/handbook";
import { NotesProvider } from "./lib/NotesContext";
import { SessionProvider } from "./lib/SessionContext";
import type { SetupValues } from "./lib/setup";

const existing: SetupValues = {
  orgName: "학생회",
  orgType: "학생회",
  department: "회계부",
  giver: "",
  receiver: "",
};

function renderApp(path: string, initial: SetupValues | null, notes: Note[] = []) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SessionProvider initial={initial}>
        <NotesProvider initial={notes}>
          <App />
        </NotesProvider>
      </SessionProvider>
    </MemoryRouter>,
  );
}

describe("화면 3 연결", () => {
  it("전임이 확정한 노트가 문서 화면에 나온다", () => {
    renderApp("/handbook", existing, [
      {
        item_title: "회비 정산",
        annotation: {
          id: "ann_q_01",
          item_id: "item_01",
          element: "연락경로",
          text: "단톡에 공지한다",
          slots: {},
          source: { type: "전임답변", ids: ["answer#1"] },
          label: "전임경험",
          status: "approved",
        },
      },
    ]);

    expect(screen.getByRole("heading", { name: "회비 정산" })).toBeInTheDocument();
    expect(screen.getByText("단톡에 공지한다")).toBeInTheDocument();
  });
});

describe("시작 화면과 화면 이동", () => {
  it("시작하지 않았으면 다른 화면 주소로 가도 시작 화면이 나온다", () => {
    renderApp("/upload", null);

    expect(screen.getByRole("heading", { name: "시작하기" })).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("시작하기 전에는 화면 이동 탭이 보이지 않는다", () => {
    renderApp("/start", null);

    expect(screen.queryByRole("navigation", { name: "화면 이동" })).not.toBeInTheDocument();
  });

  it("입력칸에는 조직 종류 선택과 전임·후임 이름이 없다", async () => {
    const user = userEvent.setup();
    renderApp("/start", null);

    await user.click(screen.getByRole("button", { name: "시작하기" }));

    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/전임자 이름/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/후임자 이름/)).not.toBeInTheDocument();
  });

  it("처음 열면 입력칸 없이 폴더만 보인다", () => {
    renderApp("/start", null);

    expect(screen.queryByLabelText(/조직 이름/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "시작하기" })).toBeInTheDocument();
  });

  it("시작하기 폴더를 처음 누르면 입력칸이 나타나고 아직 오류는 없다", async () => {
    const user = userEvent.setup();
    renderApp("/start", null);

    await user.click(screen.getByRole("button", { name: "시작하기" }));

    expect(screen.getByLabelText(/조직 이름/)).toBeInTheDocument();
    expect(screen.getByLabelText(/업무 부서/)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("아무것도 입력하지 않고 시작하면 필수 항목 오류가 보이고 화면이 넘어가지 않는다", async () => {
    const user = userEvent.setup();
    renderApp("/start", null);

    await user.click(screen.getByRole("button", { name: "시작하기" }));
    await user.click(screen.getByRole("button", { name: "시작하기" }));

    expect(screen.getByText("조직 이름을 입력해 주세요")).toBeInTheDocument();
    expect(screen.getByText("업무 부서(담당 역할)를 입력해 주세요")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "시작하기" })).toBeInTheDocument();
  });

  it("조직과 업무 부서를 입력하고 시작하면 화면 1로 넘어가고 헤더에 조직·부서가 보인다", async () => {
    const user = userEvent.setup();
    renderApp("/start", null);

    await user.click(screen.getByRole("button", { name: "시작하기" }));
    await user.type(screen.getByLabelText(/조직 이름/), "총학생회");
    await user.type(screen.getByLabelText(/업무 부서/), "회계부");
    await user.click(screen.getByRole("button", { name: "시작하기" }));

    expect(screen.getByRole("heading", { name: "흩어진 자료 모두 올리기" })).toBeInTheDocument();
    expect(screen.getByLabelText("현재 조직")).toHaveTextContent("총학생회 · 회계부");
    expect(screen.getByRole("navigation", { name: "화면 이동" })).toBeInTheDocument();
  });

  it("이미 시작했다면 화면 1이 바로 열리고 조직·부서가 헤더에 보인다", () => {
    renderApp("/upload", existing);

    expect(screen.getByRole("heading", { name: "흩어진 자료 모두 올리기" })).toBeInTheDocument();
    expect(screen.getByLabelText("현재 조직")).toHaveTextContent("학생회 · 회계부");
  });

  it("'다시 설정'을 누르면 시작 화면에 이전 입력이 채워져 있다", async () => {
    const user = userEvent.setup();
    renderApp("/upload", existing);

    await user.click(screen.getByRole("button", { name: "다시 설정" }));

    expect(screen.getByRole("heading", { name: "시작하기" })).toBeInTheDocument();
    expect(screen.getByLabelText(/조직 이름/)).toHaveValue("학생회");
    expect(screen.getByLabelText(/업무 부서/)).toHaveValue("회계부");
  });
});

describe("파일철 틀", () => {
  it("로고는 괄호를 쓴 Hand(off)로 읽힌다", () => {
    renderApp("/start", null);

    expect(screen.getByRole("heading", { level: 1, name: "Hand(off)" })).toBeInTheDocument();
  });

  it("시작하기 전에는 '시작' 탭만 보이고 이동 링크는 없다", () => {
    renderApp("/start", null);

    expect(screen.getByText("시작")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("시작한 뒤에는 자료·질문·문서 탭이 링크로 보인다", () => {
    renderApp("/upload", existing);

    expect(screen.getByRole("link", { name: "자료" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "질문" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "문서" })).toBeInTheDocument();
  });

  it("지금 화면의 탭은 현재 위치로 표시된다", () => {
    renderApp("/upload", existing);

    expect(screen.getByRole("link", { name: "자료" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "질문" })).not.toHaveAttribute("aria-current");
  });

  it("조직 정보 스티커에는 조직과 부서가 보인다", () => {
    renderApp("/upload", existing);

    expect(screen.getByLabelText("현재 조직")).toHaveTextContent("학생회 · 회계부");
  });
});

describe("시작 화면과 서버", () => {
  it("입력을 마치고 시작하면 서버에 새 작업을 연다", async () => {
    const user = userEvent.setup();
    const startSession = vi.fn().mockResolvedValue(undefined);
    render(
      <MemoryRouter initialEntries={["/start"]}>
        <SessionProvider initial={null}>
          <NotesProvider initial={[]}>
            <App api={{ startSession } as never} />
          </NotesProvider>
        </SessionProvider>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "시작하기" }));
    await user.type(screen.getByLabelText(/조직 이름/), "테니스 동아리");
    await user.type(screen.getByLabelText(/업무 부서/), "총무");
    await user.click(screen.getByRole("button", { name: "시작하기" }));

    expect(startSession).toHaveBeenCalledWith(expect.objectContaining({ orgName: "테니스 동아리", department: "총무" }));
  });
});
