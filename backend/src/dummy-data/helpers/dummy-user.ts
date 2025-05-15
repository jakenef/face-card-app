import { ByuAccountType, prisma, User } from 'prisma/client';
import { faker } from '@faker-js/faker';
import { Role } from '../../routes/api.roles.ts';
import { keycloakApi } from '@fhss-web-team/backend-utils/apis';
import { dummy } from '@fhss-web-team/backend-utils/dummy';

export function generateDummyUserData(accountType: ByuAccountType = ByuAccountType.Student): User {
  const acct = dummy.accounts.generate(accountType, 1)[0];
  return {
    ...acct,
    id: faker.string.uuid(),
    byuId: acct.byuId ?? null,
    workerId: acct.byuId ?? null,
    createdAt: faker.date.past(),
    updatedAt: faker.date.recent(),
    accountType,
    keycloakId: faker.string.uuid(),
  };
}

/**
 * Generates user data, creates a new keycloak account, and saves the user in the database.
 * @param accountType The account type
 * @param role The user role
 * @returns A generated user
 */
async function createDummyUser(accountType: ByuAccountType, role: Role): Promise<User> {
  const user = dummy.accounts.generate(accountType, 1)[0];

  await keycloakApi.createUser({
    username: user.netId,
    firstName: user.firstName,
    lastName: user.lastName,
    email: `${user.netId}@byu.edu`,
    enabled: true,
    emailVerified: true,
    realmRoles: [role],
  });
  const kc = await keycloakApi.getUserByNetId(user.netId);
  if (!kc) throw new Error("User's keycloak account could not be found");

  return await prisma.user.create({
    data: {
      ...user,
      accountType,
      keycloakId: kc.id,
    },
  });
}

/**
 * Generates user data for input number of users, creates a new keycloak account for each, and saves the users in the database.
 * @param accountType The account type
 * @param role The user role
 * @returns An array of generated users
 */
export async function createDummyUsers(accountType: ByuAccountType, role: Role, n: number = 1): Promise<User[]> {
  const users = [];
  for (let i = 0; i < n; i++) {
    users.push(createDummyUser(accountType, role));
  }
  return await Promise.all(users);
}
