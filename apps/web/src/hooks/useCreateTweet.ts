import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tweetsApi } from "@/api/client";
import type { CreateTweetInput } from "@pulse/shared";

/** Hook para crear un tweet e invalidar el timeline y los tweets de perfil. */
export function useCreateTweet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTweetInput) => tweetsApi.create(input),
    onSuccess: async () => {
      // Invalidar timeline, feed explore y tweets de cualquier perfil
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        queryClient.invalidateQueries({ queryKey: ["explore"] }),
        queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === "userTweets",
        }),
      ]);
    },
  });
}
