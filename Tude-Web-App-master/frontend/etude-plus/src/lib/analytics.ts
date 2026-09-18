// Analytics outbound calls are disabled until a Supabase analytics Edge Function
// is deployed. The correct target URL will be:
//   VITE_API_URL + /analytics/event  (customFetch strips /api/ automatically)
// Re-enable by removing the early return below once the function is live.

export function trackEvent(_eventType: string, _eventData?: Record<string, any>) {
  // no-op until /analytics/event Supabase function is deployed
}
