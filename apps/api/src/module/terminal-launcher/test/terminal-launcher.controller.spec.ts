import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { INestApplication, RequestMethod } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { TERMINAL_INSTALLER_PATHS } from '../terminal-launcher.constants';
import {
  TERMINAL_INSTALLER_PUBLIC_ROUTE,
  TerminalLauncherModule,
} from '../terminal-launcher.module';
import { TerminalLauncherService } from '../terminal-launcher.service';

describe('Terminal launcher installer endpoint', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TerminalLauncherModule],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseInterceptor,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [
        {
          path: TERMINAL_INSTALLER_PUBLIC_ROUTE,
          method: RequestMethod.GET,
        },
        {
          path: TERMINAL_INSTALLER_PUBLIC_ROUTE,
          method: RequestMethod.HEAD,
        },
      ],
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('serves the raw installer from the unversioned public route', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${TERMINAL_INSTALLER_PUBLIC_ROUTE}`)
      .expect(200)
      .expect('Content-Type', /text\/x-shellscript/);

    expect(response.text).toMatch(/^#!\/usr\/bin\/env bash/);
    expect(response.text).toContain('readonly APP_ID="identify-app"');
    expect(response.text).not.toContain('"success"');
  });

  it('does not expose the installer under the versioned API prefix', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/terminal/install.sh')
      .expect(404);
  });

  it('supports a bodyless readiness request', async () => {
    const response = await request(app.getHttpServer())
      .head(`/${TERMINAL_INSTALLER_PUBLIC_ROUTE}`)
      .expect(200)
      .expect('Content-Type', /text\/x-shellscript/);

    expect(response.text).toBeUndefined();
  });
});

describe(TerminalLauncherService.name, () => {
  it('fails explicitly when no installer artifact is readable', async () => {
    const service = new TerminalLauncherService([
      '/tmp/identify-app-installer-does-not-exist/install.sh',
    ]);

    await expect(service.readInstaller()).rejects.toMatchObject({
      status: 500,
      message: 'Terminal launcher installer is unavailable',
    });
  });
});

describe('Unavailable terminal launcher installer endpoint', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TerminalLauncherModule],
      providers: [
        {
          provide: APP_INTERCEPTOR,
          useClass: ResponseInterceptor,
        },
      ],
    })
      .overrideProvider(TERMINAL_INSTALLER_PATHS)
      .useValue(['/tmp/identify-app-installer-does-not-exist/install.sh'])
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [
        {
          path: TERMINAL_INSTALLER_PUBLIC_ROUTE,
          method: RequestMethod.GET,
        },
      ],
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns an HTTP error instead of an invalid script body', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${TERMINAL_INSTALLER_PUBLIC_ROUTE}`)
      .expect(500);

    expect(response.headers['content-type']).not.toMatch(/text\/x-shellscript/);
  });
});
