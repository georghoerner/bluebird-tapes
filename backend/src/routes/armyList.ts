import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { PrismaClient, UnitDesignation } from '@prisma/client';
import { CreateArmyListSchema, CreateArmyListInput } from '../schemas/armyList.js';
import { ZodError } from 'zod';

const prisma = new PrismaClient();

export async function armyListRoutes(fastify: FastifyInstance) {
  // Create a new army list
  fastify.post('/api/lists', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = CreateArmyListSchema.parse(request.body);

      const armyList = await prisma.armyList.create({
        data: {
          faction: body.faction,
          name: body.name,
          pointCap: body.pointCap,
          commandPoints: body.commandPoints,
          armyKey: body.armyKey || null,
          tacticalGroups: {
            create: body.tacticalGroups.map((group, groupIndex) => ({
              groupName: group.groupName,
              groupFunction: group.groupFunction,
              groupNumber: group.groupNumber,
              sortOrder: group.sortOrder ?? groupIndex,
              units: {
                create: group.units.map((unit, unitIndex) => ({
                  designation: unit.designation as UnitDesignation | null,
                  unitName: unit.unitName,
                  pointCost: unit.pointCost,
                  tacomDesignation: unit.tacomDesignation,
                  sortOrder: unit.sortOrder ?? unitIndex,
                })),
              },
            })),
          },
        },
        include: {
          tacticalGroups: {
            include: {
              units: {
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      return reply.status(201).send({
        id: armyList.id,
        url: `/list/${armyList.id}`,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.issues,
        });
      }
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Get an army list by ID
  fastify.get('/api/lists/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const armyList = await prisma.armyList.findUnique({
        where: { id },
        include: {
          tacticalGroups: {
            include: {
              units: {
                orderBy: { sortOrder: 'asc' },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      if (!armyList) {
        return reply.status(404).send({ error: 'Army list not found' });
      }

      return reply.send(armyList);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  // Health check
  fastify.get('/api/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return reply.send({ status: 'healthy', database: 'connected' });
    } catch {
      return reply.status(503).send({ status: 'unhealthy', database: 'disconnected' });
    }
  });
}
