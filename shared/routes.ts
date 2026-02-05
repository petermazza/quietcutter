import { z } from 'zod';
import { insertProjectSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          name: z.string(),
          originalFileName: z.string(),
          status: z.string(),
          silenceThreshold: z.number(),
          minSilenceDuration: z.number(),
          createdAt: z.date().nullable(),
        })),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id',
      responses: {
        200: z.object({
          id: z.number(),
          name: z.string(),
          originalFileName: z.string(),
          status: z.string(),
          silenceThreshold: z.number(),
          minSilenceDuration: z.number(),
          createdAt: z.date().nullable(),
        }),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects',
      input: insertProjectSchema,
      responses: {
        201: z.object({
          id: z.number(),
          name: z.string(),
          originalFileName: z.string(),
          status: z.string(),
          silenceThreshold: z.number(),
          minSilenceDuration: z.number(),
          createdAt: z.date().nullable(),
        }),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/projects/:id',
      input: insertProjectSchema.partial(),
      responses: {
        200: z.object({
          id: z.number(),
          name: z.string(),
          originalFileName: z.string(),
          status: z.string(),
          silenceThreshold: z.number(),
          minSilenceDuration: z.number(),
          createdAt: z.date().nullable(),
        }),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/projects/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type ProjectInput = z.infer<typeof api.projects.create.input>;
export type ProjectResponse = z.infer<typeof api.projects.create.responses[201]>;
export type ProjectUpdateInput = z.infer<typeof api.projects.update.input>;
export type ProjectsListResponse = z.infer<typeof api.projects.list.responses[200]>;
