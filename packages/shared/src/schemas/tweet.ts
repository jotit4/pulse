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

/** Schema Zod para validar el payload de un TweetView (ej: eventos SSE). */
export const tweetViewSchema = z.object({
  id: z.string(),
  content: z.string(),
  createdAt: z.string(),
  author: z.object({
    id: z.string(),
    username: z.string(),
    name: z.string(),
    avatarUrl: z.string().nullable(),
  }),
  likesCount: z.number(),
  likedByMe: z.boolean(),
});
