import { z } from "zod";

export const TWEET_MAX_LENGTH = 280;

export const createTweetSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "El tweet no puede estar vacío")
    .max(TWEET_MAX_LENGTH, `El tweet no puede superar los ${TWEET_MAX_LENGTH} caracteres`),
});

export type CreateTweetInput = z.infer<typeof createTweetSchema>;
