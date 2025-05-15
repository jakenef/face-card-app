import { Route } from '@fhss-web-team/backend-utils/endpoint';
import { getUsers, getUser, deleteUser, createUser } from './user-management/user-management.ts';
import { authCallback } from "./auth/auth.ts";

export const routes: Route[] = [
	{
		path: "/auth",
		endpoints: [{ data: authCallback, allowedRoles: 'PUBLIC ENDPOINT' }]
	},
  {
    path: '/user-management',
    endpoints: [
      { data: getUsers, allowedRoles: ['admin'] },
      { data: getUser, allowedRoles: ['admin'] },
      { data: deleteUser, allowedRoles: ['admin'] },
      { data: createUser, allowedRoles: ['admin'] },
    ],
  },
];
