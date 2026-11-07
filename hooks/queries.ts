'use client';
import { useQuery } from '@tanstack/react-query';
import { service } from '@/services/investigations';
export const useCases = (params: Record<string, string | number | undefined> = {}) =>
  useQuery({ queryKey: ['cases', params], queryFn: () => service.cases(params) });
export const useCase = (id: string) =>
  useQuery({ queryKey: ['case', id], queryFn: () => service.case(id), enabled: !!id });
export const useDashboard = () =>
  useQuery({ queryKey: ['dashboard'], queryFn: service.dashboard, refetchInterval: 30000 });
export const useSnapshot = (id: string, run?: string) =>
  useQuery({
    queryKey: ['snapshot', id, run],
    queryFn: () => service.snapshot(id, run),
    enabled: !!id,
    refetchInterval: (query) =>
      ['QUEUED', 'PROCESSING'].includes(query.state.data?.run?.status || '') ? 3000 : false,
  });
