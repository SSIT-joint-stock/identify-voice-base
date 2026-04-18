import { UnauthorizedError } from '@/common/response';
import { jwtConfig } from '@/config';
import { JWTTokenPayload } from '@/shared/interfaces/token.interface';
import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { randomUUID } from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';

/**
 * Interface for user token payload containing user information
 */
export interface IUserTokenPayload {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  permissions?: string[];
}

/**
 * Service for handling JWT token generation and verification
 * Uses JWT standard claims (iss, sub, aud, jti) for security
 */
@Injectable()
export class AuthTokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly issuer: string = 'myapp'; // Example issuer
  private readonly audience: string = 'myapp'; // Example audience

  /**
   * Constructor injects JWT configuration
   * @param jwtCfg JWT configuration from config service
   */
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
  ) {
    this.accessSecret = this.jwtCfg.accessSecret;
    this.refreshSecret = this.jwtCfg.refreshSecret;
    this.accessExpiresIn = this.jwtCfg.accessExpiresIn;
    this.refreshExpiresIn = this.jwtCfg.refreshExpiresIn;

    const mask = (s: string) =>
      s.substring(0, 3) + '...' + s.substring(s.length - 3);
    console.log(
      `[AuthTokenService] Instance created. RefreshSecret: ${mask(this.refreshSecret)}`,
    );
  }

  /**
   * Generates access and refresh token pair for user authentication
   * @param userPayload User information to include in token
   * @returns Object containing access_token and refresh_token
   */
  generateTokenPair(userPayload: IUserTokenPayload): {
    access_token: string;
    refresh_token: string;
  } {
    const fullPayload: JWTTokenPayload<IUserTokenPayload> = {
      payload: userPayload,
      iss: this.issuer,
      sub: userPayload.id,
      aud: this.audience,
      jti: randomUUID(),
      // exp, iat, nbf will be set by jwt.sign
    };

    const access_token = jwt.sign(fullPayload, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
      algorithm: 'HS256',
    } as SignOptions);

    const refresh_token = jwt.sign(fullPayload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
      algorithm: 'HS256',
    } as SignOptions);

    return { access_token, refresh_token };
  }

  /**
   * Verifies access token for API authentication
   * @param token JWT access token to verify
   * @returns Decoded token payload
   * @throws UnauthorizedError if token is invalid or expired
   */
  verifyAccessToken(token: string): JWTTokenPayload<IUserTokenPayload> {
    try {
      const decoded = jwt.verify(token, this.accessSecret, {
        algorithms: ['HS256'],
      }) as JWTTokenPayload<IUserTokenPayload>;
      if (typeof decoded === 'string') {
        throw new UnauthorizedError('Invalid or expired access token.');
      }
      return decoded;
    } catch {
      throw new UnauthorizedError('Invalid or expired access token.');
    }
  }

  /**
   * Verifies refresh token for token renewal
   * @param token JWT refresh token to verify
   * @returns Decoded token payload
   * @throws UnauthorizedError if token is invalid or expired
   */
  verifyRefreshToken(token: string): JWTTokenPayload<IUserTokenPayload> {
    try {
      const decoded = jwt.verify(token, this.refreshSecret, {
        algorithms: ['HS256'],
      }) as JWTTokenPayload<IUserTokenPayload>;
      if (typeof decoded === 'string') {
        throw new UnauthorizedError('Invalid or expired refresh token.');
      }
      return decoded;
    } catch (error) {
      // Include original error in details for debugging
      throw new UnauthorizedError(
        'Invalid or expired refresh token.',
      ).addDetails({
        originalError: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
