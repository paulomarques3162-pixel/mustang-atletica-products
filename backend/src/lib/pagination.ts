export interface PaginationParams {
  page: number;
  perPage: number;
  skip: number;
  take: number;
}

export function parsePagination(query: Record<string, unknown>, defaultPerPage = 12): PaginationParams {
  const pageRaw = Number(query.page ?? 1);
  const perPageRaw = Number(query.perPage ?? defaultPerPage);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const perPage = Number.isFinite(perPageRaw) && perPageRaw > 0
    ? Math.min(Math.floor(perPageRaw), 60)
    : defaultPerPage;
  return { page, perPage, skip: (page - 1) * perPage, take: perPage };
}

export function paginated<T>(items: T[], total: number, params: PaginationParams) {
  return {
    items,
    meta: {
      page: params.page,
      perPage: params.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.perPage)),
    },
  };
}
