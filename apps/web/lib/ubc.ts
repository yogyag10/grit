const UBC_STUDENT_EMAIL = /^[^@\s]+@student\.ubc\.ca$/;

export function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

/** Only verified UBC student addresses can sign up. The database enforces the same rule. */
export function isUbcStudentEmail(email: string): boolean {
  return UBC_STUDENT_EMAIL.test(email);
}
