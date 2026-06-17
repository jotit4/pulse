import { useMutation, useQueryClient } from "@tanstack/react-query";
import { repliesApi } from "@/api/client";

/** Hook para enviar una respuesta a un tweet. Invalida replies y el thread. */
export function useReply(tweetId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => repliesApi.reply(tweetId, content),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["replies", tweetId] }),
        queryClient.invalidateQueries({ queryKey: ["thread", tweetId] }),
        queryClient.invalidateQueries({ queryKey: ["timeline"] }),
        queryClient.invalidateQueries({ queryKey: ["explore"] }),
      ]);
    },
  });
}
