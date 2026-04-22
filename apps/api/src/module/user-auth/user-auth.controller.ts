import { PROFILE } from '@/common/auth/permissions';
import { ApiSuccess, Permissions } from '@/common/decorators';
import { User } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { PermissionsGuard } from '@/common/guards/permissions.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type auth_accounts } from '@prisma/client';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UserService } from './service/user.service';

@ApiTags('user-auth')
@Controller('user')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UserAuthController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin cá nhân' })
  @ApiSuccess('Lấy thông tin thành công')
  @Permissions([PROFILE.READ])
  async getMe(@User() user: auth_accounts) {
    return this.userService.getMe(user.id);
  }

  @Patch('account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Người dùng tự cập nhật tài khoản của mình' })
  @ApiSuccess('Cập nhật tài khoản thành công')
  @Permissions([PROFILE.UPDATE])
  async updateAccount(
    @User() user: auth_accounts,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.userService.updateAccount(user.id, dto);
  }

  @Delete('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa tài khoản' })
  @ApiSuccess('Xóa tài khoản thành công')
  @Permissions([PROFILE.DELETE])
  async deleteAccount(@User() user: auth_accounts) {
    return this.userService.deleteAccount(user.id);
  }
}
