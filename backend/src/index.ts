import Fastify from 'fastify';
import cors from '@fastify/cors';
import { armyListRoutes } from './routes/armyList.js';

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
      },
    },
  },
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
});

// Register routes
await fastify.register(armyListRoutes);

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001', 10);
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  BLUEBIRD BACKEND v1.0 - DREKFORT M.D.C. API SERVER              ║
║  Listening on ${host}:${port}                                         ║
╚══════════════════════════════════════════════════════════════════╝
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
