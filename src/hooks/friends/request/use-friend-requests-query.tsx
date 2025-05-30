import { FRIENDS_API } from "@/lib/apiEndpoints";
import { FriendRequestsApiResponse } from "@/types";
import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";

async function getFriendRequests({ pageParam }: { pageParam?: unknown }) {
  const response = await axios.get(FRIENDS_API.GET_FRIEND_REQUESTS(pageParam));
  return response.data;
}

function useFriendRequestQuery() {
  const {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery<FriendRequestsApiResponse>({
    queryKey: ["getFriendRequests"],
    queryFn: getFriendRequests,
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.meta.nextCursor,
  });
  return {
    data,
    isLoading,
    isError,
    error,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
}

export default useFriendRequestQuery;
