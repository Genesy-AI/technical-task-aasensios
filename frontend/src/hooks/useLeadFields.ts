import { useQuery } from '@tanstack/react-query'
import { api } from '../api'

// The backend's field registry; it only changes on deploy, so fetch it once per session
export const useLeadFields = () =>
  useQuery({
    queryKey: ['leads', 'fields'],
    queryFn: async () => api.leads.getFields(),
    staleTime: Infinity,
  })
