import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodTypeAny, z } from "zod";

interface Schemas {
  body?: ZodTypeAny;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

/**
 * Valida body/query/params com Zod e substitui pelos valores tipados.
 * O frontend nunca é fonte de verdade: tudo é revalidado aqui.
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) req.query = schemas.query.parse(req.query) as Request["query"];
      if (schemas.params) req.params = schemas.params.parse(req.params) as Request["params"];
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

/** Helper para validar objeto solto dentro de serviços. */
export function parseWith<T extends ZodTypeAny>(schema: T, value: unknown): z.infer<T> {
  return schema.parse(value);
}
