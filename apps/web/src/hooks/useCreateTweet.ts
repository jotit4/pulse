import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tweetsApi } from "@/api/client";
import type { CreateTweetInput } from "@pulse/shared";

/** Hook para crear un tweet e invalidar el timeline. */
export function useCreateTweet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTweetInput) => tweetsApi.create(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
