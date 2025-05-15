import { describe, it } from 'jsr:@std/testing/bdd';
import { stub } from '@std/testing/mock';
import { expect } from 'jsr:@std/expect';

import { userService } from './user.ts';
import { ByuAccountType, Prisma, prisma, User } from 'prisma/client';
import { KeycloakRole, KeycloakUser, keycloakApi } from '@fhss-web-team/backend-utils/apis';
import { faker } from '@faker-js/faker';
import { byuAccountService } from '@fhss-web-team/backend-utils/services';
import { DEFAULT_ROLE } from '../../routes/api.roles.ts';
import { dummy } from '@fhss-web-team/backend-utils/dummy';

describe('User Service', () => {
  const userAcct = dummy.accounts.generate(ByuAccountType.Student, 1)[0];
  const userKc: KeycloakUser = {
    id: faker.string.uuid(),
    username: userAcct.netId,
    firstName: userAcct.firstName,
    lastName: userAcct.lastName,
    email: `${userAcct.netId}@byu.edu`,
    enabled: true,
    emailVerified: true,
    realmRoles: [DEFAULT_ROLE],
  };
  const user: User = {
    id: faker.string.uuid(),
    createdAt: new Date(),
    updatedAt: new Date(),
    accountType: ByuAccountType.Student,
    netId: userAcct.netId,
    byuId: userAcct.byuId!,
    workerId: null,
    firstName: userAcct.firstName,
    middleName: userAcct.middleName,
    lastName: userAcct.lastName,
    suffix: null,
    preferredFirstName: userAcct.preferredFirstName,
    preferredLastName: userAcct.preferredLastName,
    keycloakId: userKc.id
  }
  const role: KeycloakRole = {
    id: 'asdf',
    name: 'user',
    description: 'app_user',
    containerId: 'asdfasdf'
  }

  describe('Create User', () => {
    it('creates a user', async () => {
      using _byuStub = stub(byuAccountService, 'getAccountsByNetId', (netId) => {
        expect(netId).toBe(user.netId)
        return Promise.resolve([userAcct])
      })
      using _kcCreate = stub(keycloakApi, 'createUser', (kcUser)=> {
        expect(kcUser.username).toEqual(user.netId)
        expect(kcUser.firstName).toEqual(user.firstName)
        return Promise.resolve()
      })
      using _kcGet = stub(keycloakApi, 'getUserByNetId', (netId) => {
        expect(netId).toBe(user.netId)
        return Promise.resolve(userKc)
      })
      
      using _kcRole = stub(keycloakApi, 'addRolesToUser', () => {
        return Promise.resolve()
      })
      using _prismaStub = stub(prisma.user, 'create',  (opts) => {
        expect(opts.data.accountType).toEqual(user.accountType);
        expect(opts.data.firstName).toEqual(user.firstName);
        expect(opts.data.netId).toEqual(user.netId);
        return Promise.resolve(user) as unknown as Prisma.Prisma__UserClient<User>;
      });
      
      const result = await userService.createUser(userAcct, role);
      
      expect(result).toEqual(user)
    });
    
    it('errors on create if keycloak account isn\'t found', async () => {
      using _kcCreateStub = stub(keycloakApi, 'createUser', () => {
        return Promise.resolve()
      })
      using _kcGet = stub(keycloakApi, 'getUserByNetId', () => Promise.resolve(null))
      using _prismaStub = stub(prisma.user, 'create');
      
      let thrown = false;
      try {
        await userService.createUser(userAcct, role)
      } catch {
        thrown = true;
      }

      expect(thrown).toBeTruthy();
    })
  })
  
  describe('Provision User', () => {
    it('provisions a user', async () => {
      using _kcGet = stub(keycloakApi, 'getUserByNetId', (netId) => {
        expect(netId).toBe(user.netId)
        return Promise.resolve(userKc)
      })
      using _kcGetRole = stub(keycloakApi, 'getAppRole', () => {
        return Promise.resolve({
          id: 'idkid',
          name: 'role1',
          description: 'app_role',
          containerId: 'asdf'
        })
      })
      using _kcAddRole = stub(keycloakApi, 'addRolesToUser', () => {
        return Promise.resolve()
      })
      using _prismaStub = stub(prisma.user, 'create',  (opts) => {
        expect(opts.data.accountType).toEqual(user.accountType);
        expect(opts.data.firstName).toEqual(user.firstName);
        expect(opts.data.netId).toEqual(user.netId);
        return Promise.resolve(user) as unknown as Prisma.Prisma__UserClient<User>;
      });

      const result = await userService.provisionUser(userAcct);
      expect(result).toEqual(user)
    });

    it('errors on provision if keycloak account isn\'t found', async () => {
      using _kcGet = stub(keycloakApi, 'getUserByNetId', () => {
        return Promise.resolve(null)
      })
      using _prismaStub = stub(prisma.user, 'create');

      let thrown = false;
      try {
        await userService.provisionUser(userAcct)
      } catch {
        thrown = true;
      }

      expect(thrown).toBeTruthy();
    })
  })

  describe('Update User', () => {
    it('updates a user', async () => {
      using _getUser = stub(prisma.user, 'findUnique', () => {
        return Promise.resolve(user) as unknown as Prisma.Prisma__UserClient<User>;
      })
      using _getAcct = stub(byuAccountService, 'getAccountsByNetId', () => Promise.resolve([userAcct]))
      using _update = stub(prisma.user, 'update', () => {
        return Promise.resolve(user) as unknown as Prisma.Prisma__UserClient<User>;
      })

      const result = await userService.updateUser(user.id);
      expect(result).toEqual(user);
    })

    
    it('errors on update if no account', async () => {
      using _getUser = stub(prisma.user, 'findUnique', () => {
        return Promise.resolve(user) as unknown as Prisma.Prisma__UserClient<User>;
      })
      using _getAcct = stub(byuAccountService, 'getAccountsByNetId', () => Promise.resolve([]))
      using updateStub = stub(prisma.user, 'update', () => {
        return Promise.resolve(user) as unknown as Prisma.Prisma__UserClient<User>;
      })

      let threw = false;
      try {
        await userService.updateUser(user.id)
      } catch {
        threw = true;
      }

      expect(threw).toBeTruthy();
      expect(updateStub.calls).toHaveLength(0)
    })
  })

  describe('Delete User', () => {
    it('deletes a user', async () => {
      using _deleteStub = stub(prisma.user, 'delete', () => {
        return Promise.resolve(user) as unknown as Prisma.Prisma__UserClient<User>;
      })
      using kcDeleteStub = stub(keycloakApi, 'deleteUser', () => {
        return Promise.resolve()
      })

      const result = await userService.deleteUser(user.id)

      expect(result).toEqual(user)
      expect(kcDeleteStub.calls).toHaveLength(1)
    })
  })
});
