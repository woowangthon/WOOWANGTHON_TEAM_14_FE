import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../lib/SessionContext";
import { ORG_TYPES, validateSetup, type SetupErrors, type SetupValues } from "../lib/setup";

const EMPTY: SetupValues = { orgName: "", orgType: "", department: "", giver: "", receiver: "" };

const lineInput =
  "w-full rounded-none border-0 border-b border-black bg-transparent py-2 text-lg tracking-[-0.015em] placeholder:text-neutral-700";
const labelClass = "text-xs text-neutral-900";

function ErrorLine({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} role="alert" className="text-sm">
      <b className="underline underline-offset-4">(오류)</b> {message}
    </p>
  );
}

export default function StartPage() {
  const { session, start } = useSession();
  const navigate = useNavigate();
  const [values, setValues] = useState<SetupValues>(session ?? EMPTY);
  const [errors, setErrors] = useState<SetupErrors>({});

  const set = <K extends keyof SetupValues>(key: K, value: SetupValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    const result = validateSetup(values);
    setErrors(result.errors);
    if (result.clean) {
      start(result.clean);
      navigate("/upload");
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-10">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="text-[clamp(26px,4vw,40px)] font-medium leading-[1.08] tracking-[-0.035em]">시작하기</h2>
          <p className="text-[clamp(18px,2.6vw,26px)] font-light tracking-[-0.03em]">
            어느 조직의 어떤 업무를 인수인계하나요
          </p>
        </div>
        <div aria-hidden="true" className="sticker sticker-perf w-[9.2em] text-[11px]">
          <span>List of missing things</span>
          <i className="text-[0.62em] font-normal normal-case not-italic tracking-normal opacity-85">@handoff</i>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3 md:items-end">
        <div className="flex flex-col gap-0.5">
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
          {errors.orgName && <ErrorLine id="orgName-error" message={errors.orgName} />}
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className={labelClass}>조직 종류</legend>
          <div className="flex flex-wrap pt-1">
            {ORG_TYPES.map((type) => (
              <label
                key={type}
                className={`-mr-px cursor-pointer border border-black px-3.5 py-2 text-sm ${
                  values.orgType === type ? "bg-black text-white" : "bg-transparent"
                }`}
              >
                <input
                  type="radio"
                  name="orgType"
                  value={type}
                  checked={values.orgType === type}
                  onChange={() => set("orgType", type)}
                  className="sr-only"
                />
                {type}
              </label>
            ))}
          </div>
          {errors.orgType && <ErrorLine message={errors.orgType} />}
        </fieldset>

        <div className="flex flex-col gap-0.5">
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
            aria-describedby={errors.department ? "department-error" : undefined}
          />
          {errors.department && <ErrorLine id="department-error" message={errors.department} />}
        </div>
      </div>

      <div className="grid gap-8 sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <label htmlFor="giver" className={labelClass}>
            전임자 이름 (선택)
          </label>
          <input id="giver" className={lineInput} value={values.giver} onChange={(e) => set("giver", e.target.value)} />
        </div>
        <div className="flex flex-col gap-0.5">
          <label htmlFor="receiver" className={labelClass}>
            후임자 이름 (선택)
          </label>
          <input
            id="receiver"
            className={lineInput}
            value={values.receiver}
            onChange={(e) => set("receiver", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="rounded-[2px] border border-black bg-black px-6 py-2.5 text-sm text-white transition-colors hover:bg-white hover:text-black"
        >
          시작하기
        </button>
        <span className="text-xs text-neutral-900">
          <b className="font-bold">빠진 것</b>까지 인수인계
        </span>
      </div>
    </form>
  );
}
