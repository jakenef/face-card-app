import { Routes } from '@angular/router';
import { AuthErrorPage, AuthCallbackPage, NotFoundPage, ForbiddenPage } from '@fhss-web-team/frontend-utils';

export const routes: Routes = [
  { path: 'forbidden', component: ForbiddenPage },
  { path: 'auth-callback', component: AuthCallbackPage },
  { path: 'auth-error', component: AuthErrorPage },
  { path: '', component: NotFoundPage }, // Change this to be the home page
  { path: '**', component: NotFoundPage },
];
