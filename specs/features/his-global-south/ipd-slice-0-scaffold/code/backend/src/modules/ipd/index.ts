import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';
import { ipdRoutes } from './ipd.routes.js';

const ipdPlugin: FastifyPluginAsync = async (fastify) => {
  await ipdRoutes(fastify);
};

export default fp(ipdPlugin, { name: 'ipd' });
