import { useQuery } from "@tanstack/react-query";
import { repliesApi } from "@/api/client";

/** Hook para obtener el tweet + su padre desde /thread. */
export function useTweetDetail(tweetId: string) {
  return useQuery({
    queryKey: ["thread", tweetId],
    queryFn: () => repliesApi.thread(tweetId),
    enabled: !!tweetId,
  });
}
