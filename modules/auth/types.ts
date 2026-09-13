export type UserRole = "USER" | "ADMIN";
export type UserStatus = "PENDING" | "APPROVED" | "REJECTED" | "BLOCKED";

export type AuthUser = {
  id: number;
  name?: string | null;
  email: string;
  picture?: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at?: string | null;
  last_login_at?: string | null;
};

export type GoogleLoginResponse = {
  status: UserStatus;
  message: string;
  user: AuthUser;
  access_token?: string | null;
  token_type?: "bearer" | null;
};

export type AuthSessionResponse = {
  user: AuthUser;
};

export type AdminUserStatusUpdateRequest = {
  status: UserStatus;
};

