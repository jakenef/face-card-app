import { bold, yellow } from '@std/fmt/colors';
import { Application, Router } from '@oak/oak';

import { handleErrors, setResponseTimeHeader, logRequests, authorization} from '@fhss-web-team/backend-utils/middleware';

import { routes } from './routes/api.routes.ts';

import { dummy } from '@fhss-web-team/backend-utils/dummy';
import { dummyFunctions } from './dummy-data/dummy.functions.ts';

const ENVIRONMENT = Deno.env.get('ENVIRONMENT')

const app = new Application();

// Middleware
app.use(logRequests); // Logger
app.use(handleErrors); // Handle errors
app.use(setResponseTimeHeader); // Response Time

// handle api routes
const api = new Router({
  prefix: '/api',
});

routes.forEach(route => {
  const router = new Router();
  for (const endpoint of route.endpoints) {
    router[endpoint.data.method](endpoint.data.path, authorization(endpoint.allowedRoles), endpoint.data.getHandler());
  }
  api.use(route.path, router.routes());
});

app.use(api.routes());

if (ENVIRONMENT === 'dev' || ENVIRONMENT === 'staging') {
  app.use(dummy.functions.getRoutes(dummyFunctions));
}

// Send static content
app.use(async (context, next) => {
  try {
    await context.send({
      root: `dist/browser`,
      index: 'index.html',
    });
  } catch {
    await next();
  }
});

app.addEventListener('listen', ({ hostname, port }) => {
  console.log(bold('Start listening on ') + yellow(`${hostname}:${port}`));
});

if (import.meta.main) {
  await app.listen({ port: 8000 });
}

export default app;
