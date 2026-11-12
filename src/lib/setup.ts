export const ORG_TYPES = ["동아리", "학생회", "학과·학부", "연구실", "기타"] as const;
export type OrgType = (typeof ORG_TYPES)[number];

/** 시작 화면에서 받는 값. 조직 이름·종류·업무 부서가 필수이고 전임·후임 이름은 선택이다. */
export interface SetupValues {
  orgName: string;
  orgType: OrgType | "";
  department: string;
  giver: string;
  receiver: string;
}

export type SetupErrors = Partial<Record<"orgName" | "orgType" | "department", string>>;

export interface SetupResult {
  errors: SetupErrors;
  clean: SetupValues | null;
}

export function validateSetup(values: SetupValues): SetupResult {
  const clean: SetupValues = {
    orgName: values.orgName.trim(),
    orgType: values.orgType,
    department: values.department.trim(),
    giver: values.giver.trim(),
    receiver: values.receiver.trim(),
  };

  const errors: SetupErrors = {};
  if (!clean.orgName) errors.orgName = "조직 이름을 입력해 주세요";
  if (!clean.orgType) errors.orgType = "조직 종류를 골라 주세요";
  if (!clean.department) errors.department = "업무 부서(담당 역할)를 입력해 주세요";

  return Object.keys(errors).length > 0 ? { errors, clean: null } : { errors, clean };
}
