export type UserType = "ADMIN" | "TEACHER" | "STUDENT";

export type AuthUser = {
  id: string;
  sessionId: string;
  email: string;
  username?: string | null;
  fullName: string;
  type: UserType;
  campusId?: string | null;
  campusGroupId?: string | null;
  assignments: {
    id: string;
    role: "STPO" | "CTPO" | "HTPO";
    permissions: string[];
  }[];
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
};
