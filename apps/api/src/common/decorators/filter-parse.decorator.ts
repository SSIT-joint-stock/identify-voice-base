import {
  createParamDecorator,
  ExecutionContext,
  UnprocessableEntityException,
} from '@nestjs/common';
import dayjs from 'dayjs';
import type { Request } from 'express';
import { z, ZodObject } from 'zod';

//
// 🔹 Default query schema (pagination + sorting)
//
export const DefaultUserQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  sortBy: z.string().optional(),
  sort_by: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type DefaultUserQueryType = z.infer<typeof DefaultUserQuerySchema>;

//
// 🔹 Options type
//
interface FilterParseOptions<TSchema extends ZodObject<any>> {
  schema: TSchema;
  allowGetBetweenDate?: boolean;
  allowPagination?: boolean;
  allowSorting?: boolean;
  allowedSortBy?: string[];
  defaultSortBy: string;
  defaultSort: 'asc' | 'desc';
  rangeFields?: string[];
  searchBy?: string[];
  searchKey?: string; // default 'q'
  listFields?: string[];
  relationCountSorts?: Record<string, string>;
}

// helpers:
const toNum = (v: unknown) => {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function foldMinMax(
  where: Record<string, any>,
  data: Record<string, any>,
  fields: string[],
) {
  for (const f of fields) {
    const min = toNum(data[`min_${f}`]);
    const max = toNum(data[`max_${f}`]);
    if (min != null || max != null) {
      where[f] = {
        ...(min != null ? { gte: min } : {}),
        ...(max != null ? { lte: max } : {}),
      };
    }
    delete (data as any)[`min_${f}`];
    delete (data as any)[`max_${f}`];
  }
}

//
// 🔹 Infer filters type from schema
//
export type InferFilters<TSchema extends ZodObject<any>> = z.infer<TSchema>;

//
// 🔹 Return type
//
export interface FilterParseResult<TFilters extends Record<string, any>> {
  page: number;
  limit: number;
  filters: Partial<TFilters>;
  prismaQuery: {
    where: any;
    skip: number;
    take: number;
    orderBy: any;
  };
}

//
// 🔹 Decorator factory
//
export const FilterParse = <TSchema extends ZodObject<any>>(
  options: FilterParseOptions<TSchema>,
) =>
  createParamDecorator(
    (
      data: unknown,
      ctx: ExecutionContext,
    ): FilterParseResult<InferFilters<TSchema>> => {
      const request = ctx.switchToHttp().getRequest<Request>();
      const query = request.query;

      // ✅ Merge default + custom schema
      const finalSchema = DefaultUserQuerySchema.merge(options.schema);
      // ✅ Validate
      const parsed = finalSchema.safeParse(query);
      if (!parsed.success) {
        throw new UnprocessableEntityException(parsed.error.format());
      }

      // ✅ Type of validated query now includes BOTH parts
      const validatedQuery = parsed.data as DefaultUserQueryType &
        InferFilters<TSchema>;

      const result = {} as FilterParseResult<InferFilters<TSchema>>;
      const filters = {} as Record<string, any>;

      const qKey = options.searchKey ?? 'q';

      //
      // ✅ Pagination
      //
      if (options.allowPagination) {
        const page = parseInt(validatedQuery.page ?? '1', 10);
        const limit = parseInt(validatedQuery.limit ?? '10', 10);
        result.page = isNaN(page) || page < 1 ? 1 : page;
        result.limit = isNaN(limit) || limit < 1 ? 10 : limit;
      } else {
        result.page = 1;
        result.limit = 10;
      }

      //
      // ✅ Extract filters (exclude reserved keys)
      //
      (
        Object.keys(validatedQuery) as Array<keyof typeof validatedQuery>
      ).forEach((key) => {
        const k = String(key);
        if (
          ![
            'page',
            'limit',
            'sort',
            'sortBy',
            'sort_by',
            'startDate',
            'endDate',
          ].includes(k) &&
          !k.startsWith('min_') &&
          !k.startsWith('max_') &&
          k !== 'created_at' &&
          k !== qKey
        ) {
          filters[k] = validatedQuery[key];
        }
      });

      // ✅ Map min_/max_ thành range Prisma
      if (options.rangeFields?.length) {
        foldMinMax(filters, validatedQuery, options.rangeFields);
      }

      if (options.searchBy?.length) {
        const qVal = (validatedQuery as any)[qKey] as string | undefined;
        if (qVal && qVal.trim().length) {
          const or = options.searchBy.map((field) => ({
            [field]: { contains: qVal, mode: 'insensitive' as const },
          }));
          if (filters.OR?.length) {
            filters.OR = [...filters.OR, ...or];
          } else {
            filters.OR = or;
          }
        }
      }

      if (options.allowGetBetweenDate) {
        const dateFilter: Record<string, any> = {};
        if (validatedQuery.startDate) {
          dateFilter.gte = dayjs(validatedQuery.startDate).toDate();
        }
        if (validatedQuery.endDate) {
          dateFilter.lte = dayjs(validatedQuery.endDate).endOf('day').toDate();
        }
        if (Object.keys(dateFilter).length > 0) {
          filters.created_at = dateFilter;
        }
      }

      if (options.listFields?.length) {
        for (const field of options.listFields) {
          const val = (validatedQuery as any)[field];
          if (typeof val === 'string') {
            const arr = val
              .split(',')
              .map((v) => v.trim())
              .filter(Boolean);

            if (field === 'categories') {
              if (arr.length) {
                filters[field] = {
                  some: {
                    id: {
                      in: arr,
                    },
                  },
                };
              } else {
                delete filters[field];
              }
            } else {
              filters[field] = arr;
            }
          }
        }
      }

      //
      // ✅ Sorting
      //
      const orderBy: any = [];
      const orderDirection = validatedQuery.sort ?? options.defaultSort;
      const sortBy =
        validatedQuery.sort_by ??
        validatedQuery.sortBy ??
        options.defaultSortBy;

      if (options.allowSorting && sortBy) {
        const allowedSorts = [
          ...(options.allowedSortBy ?? []),
          ...(options.relationCountSorts
            ? Object.keys(options.relationCountSorts)
            : []),
        ];

        if (allowedSorts.includes(sortBy)) {
          if (options.relationCountSorts?.[sortBy]) {
            orderBy.push({
              [options.relationCountSorts[sortBy]]: {
                _count: orderDirection,
              },
            });
          } else {
            orderBy.push({
              [sortBy]: orderDirection,
            });
          }
        } else {
          throw new UnprocessableEntityException(
            `Invalid sortBy field: ${sortBy}`,
          );
        }
      }

      result.filters = filters as Partial<InferFilters<TSchema>>;
      result.prismaQuery = {
        where: filters,
        skip: (result.page - 1) * result.limit,
        take: result.limit,
        orderBy,
      };

      return result;
    },
  )();
