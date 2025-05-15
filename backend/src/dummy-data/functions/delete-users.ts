import { DummyFunction } from '@fhss-web-team/backend-utils/dummy';
import { userService } from '../../services/user/user.ts';

export const deleteUsers: DummyFunction = {
  name: 'Delete users',
  description: 'Deletes all users',
  handler: async () => {
    const users = await userService.getUsers();
    const res = users.map(user => userService.deleteUser(user.id));
    return await Promise.all(res);
  },
};
