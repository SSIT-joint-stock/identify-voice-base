import { ApiSuccess } from '@/common/decorators';
import { Roles } from '@/common/decorators/roles.decorator';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AdminCreateAccountDto } from './dto/admin-create-account.dto';
import { AdminGetAccountsFilterDto } from './dto/admin-get-accounts-filter.dto';
import { AdminUpdateAccountDto } from './dto/admin-update-account.dto';
import { UserService } from './service/user.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([Role.ADMIN])
@Controller('users/accounts')
export class AdminAccountsController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin tạo tài khoản đăng nhập mới' })
  @ApiSuccess('Tạo tài khoản thành công')
  async createAccount(@Body() dto: AdminCreateAccountDto) {
    return this.userService.adminCreateAccount(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Admin lấy danh sách tài khoản đăng nhập' })
  @ApiSuccess('Lấy danh sách tài khoản thành công')
  async findAllAccounts(@Query() filter: AdminGetAccountsFilterDto) {
    return this.userService.adminFindAllAccounts(filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin lấy chi tiết một tài khoản đăng nhập' })
  @ApiSuccess('Lấy chi tiết tài khoản thành công')
  async findOneAccount(@Param('id') id: string) {
    return this.userService.adminFindOneAccount(id);
  }

  @Patch(':id/account')
  @ApiOperation({
    summary: 'Admin cập nhật tài khoản của người dùng theo ID',
  })
  @ApiSuccess('Cập nhật tài khoản thành công')
  async updateAccount(
    @Param('id') id: string,
    @Body() dto: AdminUpdateAccountDto,
  ) {
    return this.userService.adminUpdateAccount(id, dto);
  }
}
