import { ByuAccountType, Prisma } from 'prisma/client';
import { userService } from '../../services/user/user.ts';
import {
  GetUsersRequest,
  GetUsersResponse,
  DeleteUserRequest,
  DeleteUserResponse,
  GetUserRequest,
  GetUserResponse,
  CreateUserResponse,
  CreateUserRequest,
  addRolesToUserRequest,
  addRolesToUserResponse,
} from './user-management.types.ts';
import { DEFAULT_ROLE } from '../api.roles.ts';
import { byuApi, keycloakApi } from '@fhss-web-team/backend-utils/apis';
import { endpoint } from '@fhss-web-team/backend-utils/endpoint';

export const getUsers = endpoint.get('/')<GetUsersRequest, GetUsersResponse>(async data => {
  // Checks input account type
  let acctTypes;
  if (data.query?.account_types) {
    try {
      const typeStrings: string[] | undefined = data.query?.account_types
        ? data.query.account_types.split(',')
        : undefined;
      acctTypes = typeStrings?.map(typeString => {
        const type = Object.values(ByuAccountType).find(type => type.toLowerCase() === typeString.toLowerCase());
        if (!type) throw new Error(`Account type '${typeString}' does not exist`);
        return type;
      });
    } catch (err) {
      return {
        error: {
          code: 'INVALID_REQUEST',
          message: (err as Error).message,
        },
        status: 400,
      };
    }
  }

  // Checks input dates
  const created_after = data.query?.created_after ? new Date(data.query?.created_after) : undefined;
  const created_before = data.query?.created_before ? new Date(data.query?.created_before) : undefined;
  if ((created_after && isNaN(created_after.valueOf())) || (created_before && isNaN(created_before.valueOf()))) {
    return {
      error: {
        code: 'INVALID_REQUEST',
        message: 'Invalid date given',
      },
      status: 400,
    };
  }

  // Checks input sort parameters
  if (data.query?.sort_direction && !data.query.sort_by) {
    return {
      status: 400,
      error: {
        code: 'INVALID_REQUEST',
        message: `If 'sort_direction' is provided in request, 'sort_by' must also be specified`,
      },
    };
  }
  const canSortBy = ['netId', 'accountType', 'preferredFirstName', 'preferredLastName', 'created'];
  if (!canSortBy.includes(data.query?.sort_by ?? 'err')) {
    return {
      status: 400,
      error: {
        code: 'INVALID_REQUEST',
        message: `Invalid sort property: ${data.query?.sort_by}`,
      },
    };
  }
  if (data.query?.sort_direction && !(data.query.sort_direction === 'asc' || data.query.sort_direction === 'desc')) {
    return {
      status: 400,
      error: {
        code: 'INVALID_REQUEST',
        message: `Invalid sort direction: ${data.query?.sort_direction}`,
      },
    };
  }

  // Checks input pagination parameters
  const count = data.query?.page_count ? parseInt(data.query?.page_count, 10) : undefined;
  const offset = data.query?.page_offset ? parseInt(data.query?.page_offset, 10) : undefined;
  if (count !== undefined && isNaN(count)) {
    return {
      status: 400,
      error: {
        code: 'INVALID_REQUEST',
        message: `Invalid pagination count input: '${data.query?.page_count}'`,
      },
    };
  }
  if (offset !== undefined && isNaN(offset)) {
    return {
      status: 400,
      error: {
        code: 'INVALID_REQUEST',
        message: `Invalid pagination offset input: '${data.query?.page_offset}'`,
      },
    };
  }

  // Get the total count of users
  const totalCount = await userService.getUsersCount({
    filter: {
      search: data.query?.search,
      accountTypes: acctTypes,
      createdAt: {
        start: created_after,
        end: created_before,
      },
    }
  })

  // Gets user data
  const users = await userService.getUsers({
    paginate: { count, offset },
    filter: {
      search: data.query?.search,
      accountTypes: acctTypes,
      createdAt: {
        start: created_after,
        end: created_before,
      },
    },
    sort: {
      property: data.query?.sort_by,
      direction: data.query?.sort_direction
    },
  });

  // Formats user data and requests keycloak roles
  const userData = users.map(async user => ({
    id: user.id,
    netId: user.netId,
    accountType: user.accountType,
    preferredFirstName: user.preferredFirstName,
    preferredLastName: user.preferredLastName,
    created: user.createdAt.toISOString(),
    roles: (await keycloakApi.getUserAppRoles(user.keycloakId)).map(role => role.name),
  }));

  // Finishes all requests and returns formatted data
  return {
    body: {
      totalCount,
      data: await Promise.all(userData),
    }
  };
});

export const getUser = endpoint.get('/:userId')<GetUserRequest, GetUserResponse>(async data => {
  const user = await userService.getUser({ userId: data.params.userId });
  if (!user) {
    return {
      error: {
        code: 'NOT_FOUND',
      },
      status: 404,
    };
  }

  const roles = await keycloakApi.getUserAppRoles(user.keycloakId);

  return {
    body: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      roles: roles.map(role => role.name),
    },
  };
});

export const deleteUser = endpoint.delete('/:userId')<DeleteUserRequest, DeleteUserResponse>(async data => {
  try {
    await userService.deleteUser(data.params.userId);
    return { status: 204 };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2015') {
      return {
        error: { code: 'NOT_FOUND' },
        status: 404,
      };
    }
    throw err;
  }
});

export const createUser = endpoint.post('/:netId')<CreateUserRequest, CreateUserResponse>(async data => {
  try {
    const role = await keycloakApi.getAppRole(data.query?.role_name ?? DEFAULT_ROLE);
    if (!role) {
      return {
        status: 400,
        error: { message: `Role '${data.query?.role_name}' does not exist` },
      };
    }

    const acct = (await byuApi.getBasicAccountsByNetId(data.params.netId))[0];
    if (!acct) {
      return {
        status: 400,
        error: { message: `Account '${data.params.netId}' does not exist` },
      };
    }

    const user = await userService.createUser(acct, role);

    return {
      body: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        roles: [role.name],
      },
    };
  } catch (err) {
    // P2002 means that the query failed unique property constraint. ie: it already exists
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return {
        error: { code: 'CONFLICT' },
        status: 409,
      };
    }
    throw err;
  }
});

export const addRolesToUser = endpoint.put('/:userId/roles')<addRolesToUserRequest, addRolesToUserResponse>(
  async data => {
    if (!data.query?.role_names) {
      return {
        status: 400,
        error: { message: 'No roles requested' },
      };
    }

    const user = await userService.getUser({ userId: data.params.userId });
    if (!user) {
      return {
        status: 400,
        error: { message: 'Specified user does not exist' },
      };
    }

    const roleNames = new Set(data.query.role_names.split(','));
    const allRoles = await keycloakApi.getAppRoles();
    const roles = allRoles.filter(role => roleNames.has(role.name));

    if (roles.length !== roleNames.size) {
      return {
        status: 400,
        error: {
          message: `Invalid role name(s) given: ${roleNames.difference(new Set(roles.map(role => role.name)))}`,
        },
      };
    }

    await keycloakApi.addRolesToUser(user.keycloakId, roles);

    return {
      body: {
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        roles: roles.map(role => role.name),
      },
    };
  }
);
