import { RegisterFlow } from "./register-flow.js";
import type { RegisterFlowSubmitClient, RegisterFlowSubmitResult } from "./register-flow-model.js";
import type { AuthPortalRole } from "./unified-auth-types.js";

export interface RegisterFormProps {
  selectedRole: AuthPortalRole | null;
  onRequestLogin: () => void;
  submitClient?: RegisterFlowSubmitClient | undefined;
  onEnterDashboard?: ((path: string) => void) | undefined;
  onRegisterSuccess?: ((result: RegisterFlowSubmitResult) => void) | undefined;
}

export function RegisterForm({
  selectedRole,
  onRequestLogin,
  submitClient,
  onEnterDashboard,
  onRegisterSuccess
}: RegisterFormProps): JSX.Element {
  return (
    <RegisterFlow
      onEnterDashboard={onEnterDashboard}
      onRegisterSuccess={onRegisterSuccess}
      onRequestLogin={onRequestLogin}
      selectedRole={selectedRole}
      submitClient={submitClient}
    />
  );
}
