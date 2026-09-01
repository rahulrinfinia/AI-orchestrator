import type { FastifyInstance } from 'fastify';
import { NPM_PACKAGE_VERSION } from '../../config/env.js';
import { IPD_API_BASE } from './ipd.constants.js';

export async function ipdRoutes(fastify: FastifyInstance) {
  fastify.get(
    `${IPD_API_BASE}/health`,
    {
      schema: {
        tags: ['IPD'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              module: { type: 'string' },
              version: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async () => ({
      status: 'ok',
      module: 'ipd',
      version: NPM_PACKAGE_VERSION,
      timestamp: new Date().toISOString(),
    }),
  );
}
