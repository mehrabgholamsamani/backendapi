import { z } from "zod";

const roleSchema = z.enum(["user", "admin"]);
const rolesSchema = z
  .array(roleSchema)
  .min(1)
  .refine((roles) => new Set(roles).size === roles.length, {
    message: "Roles must be unique"
  });

export const userIdParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid()
  })
});

export const updateUserRolesSchema = userIdParamsSchema.extend({
  body: z.object({
    roles: rolesSchema
  })
});

export const updateUserStatusSchema = userIdParamsSchema.extend({
  body: z.object({
    isDisabled: z.boolean()
  })
});
