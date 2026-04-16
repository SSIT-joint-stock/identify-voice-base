import { ApiSuccess } from '@/common/decorators';
import { User } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { cookieConfig } from '@/config';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { type ConfigType } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type auth_accounts } from '@prisma/client';
import type { Request, Response } from 'express';
import { LoginUserDto } from './dto/login-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthService } from './service/auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    @Inject(cookieConfig.KEY)
    private readonly cookieCfg: ConfigType<typeof cookieConfig>,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng nhập người dùng' })
  @ApiSuccess('Đăng nhập thành công')
  async login(
    @Body() dto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: this.cookieCfg.httpOnly,
      secure: this.cookieCfg.secure,
      sameSite: this.cookieCfg.sameSite,
      maxAge: this.cookieCfg.maxAge,
      path: this.cookieCfg.path,
      domain: this.cookieCfg.domain,
    });
    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Làm mới access token' })
  @ApiSuccess('Làm mới token thành công')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = (req.cookies as Record<string, string>)?.refresh_token;
    const result = await this.authService.refresh(refreshToken);
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: this.cookieCfg.httpOnly,
      secure: this.cookieCfg.secure,
      sameSite: this.cookieCfg.sameSite,
      maxAge: this.cookieCfg.maxAge,
      path: this.cookieCfg.path,
      domain: this.cookieCfg.domain,
    });
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đăng xuất người dùng' })
  @ApiSuccess('Đăng xuất thành công')
  async logout(
    @User() user: auth_accounts,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(user.id);
    res.clearCookie('refresh_token');
  }

  @Post('reset-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đặt lại mật khẩu người dùng' })
  @ApiSuccess('Đặt lại mật khẩu thành công')
  async resetPassword(
    @User() user: auth_accounts,
    @Body() dto: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(user.id, dto);
  }
}
