import { ByuAccountType } from 'prisma/client';

export type UserQuery = {
  netId?: string;
  byuId?: string;
  userId?: string;
  keycloakId?: string;
};

export type UsersQuery = {
  filter?: FilterOptions;
  sort?: SortOptions;
  paginate?:PaginateOptions;
};

type FilterOptions = {
  search?: string;
  accountTypes?: ByuAccountType[];
  createdAt?: DateRange;
  updatedAt?: DateRange;
};

type SortOptions = {
  property?: SortProperty
  direction?: SortDirection
};

type PaginateOptions = {
  offset?: number;
  count?: number;
}

export type SortProperty = 'netId' | 'accountType' | 'preferredFirstName' | 'preferredLastName' | 'created'
export type SortDirection = 'desc' | 'asc';
type DateRange = {
  start?: Date;
  end?: Date;
};
