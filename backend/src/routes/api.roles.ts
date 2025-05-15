/**
 * Access roles for the site. Needs to be the same as those in Keycloak.
 * Ensure that each role listed here has a counterpart 
 * in the Keycloak admin console with the description prefix `app_`
 */
export type Role = 'admin' | 'user';

/**
 * The default role for the site. 
 * Depends on the needs of the application
 */
export const DEFAULT_ROLE: Role = 'user';