declare global {
  namespace Express {
    export interface Request {
      requestId: string;
      session?: any;
      user?: any;
      guestId?: string;
    }
  }
}

export {};
