import { DummyFunction } from '@fhss-web-team/backend-utils/dummy';
import { DEFAULT_ROLE } from '../../routes/api.roles.ts';
import { userService } from '../../services/user/user.ts';
import { byuApi, keycloakApi } from '@fhss-web-team/backend-utils/apis';

export const createUsers: DummyFunction = {
  name: 'Create users',
  description: 'Creates a bunch of users',
  handler: async () => {
    const netIds = ['kessi', 'pshumard', 'dmorais', 'rae1998', 'mollyrem', 'stokesgl', 'bmonson0', 'graywlr'];
    const accts = await byuApi.getBasicAccountsByNetId(netIds)
    const role = await keycloakApi.getAppRole(DEFAULT_ROLE)
    const users = accts.map(acct => userService.createUser(acct, role!));
    return await Promise.all(users);
  },
};
