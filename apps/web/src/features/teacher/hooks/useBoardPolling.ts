import { useQuery } from "@tanstack/react-query";
import { api, type Board } from "@/shared/api";

export function useBoardPolling(assignmentId: string | undefined) {
  return useQuery<Board>({
    queryKey: ["board", assignmentId],
    queryFn: () => api.getBoard(assignmentId!),
    enabled: Boolean(assignmentId),
    refetchInterval: 2500,
  });
}
