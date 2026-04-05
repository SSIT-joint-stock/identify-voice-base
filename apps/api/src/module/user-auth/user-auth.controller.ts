import { ApiSuccess } from '@/common/decorators';
import { User } from '@/common/decorators/user.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
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
import { UpdateUserDto } from './dto/update-user.dto';
import { UserService } from './service/user.service';

@ApiTags('user-auth')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserAuthController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lấy thông tin cá nhân' })
  @ApiSuccess('Lấy thông tin thành công')
  async getMe(@User() user: auth_accounts) {
    return this.userService.getMe(user.id);
  }

  @Patch('update-info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cập nhật thông tin cá nhân' })
  @ApiSuccess('Cập nhật thông tin thành công')
  async updateInfo(@User() user: auth_accounts, @Body() dto: UpdateUserDto) {
    return this.userService.updateInfo(user.id, dto);
  }

  @Delete('delete-account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa tài khoản' })
  @ApiSuccess('Xóa tài khoản thành công')
  async deleteAccount(@User() user: auth_accounts) {
    return this.userService.deleteAccount(user.id);
  }
}
