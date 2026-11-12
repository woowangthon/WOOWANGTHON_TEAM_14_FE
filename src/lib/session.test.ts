import { afterEach, describe, expect, it, vi } from "vitest";
import { clearSession, loadSession, saveSession } from "./session";
import type { SetupValues } from "./setup";

const values: SetupValues = {
  orgName: "학생회",
  orgType: "학생회",
  department: "회계부",
  giver: "김전임",
  receiver: "이후임",
};

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("세션 보관", () => {
  it("저장한 값을 다시 불러올 수 있다", () => {
    saveSession(values);

    expect(loadSession()).toEqual(values);
  });

  it("저장된 값이 없으면 null이다", () => {
    expect(loadSession()).toBeNull();
  });

  it("지우면 다시 null이 된다", () => {
    saveSession(values);
    clearSession();

    expect(loadSession()).toBeNull();
  });

  it("저장된 내용이 깨져 있으면 null로 처리한다", () => {
    sessionStorage.setItem("missing-page-session", "{깨진 json");

    expect(loadSession()).toBeNull();
  });

  it("필수 항목이 빠진 값은 쓰지 않는다", () => {
    sessionStorage.setItem("missing-page-session", JSON.stringify({ orgName: "학생회" }));

    expect(loadSession()).toBeNull();
  });

  it("브라우저 저장소를 못 써도 오류 없이 동작한다", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("저장소 막힘");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("저장소 막힘");
    });

    expect(() => saveSession(values)).not.toThrow();
    expect(loadSession()).toBeNull();
  });
});
