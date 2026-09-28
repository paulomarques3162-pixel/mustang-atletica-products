/**
 * Erros de aplicação com status HTTP e código.
 * Nenhuma stack trace é enviada ao cliente — apenas mensagem amigável.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const BadRequest = (msg = "Requisição inválida", details?: unknown) =>
  new AppError(400, "BAD_REQUEST", msg, details);

export const Unauthorized = (msg = "Não autenticado") =>
  new AppError(401, "UNAUTHORIZED", msg);

export const Forbidden = (msg = "Acesso negado") =>
  new AppError(403, "FORBIDDEN", msg);

export const NotFound = (msg = "Recurso não encontrado") =>
  new AppError(404, "NOT_FOUND", msg);

export const Conflict = (msg = "Conflito de dados") =>
  new AppError(409, "CONFLICT", msg);

export const UnprocessableEntity = (msg = "Entidade não processável", details?: unknown) =>
  new AppError(422, "UNPROCESSABLE_ENTITY", msg, details);

export const TooManyRequests = (msg = "Muitas requisições. Tente novamente em instantes.") =>
  new AppError(429, "TOO_MANY_REQUESTS", msg);

export const InternalError = (msg = "Erro interno do servidor") =>
  new AppError(500, "INTERNAL_ERROR", msg);
