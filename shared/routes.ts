import { z } from 'zod';

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

const projectFileResponseSchema = z.object({
  id: z.number(),
  projectId: z.number(),
  originalFileName: z.string(),
  originalFilePath: z.string().nullable().optional(),
  processedFilePath: z.string().nullable().optional(),
  status: z.string(),
  silenceThreshold: z.number(),
  minSilenceDuration: z.number(),
  outputFormat: z.string().optional(),
  fileType: z.string().nullable().optional(),
  fileSizeBytes: z.number().nullable().optional(),
  originalDurationSec: z.number().nullable().optional(),
  processedDurationSec: z.number().nullable().optional(),
  processingTimeMs: z.number().nullable().optional(),
  processingProgress: z.number().nullable().optional(),
  createdAt: z.string().nullable(),
});

const projectResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  userId: z.string().nullable().optional(),
  isFavorite: z.boolean().nullable().optional(),
  silenceThreshold: z.number().optional(),
  minSilenceDuration: z.number().optional(),
  outputFormat: z.string().optional(),
  createdAt: z.string().nullable(),
  files: z.array(projectFileResponseSchema).optional(),
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
      input: z.object({
        name: z.string().min(1),
        silenceThreshold: z.number().optional(),
        minSilenceDuration: z.number().optional(),
        outputFormat: z.string().optional(),
      }),
      responses: {
        201: projectResponseSchema,
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/projects/:id',
      input: z.object({
        name: z.string().optional(),
        isFavorite: z.boolean().optional(),
        silenceThreshold: z.number().optional(),
        minSilenceDuration: z.number().optional(),
        outputFormat: z.string().optional(),
      }),
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

export type ProjectResponse = z.infer<typeof projectResponseSchema>;
export type ProjectFileResponse = z.infer<typeof projectFileResponseSchema>;
export type ProjectsListResponse = z.infer<typeof api.projects.list.responses[200]>;
