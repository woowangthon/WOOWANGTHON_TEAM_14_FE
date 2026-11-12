import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { defaultApi } from "../api";
import type { Api } from "../api/types";
import { FolderStack } from "../components/Folders";
import { useSession } from "../lib/SessionContext";
import {
  ORG_TYPES,
  validateSetup,
  type SetupErrors,
  type SetupValues,
} from "../lib/setup";

const EMPTY: SetupValues = {
  orgName: "",
  orgType: "",
  department: "",
  giver: "",
  receiver: "",
};

const lineInput =
  "w-full rounded-2xl border border-transparent bg-[#f3f3f6] px-4 py-2.5 text-base tracking-[-0.015em] placeholder:text-[#9a9aa4] focus:border-[#1c1c22] focus:bg-white focus:outline-none";
const labelClass = "px-1 text-[13px] text-[#6b6b75]";

function ErrorLine({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} role="alert" className="text-sm">
      <b className="underline underline-offset-4">(오류)</b> {message}
    </p>
  );
}

export default function StartPage({ api = defaultApi }: { api?: Api }) {
  const { session, start } = useSession();
  const navigate = useNavigate();
  const [values, setValues] = useState<SetupValues>(session ?? EMPTY);
  const [errors, setErrors] = useState<SetupErrors>({});
  // 처음에는 폴더만 보이고, 시작하기를 누르면 입력칸이 나온다. 다시 설정할 때는 처음부터 열려 있다.
  const [open, setOpen] = useState(session !== null);

  const set = <K extends keyof SetupValues>(key: K, value: SetupValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!open) {
      setOpen(true);
      return;
    }
    const result = validateSetup(values);
    setErrors(result.errors);
    if (result.clean) {
      void api.startSession?.(result.clean); // 서버가 있으면 새 작업을 연다. 첫 업로드가 이 일을 기다린다.
      start(result.clean);
      navigate("/upload");
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex w-full flex-col gap-5">
      <h2 className="sr-only">시작하기</h2>
      <p className="text-center text-base font-light tracking-[-0.02em] text-[#55555f]">
        {open
          ? "어느 조직의 어떤 업무를 인수인계하나요"
          : "전임이 확정한 것만 후임에게 전해요"}
      </p>

      {open && (
        <div className="animate-[reveal_.35s_ease-out] mx-auto flex w-full max-w-2xl flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="orgName" className={labelClass}>
                조직 이름
              </label>
              <input
                id="orgName"
                className={lineInput}
                placeholder="예: 테니스 동아리, 총학생회"
                value={values.orgName}
                onChange={(e) => set("orgName", e.target.value)}
                aria-invalid={errors.orgName ? true : undefined}
                aria-describedby={errors.orgName ? "orgName-error" : undefined}
              />
              {errors.orgName && (
                <ErrorLine id="orgName-error" message={errors.orgName} />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="department" className={labelClass}>
                업무 부서 (담당 역할)
              </label>
              <input
                id="department"
                className={lineInput}
                placeholder="예: 총무, 회계부, 홍보부"
                value={values.department}
                onChange={(e) => set("department", e.target.value)}
                aria-invalid={errors.department ? true : undefined}
                aria-describedby={
                  errors.department ? "department-error" : undefined
                }
              />
              {errors.department && (
                <ErrorLine id="department-error" message={errors.department} />
              )}
            </div>
          </div>
        </div>
      )}

      <FolderStack
        startHint={
          open
            ? "입력을 마쳤다면 눌러서 시작해요"
            : "누르면 조직과 담당 업무를 물어봐요. 전임이 확정한 내용만 후임에게 가요"
        }
      />
    </form>
  );
}
