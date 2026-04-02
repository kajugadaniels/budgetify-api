import { BadRequestException } from '@nestjs/common';

const DAY_MS = 24 * 60 * 60 * 1000;

type DateRangeQuery = {
  month?: number;
  year?: number;
  dateFrom?: string;
  dateTo?: string;
};

type SearchableOption = {
  value: string;
  label: string;
};

export type ResolvedListDateRange = {
  dateFrom: Date;
  dateTo: Date;
  isoDates: string[];
};

export function normalizeListSearch(search?: string): string | undefined {
  const normalized = search?.trim();

  if (!normalized || normalized.length < 3) {
    return undefined;
  }

  return normalized;
}

export function resolveListDateRange(
  query: DateRangeQuery,
): ResolvedListDateRange | undefined {
  if (query.dateFrom || query.dateTo) {
    const resolvedDateFrom = query.dateFrom ?? query.dateTo;
    const resolvedDateTo = query.dateTo ?? query.dateFrom;

    if (!resolvedDateFrom || !resolvedDateTo) {
      return undefined;
    }

    const dateFrom = parseDateOnly(resolvedDateFrom);
    const endDate = parseDateOnly(resolvedDateTo);

    if (dateFrom.getTime() > endDate.getTime()) {
      throw new BadRequestException(
        'dateFrom must be before or equal to dateTo.',
      );
    }

    const dateTo = addDays(endDate, 1);

    return {
      dateFrom,
      dateTo,
      isoDates: buildIsoDates(dateFrom, dateTo),
    };
  }

  if (query.month === undefined && query.year === undefined) {
    return undefined;
  }

  const now = new Date();
  const resolvedYear = query.year ?? now.getUTCFullYear();
  const resolvedMonthIndex = (query.month ?? now.getUTCMonth() + 1) - 1;
  const dateFrom = new Date(Date.UTC(resolvedYear, resolvedMonthIndex, 1));
  const dateTo = new Date(Date.UTC(resolvedYear, resolvedMonthIndex + 1, 1));

  return {
    dateFrom,
    dateTo,
    isoDates: buildIsoDates(dateFrom, dateTo),
  };
}

export function findMatchingOptionValues<T extends SearchableOption>(
  options: readonly T[],
  search?: string,
): T['value'][] {
  const normalizedSearch = normalizeSearchQueryValue(search);

  if (!normalizedSearch) {
    return [];
  }

  return options
    .filter((option) =>
      [option.label, option.value].some((value) =>
        normalizeSearchQueryValue(value)?.includes(normalizedSearch),
      ),
    )
    .map((option) => option.value);
}

function normalizeSearchQueryValue(value?: string): string | undefined {
  const normalized = value
    ?.trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');

  return normalized && normalized.length > 0 ? normalized : undefined;
}

function buildIsoDates(dateFrom: Date, dateTo: Date): string[] {
  const dates: string[] = [];

  for (
    let cursor = new Date(dateFrom);
    cursor.getTime() < dateTo.getTime();
    cursor = addDays(cursor, 1)
  ) {
    dates.push(toIsoDate(cursor));
  }

  return dates;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    throw new BadRequestException(
      'Date filters must use the YYYY-MM-DD ISO format.',
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException(
      'One of the provided date filters is invalid.',
    );
  }

  return parsed;
}
