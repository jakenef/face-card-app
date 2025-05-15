import { User } from 'prisma/client';
import { SortDirection, SortProperty } from '../../services/user/user.types.ts';
import { RequestData, ResponseData } from '@fhss-web-team/backend-utils/endpoint';

type FormattedUser = Omit<User, 'updatedAt' | 'createdAt'> & { createdAt: string; updatedAt: string; roles: string[] };

export type GetUsersRequest = RequestData<
  {
    search?: string;
    account_types?: string;
    created_after?: string;
    created_before?: string;
    sort_by?: SortProperty;
    sort_direction?: SortDirection;
    page_count?: string;
    page_offset?: string;
  },
  null
>;
export type GetUsersResponse = ResponseData<
{
  totalCount: number,
  data: {
    id: string;
    netId: string;
    accountType: string;
    preferredFirstName: string;
    preferredLastName: string;
    roles: string[];
    created: string;
  }[]
}  
>;

export type GetUserRequest = RequestData<null, null>;
export type GetUserResponse = ResponseData<FormattedUser | null>;

export type DeleteUserRequest = RequestData<null, null>;
export type DeleteUserResponse = ResponseData<null>;

export type CreateUserRequest = RequestData<{ role_name: string }, null>;
export type CreateUserResponse = ResponseData<FormattedUser>;

export type addRolesToUserRequest = RequestData<{ role_names: string }, null>;
export type addRolesToUserResponse = ResponseData<FormattedUser>;
