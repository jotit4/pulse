import { useMutation, useQueryClient } from "@tanstack/react-query";
import { tweetsApi } from "@/api/client";

/** Hook para borrar un tweet e invalidar el timeline y los tweets de perfil. */
export function useDeleteTweet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tweetId: string) => tweetsApi.delete(tweetId),
    onSuccess: async () => {
      // Fix #2: invalidar tanto el timeline global como los tweets de cualquier perfil
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        queryClient.invalidateQueries({
          predicate: (q) => q.queryKey[0] === "userTweets",
        }),
      ]);
    },
  });
}
