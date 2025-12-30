export const AUTH_USER_KEY = "authUser";

export type Role = "admin" | "viewer";
export type AuthUser = { email: string; role: Role };

export type AuthContextValue = {
  user: AuthUser | null;
  isReady: boolean;
  isAuthed: boolean;
  loginSuccess: (user: AuthUser) => void;
  logout: () => Promise<void>;
};
