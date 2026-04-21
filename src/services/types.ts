import type { RegistryCatalogItem } from "../domain/registry.js";

export type PaginatedResult<T> = {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
    nextOffset?: number;
    items: T[];
};

export type ListRegistryItemsParams = {
    kind?: string;
    query?: string;
    limit?: number;
    offset?: number;
};

export type ListRegistryItemsResult = Promise<{
    availableKinds: string[];
} & PaginatedResult<RegistryCatalogItem>>;

export type SearchRegistryItemsParams = {
    query: string;
    kind?: string;
    limit?: number;
    offset?: number;
};

export type SearchRegistryItemsResult = Promise<{
    query: string;
    availableKinds: string[];
} & PaginatedResult<RegistryCatalogItem>>;

export type GetRegistryItemOption =
    | "includeSource"
    | "includeExamples"
    | "includeRelated";

export type GetRegistryItemOptions = Partial<
    Record<GetRegistryItemOption, boolean>
>;

export type GetRegistryItemParams = {
    name: string;
    options?: GetRegistryItemOptions;
};


export type FilterCatalogOptions = Partial<{
    kind: string;
    query: string;
}>;

export type FilterCatalogParams = {
    catalog: RegistryCatalogItem[];
    options?: FilterCatalogOptions;
};

export type PaginateItemsOptions<T> = Partial<
    Pick<PaginatedResult<T>, "limit" | "offset">
>;

export type PaginateItemsParams<T> = {
    items: T[];
    options?: PaginateItemsOptions<T>;
};

export type PaginateItemsResult<T> = Omit<PaginatedResult<T>, "total">;

export type BuildFilesSourceOptions = Array<{
    content: string;
    path?: string;
}>;
