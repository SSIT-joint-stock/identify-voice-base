import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthTokenService {
  constructor(private readonly jwtService: JwtService) {}

  verifyAccessToken(token: string) {
    return {
      payload: this.jwtService.verify(token),
    };
  }

  signAccessToken(payload: any) {
    return this.jwtService.sign(payload);
  }
}
