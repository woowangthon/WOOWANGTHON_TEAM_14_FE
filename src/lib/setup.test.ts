import { describe, expect, it } from "vitest";
import { ORG_TYPES, validateSetup, type SetupValues } from "./setup";

const valid: SetupValues = {
  orgName: "테니스 동아리",
  orgType: "동아리",
  department: "총무",
  giver: "",
  receiver: "",
};

describe("validateSetup: 시작 화면 입력 규칙", () => {
  it("필수 항목이 모두 있으면 오류 없이 정리된 값을 돌려준다", () => {
    const result = validateSetup(valid);

    expect(result.errors).toEqual({});
    expect(result.clean).toEqual(valid);
  });

  it("조직 이름이 비어 있으면 오류다", () => {
    const result = validateSetup({ ...valid, orgName: "" });

    expect(result.errors.orgName).toBe("조직 이름을 입력해 주세요");
    expect(result.clean).toBeNull();
  });

  it("공백만 입력해도 비어 있는 것으로 본다", () => {
    const result = validateSetup({ ...valid, orgName: "   ", department: "  " });

    expect(result.errors.orgName).toBeDefined();
    expect(result.errors.department).toBeDefined();
  });

  it("업무 부서가 비어 있으면 오류다", () => {
    const result = validateSetup({ ...valid, department: "" });

    expect(result.errors.department).toBe("업무 부서(담당 역할)를 입력해 주세요");
  });

  it("조직 종류를 고르지 않아도 오류가 아니고 '기타'로 채워진다", () => {
    const result = validateSetup({ ...valid, orgType: "" });

    expect(result.errors).toEqual({});
    expect(result.clean?.orgType).toBe("기타");
  });

  it("앞뒤 공백은 지우고, 전임·후임 이름은 비워 두어도 된다", () => {
    const result = validateSetup({ ...valid, orgName: "  학생회  ", orgType: "학생회", department: " 회계부 ", giver: " 김전임 " });

    expect(result.clean).toEqual({
      orgName: "학생회",
      orgType: "학생회",
      department: "회계부",
      giver: "김전임",
      receiver: "",
    });
  });

  it("조직 종류에는 동아리와 학생회가 들어 있다", () => {
    expect(ORG_TYPES).toContain("동아리");
    expect(ORG_TYPES).toContain("학생회");
  });
});
