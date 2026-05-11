import type { NextFunction, Request, Response } from "express";
import type { ZodSchema } from "zod";

type ParsedRequest = Partial<Pick<Request, "body" | "params" | "query">>;

export const validateRequest =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request payload",
          details: result.error.flatten()
        }
      });
    }

    const parsed = result.data as ParsedRequest;
    if (parsed.body !== undefined) {
      req.body = parsed.body;
    }
    if (parsed.params !== undefined) {
      req.params = parsed.params;
    }
    if (parsed.query !== undefined) {
      req.query = parsed.query;
    }

    next();
  };
