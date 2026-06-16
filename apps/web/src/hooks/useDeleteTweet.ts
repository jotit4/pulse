import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tweetsApi } from "@/api/client";

/** Hook para borrar un tweet e invalidar el timeline. */
export function useDeleteTweet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tweetId: string) => tweetsApi.delete(tweetId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["timeline"] });
    },
  });
}
