export type RoleName = "USER" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: RoleName;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionId?: string;
    }
  }
}
