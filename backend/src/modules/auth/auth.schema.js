import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    alias: z.string().min(3).max(30),
    email: z.string().email(),
    password: z.string().min(8),
    nombre: z.string().optional(),
    ciudad: z.string().optional(),
    pais: z.string().optional(),
    consentimientos: z.record(z.any()),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});
