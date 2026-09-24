import { z } from 'zod';

export const askBody = z.object({
  question: z.string().trim().min(1).max(1000),
});
