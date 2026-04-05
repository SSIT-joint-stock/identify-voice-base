import { auth_accounts } from '@prisma/client';

export interface RequestMeta {
  requestId: string;
  statusCode: number;
  durationMs: string;
  responseSize: string;
  method: string;
  url: string;
  ip: string;
  userAgent: string;
  headers: any;
  query: any;
  session: any;
  user: any;
  cookies: any;
  params: any;
  body: any;
  [key: string]: any;
}

export interface RequestWithUser extends RequestMeta {
  user: auth_accounts;
}
