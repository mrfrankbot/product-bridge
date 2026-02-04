export type UserError = {
  code: string;
  message: string;
  suggestion?: string;
  details?: string;
};

export function asUserError(err: unknown, fallback: UserError): UserError {
  if (typeof err === "object" && err && "code" in err && "message" in err) {
    return err as UserError;
  }
  return fallback;
}