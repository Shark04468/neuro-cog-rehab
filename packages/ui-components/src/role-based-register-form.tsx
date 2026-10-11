import { ConsentCheckbox } from "./consent-checkbox.js";
import {
  getPasswordStrength,
  type PasswordStrengthLevel,
  type RegisterFlowInput,
  type RegisterFlowStep
} from "./register-flow-model.js";
import { getRoleOption } from "./unified-auth-model.js";
import type { AuthValidationIssue } from "./unified-auth-types.js";

export interface RoleBasedRegisterFormProps {
  input: RegisterFlowInput;
  step: RegisterFlowStep;
  issues: AuthValidationIssue[];
  onChange: (patch: Partial<RegisterFlowInput>) => void;
}

export function RoleBasedRegisterForm({
  input,
  step,
  issues,
  onChange
}: RoleBasedRegisterFormProps): JSX.Element {
  return (
    <section className="ncr-register-card" aria-labelledby={`register-step-${step.id}`}>
      <div className="ncr-register-card__head">
        <p>Register Step</p>
        <h3 id={`register-step-${step.id}`}>{step.title}</h3>
        <span>{step.description}</span>
      </div>

      {issues.length > 0 ? (
        <div className="ncr-auth-error" role="alert">
          {issues.map((issue) => issue.message).join(" ")}
        </div>
      ) : null}

      {renderStepContent(input, step, onChange)}
    </section>
  );
}

function renderStepContent(
  input: RegisterFlowInput,
  step: RegisterFlowStep,
  onChange: (patch: Partial<RegisterFlowInput>) => void
): JSX.Element {
  if (!input.role) {
    return <div className="ncr-auth-hint">请先在左侧选择注册身份。</div>;
  }

  if (step.id === "profile") {
    return renderProfileStep(input, onChange);
  }

  if (step.id === "account") {
    return renderAccountStep(input, onChange);
  }

  if (step.id === "guardian") {
    return renderGuardianStep(input, onChange);
  }

  if (step.id === "qualification") {
    return renderQualificationStep(input, onChange);
  }

  if (step.id === "consent") {
    return renderConsentStep(input, onChange);
  }

  return renderReviewStep(input);
}

function renderProfileStep(
  input: RegisterFlowInput,
  onChange: (patch: Partial<RegisterFlowInput>) => void
): JSX.Element {
  if (input.role === "trainee") {
    return (
      <div className="ncr-register-grid">
        <TextField
          label="昵称"
          onChange={(nickname) => onChange({ nickname })}
          placeholder="例如：小林"
          value={input.nickname}
        />
        <SelectField
          label="年龄段"
          onChange={(ageRange) => onChange({ ageRange })}
          options={[
            { label: "请选择", value: "" },
            { label: "8-10 岁", value: "8-10" },
            { label: "11-13 岁", value: "11-13" },
            { label: "14-16 岁", value: "14-16" }
          ]}
          value={input.ageRange}
        />
        <div className="ncr-register-note ncr-register-field--full">
          未成年人注册需要监护人确认。本系统仅用于辅助训练、状态评估、训练记录和趋势分析。
        </div>
      </div>
    );
  }

  if (input.role === "parent") {
    return (
      <div className="ncr-register-grid">
        <TextField
          label="姓名或称呼"
          onChange={(parentName) => onChange({ parentName })}
          placeholder="请输入称呼"
          value={input.parentName}
        />
        <TextField
          label="联系方式"
          onChange={(parentContact) => onChange({ parentContact })}
          placeholder="手机号或邮箱"
          value={input.parentContact}
        />
        <TextField
          className="ncr-register-field--full"
          label="与训练用户关系"
          onChange={(relationshipToTrainee) => onChange({ relationshipToTrainee })}
          placeholder="例如：母亲、父亲、监护人"
          value={input.relationshipToTrainee}
        />
      </div>
    );
  }

  if (input.role === "therapist") {
    return (
      <div className="ncr-register-grid">
        <TextField
          label="姓名"
          onChange={(therapistName) => onChange({ therapistName })}
          placeholder="请输入姓名"
          value={input.therapistName}
        />
        <TextField
          label="所属机构"
          onChange={(institutionName) => onChange({ institutionName })}
          placeholder="请输入机构名称"
          value={input.institutionName}
        />
        <TextField
          label="职位"
          onChange={(therapistPosition) => onChange({ therapistPosition })}
          placeholder="例如：康复治疗师"
          value={input.therapistPosition}
        />
        <TextField
          label="工号或邀请码"
          onChange={(staffInviteCode) => onChange({ staffInviteCode })}
          placeholder="请输入工号或邀请码"
          value={input.staffInviteCode}
        />
      </div>
    );
  }

  return (
    <div className="ncr-register-grid">
      <TextField
        className="ncr-register-field--full"
        label="机构名称"
        onChange={(organizationName) => onChange({ organizationName })}
        placeholder="请输入机构名称"
        value={input.organizationName}
      />
      <TextField
        label="管理员姓名"
        onChange={(adminName) => onChange({ adminName })}
        placeholder="请输入管理员姓名"
        value={input.adminName}
      />
      <TextField
        label="联系方式"
        onChange={(adminContact) => onChange({ adminContact })}
        placeholder="手机号或邮箱"
        value={input.adminContact}
      />
      <TextField
        className="ncr-register-field--full"
        label="机构邀请码"
        onChange={(organizationInviteCode) => onChange({ organizationInviteCode })}
        placeholder="请输入机构邀请码"
        value={input.organizationInviteCode}
      />
    </div>
  );
}

function renderAccountStep(
  input: RegisterFlowInput,
  onChange: (patch: Partial<RegisterFlowInput>) => void
): JSX.Element {
  const strength = getPasswordStrength(input.password);

  return (
    <div className="ncr-register-grid">
      <TextField
        className="ncr-register-field--full"
        label="账号"
        onChange={(account) => onChange({ account })}
        placeholder="账号、手机号或邮箱"
        value={input.account}
      />
      <PasswordField
        label="密码"
        onChange={(password) => onChange({ password })}
        placeholder="至少 6 位"
        value={input.password}
      />
      <PasswordField
        label="确认密码"
        onChange={(confirmPassword) => onChange({ confirmPassword })}
        placeholder="再次输入密码"
        value={input.confirmPassword}
      />
      <PasswordStrength strength={strength} />
    </div>
  );
}

function renderGuardianStep(
  input: RegisterFlowInput,
  onChange: (patch: Partial<RegisterFlowInput>) => void
): JSX.Element {
  return (
    <div className="ncr-register-grid">
      <TextField
        className="ncr-register-field--full"
        label="监护人联系方式"
        onChange={(guardianContact) => onChange({ guardianContact })}
        placeholder="手机号或邮箱"
        value={input.guardianContact}
      />
      <div className="ncr-register-field--full">
        <ConsentCheckbox
          checked={input.guardianConsent}
          description="我确认本次注册已获得监护人同意，并理解训练过程中可随时暂停。"
          helperText="该确认只用于训练安全和授权记录，不用于诊断判断。"
          onChange={(guardianConsent) => onChange({ guardianConsent })}
          title="监护人同意确认"
        />
      </div>
    </div>
  );
}

function renderQualificationStep(
  input: RegisterFlowInput,
  onChange: (patch: Partial<RegisterFlowInput>) => void
): JSX.Element {
  return (
    <div className="ncr-register-grid">
      <label className="ncr-auth-field ncr-register-field--full">
        <span>资质信息占位字段</span>
        <textarea
          className="ncr-auth-input ncr-register-textarea"
          onChange={(event) => onChange({ qualificationNote: event.target.value })}
          placeholder="后续可对接资质材料上传、审核状态或机构认证接口"
          value={input.qualificationNote}
        />
      </label>
    </div>
  );
}

function renderConsentStep(
  input: RegisterFlowInput,
  onChange: (patch: Partial<RegisterFlowInput>) => void
): JSX.Element {
  return (
    <ConsentCheckbox
      checked={input.informedConsent}
      description="我已阅读并同意隐私协议、知情同意说明和数据使用范围。"
      helperText="系统仅用于辅助训练、状态评估、训练记录和趋势分析，不作为临床诊断或治疗替代工具。"
      onChange={(informedConsent) => onChange({ informedConsent })}
      title="知情同意与隐私说明"
    />
  );
}

function renderReviewStep(input: RegisterFlowInput): JSX.Element {
  const roleLabel = input.role ? getRoleOption(input.role).label : "未选择";
  const items = buildReviewItems(input, roleLabel);

  return (
    <div className="ncr-review-list">
      {items.map((item) => (
        <div key={item.label}>
          <dt>{item.label}</dt>
          <dd>{item.value || "未填写"}</dd>
        </div>
      ))}
    </div>
  );
}

function buildReviewItems(input: RegisterFlowInput, roleLabel: string) {
  const common = [
    { label: "注册身份", value: roleLabel },
    { label: "账号", value: input.account },
    { label: "知情同意", value: input.informedConsent ? "已勾选" : "未勾选" }
  ];

  if (input.role === "trainee") {
    return [
      { label: "昵称", value: input.nickname },
      { label: "年龄段", value: input.ageRange },
      { label: "监护人联系方式", value: input.guardianContact },
      { label: "监护人同意", value: input.guardianConsent ? "已确认" : "未确认" },
      ...common
    ];
  }

  if (input.role === "parent") {
    return [
      { label: "姓名或称呼", value: input.parentName },
      { label: "联系方式", value: input.parentContact },
      { label: "与训练用户关系", value: input.relationshipToTrainee },
      ...common
    ];
  }

  if (input.role === "therapist") {
    return [
      { label: "姓名", value: input.therapistName },
      { label: "所属机构", value: input.institutionName },
      { label: "职位", value: input.therapistPosition },
      { label: "工号或邀请码", value: input.staffInviteCode },
      { label: "资质信息", value: input.qualificationNote },
      ...common
    ];
  }

  return [
    { label: "机构名称", value: input.organizationName },
    { label: "管理员姓名", value: input.adminName },
    { label: "联系方式", value: input.adminContact },
    { label: "机构邀请码", value: input.organizationInviteCode },
    ...common
  ];
}

function TextField(props: {
  label: string;
  value: string;
  placeholder: string;
  className?: string;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className={`ncr-auth-field ${props.className ?? ""}`.trim()}>
      <span>{props.label}</span>
      <input
        className="ncr-auth-input"
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        value={props.value}
      />
    </label>
  );
}

function PasswordField(props: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="ncr-auth-field">
      <span>{props.label}</span>
      <input
        autoComplete="new-password"
        className="ncr-auth-input"
        onChange={(event) => props.onChange(event.target.value)}
        placeholder={props.placeholder}
        type="password"
        value={props.value}
      />
    </label>
  );
}

function SelectField(props: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="ncr-auth-field">
      <span>{props.label}</span>
      <select
        className="ncr-auth-select"
        onChange={(event) => props.onChange(event.target.value)}
        value={props.value}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function PasswordStrength(props: {
  strength: {
    level: PasswordStrengthLevel;
    score: number;
    label: string;
    helperText: string;
  };
}): JSX.Element {
  return (
    <div
      className="ncr-password-strength ncr-register-field--full"
      data-level={props.strength.level}
    >
      <div>
        <span>密码强度</span>
        <strong>{props.strength.label}</strong>
      </div>
      <div className="ncr-password-strength__meter" aria-hidden="true">
        <span style={{ width: `${(props.strength.score / 3) * 100}%` }} />
      </div>
      <p>{props.strength.helperText}</p>
    </div>
  );
}
