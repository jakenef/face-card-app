import { describe, it } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";

import { deleteUser, getUser } from "./user-management.ts";
import { stub } from '@std/testing/mock';
import { userService } from '../../services/user/user.ts';
import { generateDummyUserData } from '../../dummy-data/helpers/dummy-user.ts';
import { Prisma } from 'prisma/client';
import { keycloakApi } from '@fhss-web-team/backend-utils/apis';

describe("User Management Route", () => {
  const user = generateDummyUserData('Student')

  describe('Delete User', () => {
    it('Deletes a user', async () => {
      using serviceStub = stub(userService, 'deleteUser', () => {
        return Promise.resolve(user)
      })

      const res = await deleteUser.handler({
        params: { userId: user.id },
        query: null,
        body: null,
        requester: null
      })

      expect(res.status).toEqual(204)
      expect(serviceStub.calls).toHaveLength(1)
    })

    it('Returns 404 if user not found', async () => {
      using serviceStub = stub(userService, 'deleteUser', () => {
        throw new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2015', clientVersion: 'idk bro'})
      })

      const res = await deleteUser.handler({
        params: { userId: user.id },
        query: null,
        body: null,
        requester: null
      })

      expect(res.status).toBe(404)
      expect(serviceStub.calls).toHaveLength(1)
    })
  })

  describe('Get User', () => {
    it('returns the user', async () => {
      using serviceStub = stub(userService, 'getUser', () => {
        return Promise.resolve(user)
      })

      using keycloakStub = stub(keycloakApi, 'getUserAppRoles', () => Promise.resolve([]));

      const res = await getUser.handler({
        params: { userId: user.id},
        query: null,
        body: null,
        requester: null
      })

      expect(res).toEqual({
        body: {
          ...user,
          roles: [],
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
        },
      })
      expect(serviceStub.calls).toHaveLength(1)
      expect(keycloakStub.calls).toHaveLength(1)
    })
    
    it('returns 404 if user not found', async () => {
      using serviceStub = stub(userService, 'getUser', () => {
        return Promise.resolve(null)
      })

      const res = await getUser.handler({
        params: { userId: user.id},
        query: null,
        body: null,
        requester: null
      })

      expect(res.status).toEqual(404)
      expect(serviceStub.calls).toHaveLength(1)
    })
  })
})