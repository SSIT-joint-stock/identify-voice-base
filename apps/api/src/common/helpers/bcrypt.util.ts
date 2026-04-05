// src/common/helpers/bcrypt.service.ts

import { jwtConfig } from '@/config';
import { Inject, Injectable } from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import * as bcryptjs from 'bcryptjs';

@Injectable()
export class BcryptService {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>,
  ) {}
  async hashPassword(password: string): Promise<string> {
    return await bcryptjs.hash(password, Number(this.jwtCfg.bcryptRounds));
  }

  async comparePassword(
    password: string,
    hashPassword: string,
  ): Promise<boolean> {
    return await bcryptjs.compare(password, hashPassword);
  }
}
