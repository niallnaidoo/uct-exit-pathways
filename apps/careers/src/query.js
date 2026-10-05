/** TanStack Query client + query keys for the Careers app. */
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0, retry: 1, refetchOnWindowFocus: true } },
});

export const qk = {
  settings: () => ['settings'],
  careers: () => ['careers'],
  events: () => ['events'],
  programme: () => ['programme'],
};
