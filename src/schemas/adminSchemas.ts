import { z } from "zod";

const roleSchema = z.enum(["user", "admin"]);

export const userIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

export const updateUserRolesSchema = userIdParamsSchema.extend({
  body: z.object({
    roles: z.array(roleSchema).min(1)
  })
});

export const updateUserStatusSchema = userIdParamsSchema.extend({
  body: z.object({
    isDisabled: z.boolean()
  })
});
