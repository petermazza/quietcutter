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

const projectResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  originalFileName: z.string(),
  originalFilePath: z.string().nullable().optional(),
  processedFilePath: z.string().nullable().optional(),
  status: z.string(),
  userId: z.string().nullable().optional(),
  isFavorite: z.boolean().nullable().optional(),
  silenceThreshold: z.number(),
  minSilenceDuration: z.number(),
  outputFormat: z.string().optional(),
  fileType: z.string().nullable().optional(),
  fileSizeBytes: z.number().nullable().optional(),
  originalDurationSec: z.number().nullable().optional(),
  processedDurationSec: z.number().nullable().optional(),
  processingTimeMs: z.number().nullable().optional(),
  createdAt: z.string().nullable(),
});

export const api = {
  projects: {
    list: {
      method: 'GET' as const,
      path: '/api/projects',
      responses: {
        200: z.array(projectResponseSchema),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/projects/:id',
      responses: {
        200: projectResponseSchema,
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/projects',
      input: insertProjectSchema,
      responses: {
        201: projectResponseSchema,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/projects/:id',
      input: insertProjectSchema.partial(),
      responses: {
        200: projectResponseSchema,
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
