/**
 * IPD module — API client (slice 0: health probe only).
 */
import { api } from '@/integrations/api/client';

export type IpdHealthResponse = {
  status: string;
  module: string;
  version: string;
  timestamp: string;
};

export async function getIpdHealth(): Promise<IpdHealthResponse> {
  return api.get<IpdHealthResponse>('/api/v1/ipd/health');
}
