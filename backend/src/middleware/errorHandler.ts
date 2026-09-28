import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AppError } from "../lib/errors";
import { logger } from "../lib/logger";
import { isProd } from "../config/env";

/**
 * Middleware final de erro.
 * Converte exceções em respostas padronizadas { error: { code, message, details? } }.
 * Stack trace só é registrada no servidor — nunca devolvida ao cliente.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Erro de validação Zod
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Dados inválidos.",
        details: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
  }

  // Erro de aplicação
  if (err instanceof AppError) {
    if (err.status >= 500) {
      logger.error({ err, path: req.path, method: req.method }, "AppError 5xx");
    }
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  // Erros conhecidos do Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      return res.status(409).json({
        error: { code: "CONFLICT", message: "Registro duplicado." },
      });
    }
    if (err.code === "P2025") {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "Registro não encontrado." },
      });
    }
  }

  // Erro inesperado
  logger.error({ err, path: req.path, method: req.method }, "Erro não tratado");
  return res.status(500).json({
    error: {
      code: "INTERNAL_ERROR",
      message: "Erro interno do servidor.",
      // detalhe técnico apenas fora de produção, para diagnóstico local
      details: isProd ? undefined : String(err instanceof Error ? err.message : err),
    },
  });
}

/** Handler 404 para rotas de API não encontradas. */
export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `Rota não encontrada: ${req.method} ${req.path}` },
  });
}
