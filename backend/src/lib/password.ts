import bcrypt from "bcryptjs";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Avalia força mínima da senha — retorna lista de problemas. */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < 8) issues.push("A senha deve ter ao menos 8 caracteres.");
  if (!/[A-Za-z]/.test(password)) issues.push("A senha deve conter letras.");
  if (!/\d/.test(password)) issues.push("A senha deve conter números.");
  return issues;
}
