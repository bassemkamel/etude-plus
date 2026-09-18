import { customFetch } from "./custom-fetch";

export * from "./generated/api";
export * from "./generated/api.schemas";
export { saveToken, clearToken, getToken, TOKEN_KEY, customFetch } from "./custom-fetch";

// ── Auth helpers not yet in the generated client ──────────────────────────────
// These routes were added to the Supabase auth function after the OpenAPI spec
// was last generated. They go through customFetch so URL mapping and auth-token
// injection happen in one place, exactly like the generated functions.

export interface SendCodeRequest { email: string }
export interface SendCodeResponse { success: boolean; message: string; devCode?: string }

export interface VerifyCodeRequest { email: string; code: string }
export interface VerifyCodeResponse { success: boolean; verified: boolean }

export interface ChangePasswordRequest { currentPassword: string; newPassword: string }
export interface ChangePasswordResponse { success: boolean }

export const sendCode = (
  data: SendCodeRequest,
  options?: RequestInit,
): Promise<SendCodeResponse> =>
  customFetch<SendCodeResponse>("/api/auth/send-code", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(data),
  });

export const verifyCode = (
  data: VerifyCodeRequest,
  options?: RequestInit,
): Promise<VerifyCodeResponse> =>
  customFetch<VerifyCodeResponse>("/api/auth/verify-code", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(data),
  });

export const changePassword = (
  data: ChangePasswordRequest,
  options?: RequestInit,
): Promise<ChangePasswordResponse> =>
  customFetch<ChangePasswordResponse>("/api/auth/change-password", {
    ...options,
    method: "POST",
    headers: { "Content-Type": "application/json", ...options?.headers },
    body: JSON.stringify(data),
  });
