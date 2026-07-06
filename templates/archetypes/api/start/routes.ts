import router from '@adonisjs/core/services/router';
import env from '#start/env';

router.get('/health', async () => {
  return {
    status: 'ok',
    service: env.get('APP_NAME'),
  };
});

router.get('/api/v1/resources', async () => {
  return {
    data: [
      {
        id: 'example-1',
        name: 'Example resource',
        createdAt: new Date().toISOString(),
      },
    ],
  };
});

router.post('/api/v1/resources', async ctx => {
  const body = ctx.request.body();

  return ctx.response.created({
    data: {
      id: crypto.randomUUID(),
      name: typeof body?.name === 'string' ? body.name : 'Untitled resource',
      createdAt: new Date().toISOString(),
    },
  });
});
