export enum Roles {
  admin,
  user,
}

export const defaultHomePages: Partial<Record<keyof typeof Roles, string>> = {
  admin: '/example',
};
