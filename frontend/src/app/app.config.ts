import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { 
  AutoRefreshTokenService, 
  provideKeycloak, 
  UserActivityService, 
  withAutoRefreshToken
} from 'keycloak-angular';
import { routes } from './app.routes';
import { enumToRecord, FhssConfig, provideFhss } from '@fhss-web-team/frontend-utils';
import { defaultHomePages, Roles } from './app.roles';

export const provideKeycloakAngular = () => {
  return provideKeycloak({
    config: {
      url: "http://localhost:8080",
      realm: "starter",
      clientId: "frontend",
    },
    initOptions: {
      // onLoad: 'check-sso',
      // silentCheckSsoRedirectUri: `http://localhost:4200/silent-check-sso.html`,
      responseMode: 'query'
    },
    features: [
      withAutoRefreshToken({
        onInactivityTimeout: 'login',
        sessionTimeout: Infinity
      })
    ],
    providers: [
      AutoRefreshTokenService,
      UserActivityService
    ],
  })
}

const fhssConfig: FhssConfig = {
  roles: enumToRecord(Roles),
  roleHomePages: defaultHomePages
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideKeycloakAngular(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFhss(fhssConfig)
  ]
};
