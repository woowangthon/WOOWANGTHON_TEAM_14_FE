import { ORG_TYPES, type SetupValues } from "./setup";

const KEY = "missing-page-session";

function isSetupValues(value: unknown): value is SetupValues {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.orgName === "string" &&
    v.orgName.trim() !== "" &&
    typeof v.orgType === "string" &&
    (ORG_TYPES as readonly string[]).includes(v.orgType) &&
    typeof v.department === "string" &&
    v.department.trim() !== "" &&
    typeof v.giver === "string" &&
    typeof v.receiver === "string"
  );
}

// 브라우저 저장소는 막혀 있을 수 있다(시크릿 창 등). 어떤 경우에도 화면이 깨지지 않게 감싼다.
export function loadSession(): SetupValues | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isSetupValues(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveSession(values: SetupValues): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(values));
  } catch {
    // 저장하지 못해도 이번 화면에서는 계속 쓸 수 있다
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
