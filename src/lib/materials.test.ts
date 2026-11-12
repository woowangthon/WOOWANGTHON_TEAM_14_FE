import { describe, expect, it } from "vitest";
import { classifyFile, isKakaoChat } from "./materials";

const pc = "--------------- 2026년 4월 2일 목요일 ---------------\n[회장] [오후 7:45] 회비 걷어요\n[총무] [오후 7:46] 네\n[부원] [오후 7:50] 입금했어요";
const mobileDots = "2026. 4. 2. 오후 7:45, 회장 : 회비 걷어요\n2026. 4. 2. 오후 7:46, 총무 : 네\n2026. 4. 2. 오후 7:50, 부원 : 입금했어요";
const mobileKo = "2026년 4월 2일 오후 7:45, 회장 : 회비 걷어요\n2026년 4월 2일 오후 7:46, 총무 : 네\n2026년 4월 2일 오후 7:50, 부원 : 입금했어요";
const rules = "제1조(회비) 회비는 매월 말 정산한다.\n제2조(코트) 코트 대관은 학교 체육시설과에 신청한다.";

const file = (name: string, body: string) => new File([body], name, { type: "text/plain" });

describe("isKakaoChat: 카톡 내보내기 파일인지 내용으로 알아본다", () => {
  it("PC 형식과 모바일 두 형식을 카톡 대화로 본다", () => {
    expect(isKakaoChat(pc)).toBe(true);
    expect(isKakaoChat(mobileDots)).toBe(true);
    expect(isKakaoChat(mobileKo)).toBe(true);
  });

  it("회칙 같은 일반 글이나 빈 글은 카톡 대화가 아니다", () => {
    expect(isKakaoChat(rules)).toBe(false);
    expect(isKakaoChat("")).toBe(false);
  });

  it("대화처럼 보이는 줄이 한두 개뿐이면 카톡 대화로 보지 않는다", () => {
    expect(isKakaoChat("[회장] [오후 7:45] 회비 걷어요\n" + rules)).toBe(false);
  });
});

describe("classifyFile: 올린 파일을 문서와 카톡 대화로 나눈다", () => {
  it("PDF는 항상 문서다", async () => {
    expect(await classifyFile(new File(["x"], "회칙.pdf", { type: "application/pdf" }))).toBe("문서");
  });

  it("TXT는 내용이 카톡 대화면 카톡 대화, 아니면 문서다", async () => {
    expect(await classifyFile(file("a.txt", pc))).toBe("카톡 대화");
    expect(await classifyFile(file("회칙.txt", rules))).toBe("문서");
  });

  it("이름에 카카오톡·카톡이 들어 있으면 내용이 짧아도 카톡 대화로 본다", async () => {
    expect(await classifyFile(file("카카오톡 대화 - 테니스.txt", "짧음"))).toBe("카톡 대화");
    expect(await classifyFile(file("KakaoTalk_Chat_2026.txt", "짧음"))).toBe("카톡 대화");
  });
});
