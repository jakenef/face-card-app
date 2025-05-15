import { prisma, User } from 'prisma/client';
import { UserQuery, UsersQuery } from './user.types.ts';
import { DEFAULT_ROLE } from '../../routes/api.roles.ts';
import { ByuAccount, keycloakApi, KeycloakRole } from '@fhss-web-team/backend-utils/apis';
import { byuAccountService } from '@fhss-web-team/backend-utils/services'


class UserService {
  /**
   * Provisions a new user by retrieving their BYU account and Keycloak account details,
   * assigning the default role, and then creating a corresponding user record in the database.
   *
   * @param byuAccount - The Net ID of the user to be created.
   * @returns A promise that resolves to the created `User` object
   */
  public async provisionUser(byuAccount: ByuAccount): Promise<User> {
    const kc = await keycloakApi.getUserByNetId(byuAccount.netId);
    if (!kc) throw new Error("User's keycloak account could not be found");

    const defaultRole = await keycloakApi.getAppRole(DEFAULT_ROLE);
    if (!defaultRole) throw new Error('Default role could not be found');

    await keycloakApi.addRolesToUser(kc.id, [defaultRole]);

    return await prisma.user.create({
      data: {
        accountType: byuAccount.type,
        firstName: byuAccount.firstName,
        middleName: byuAccount.middleName,
        lastName: byuAccount.lastName,
        suffix: byuAccount.suffix,
        preferredFirstName: byuAccount.preferredFirstName,
        preferredLastName: byuAccount.preferredLastName,
        netId: byuAccount.netId,
        byuId: byuAccount.byuId,
        workerId: byuAccount.workerId,
        keycloakId: kc.id,
      },
    });
  }

  /**
   * Creates a new user in the system by retrieving their BYU account
   * and creating a new Keycloak account with the provided role.
   *
   * @param byuAccount - The account of the user to be created.
   * @param role - The role to assign to the user in Keycloak.
   * @returns A promise that resolves to the created `User` object
   */
  public async createUser(byuAccount: ByuAccount, role: KeycloakRole): Promise<User> {
    try {
      await keycloakApi.createUser({
        username: byuAccount.netId,
        firstName: byuAccount.firstName,
        lastName: byuAccount.lastName,
        email: `${byuAccount.netId}@byu.edu`,
        enabled: true,
        emailVerified: true,
      });
    } catch (err) {
      if (err instanceof Error && !err.message.includes('409')) {
        throw err;
      }
    }
    const kc = await keycloakApi.getUserByNetId(byuAccount.netId);
    if (!kc) throw new Error("User's keycloak account could not be found");

    await keycloakApi.addRolesToUser(kc.id, [role]);

    return await prisma.user.create({
      data: {
        accountType: byuAccount.type,
        firstName: byuAccount.firstName,
        middleName: byuAccount.middleName,
        lastName: byuAccount.lastName,
        suffix: byuAccount.suffix,
        preferredFirstName: byuAccount.preferredFirstName,
        preferredLastName: byuAccount.preferredLastName,
        netId: byuAccount.netId,
        byuId: byuAccount.byuId,
        workerId: byuAccount.workerId,
        keycloakId: kc.id,
      },
    });
  }

  /**
   * Updates a user with their latest BYU account info
   * @param userId - The ID of the user to update.
   * @returns A promise that resolves to the updated user data
   */
  public async updateUser(userId: string): Promise<User> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const byu = (await byuAccountService.getAccountsByNetId(user.netId))[0];
    if (!byu) throw new Error('User BYU account not found');

    return await prisma.user.update({
      where: { id: userId },
      data: {
        accountType: byu.type,
        firstName: byu.firstName,
        middleName: byu.middleName,
        lastName: byu.lastName,
        suffix: byu.suffix,
        preferredFirstName: byu.preferredFirstName,
        preferredLastName: byu.preferredLastName,
        netId: byu.netId,
        byuId: byu.byuId,
        workerId: byu.workerId,
        keycloakId: user.id,
      },
    });
  }

  /**
   * Deletes a user from the database
   * @param userId The ID of the user to delete. Will throw an error if user is not found
   * @returns The deleted user
   */
  public async deleteUser(userId: string): Promise<User> {
    const user = await prisma.user.delete({ where: { id: userId } }); // Throws if user not found
    await keycloakApi.deleteUser(user.keycloakId);
    return user;
  }

  /**
   * Gets a user from the database
   * @param query An object with options to specify the desired user
   * @returns The user if found, null otherwise
   */
  public async getUser(query: UserQuery): Promise<User | null> {
    return await prisma.user.findFirst({
      where: {
        OR: [{ netId: query.netId }, { byuId: query.byuId }, { id: query.userId }, { keycloakId: query.keycloakId }],
      },
    });
  }

  /**
   * Gets users based on the input query parameters
   * @param query An object of options for filtering and sorting the results of the query
   * @returns The array of found users
   */
  public async getUsers(query: UsersQuery = {}): Promise<User[]> {
    return await prisma.user.findMany({
      skip: query.paginate?.offset,
      take: query.paginate?.count,
      where: {
        OR: query.filter?.search
          ? [
              { netId: { contains: query.filter?.search, mode: 'insensitive' } },
              { byuId: { contains: query.filter?.search, mode: 'insensitive' } },
              { firstName: { contains: query.filter?.search, mode: 'insensitive' } },
              { preferredFirstName: { contains: query.filter?.search, mode: 'insensitive' } },
              { lastName: { contains: query.filter?.search, mode: 'insensitive' } },
              { preferredLastName: { contains: query.filter?.search, mode: 'insensitive' } },
              { middleName: { contains: query.filter?.search, mode: 'insensitive' } },
            ]
          : undefined,
        accountType: { in: query.filter?.accountTypes },
        createdAt: { gte: query.filter?.createdAt?.start, lte: query.filter?.createdAt?.end },
        updatedAt: { gte: query.filter?.createdAt?.start, lte: query.filter?.createdAt?.end },
      },
      orderBy: query.sort?.property ? { [query.sort.property]: query.sort.direction ?? 'asc' } : undefined,
    });
  }

  /**
   * Count users based on the input query parameters
   * @param query An object of options for filtering the results of the query
   * @returns The count of the number of users that match the query
   */
  public async getUsersCount(query: UsersQuery = {}): Promise<number> {
    return await prisma.user.count({
      where: {
        OR: query.filter?.search
          ? [
              { netId: { contains: query.filter?.search, mode: 'insensitive' } },
              { byuId: { contains: query.filter?.search, mode: 'insensitive' } },
              { firstName: { contains: query.filter?.search, mode: 'insensitive' } },
              { preferredFirstName: { contains: query.filter?.search, mode: 'insensitive' } },
              { lastName: { contains: query.filter?.search, mode: 'insensitive' } },
              { preferredLastName: { contains: query.filter?.search, mode: 'insensitive' } },
              { middleName: { contains: query.filter?.search, mode: 'insensitive' } },
            ]
          : undefined,
        accountType: { in: query.filter?.accountTypes },
        createdAt: { gte: query.filter?.createdAt?.start, lte: query.filter?.createdAt?.end },
        updatedAt: { gte: query.filter?.createdAt?.start, lte: query.filter?.createdAt?.end },
      }
    });
  }
}

/**
 * A service for managing site user data.
 */
export const userService = new UserService();
