import { z } from 'zod';

export const apiRoleSchema = z.enum(['operator', 'maintenance']);

export type ApiRole = z.infer<typeof apiRoleSchema>;

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(100),
  password: z.string().min(6).max(255),
  display_name: z.string().trim().max(255).optional(),
  role: apiRoleSchema,
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(255),
});

export type LoginInput = z.infer<typeof loginSchema>;
