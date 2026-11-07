export type SearchParams = Record<string, string | string[] | undefined>;

export async function readQuery(searchParams: Promise<SearchParams> | SearchParams): Promise<SearchParams> {
  return await searchParams;
}

export function one(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}
