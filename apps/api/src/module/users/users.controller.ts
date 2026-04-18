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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles([Role.ADMIN])
@Controller('users/accounts')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin tạo tài khoản đăng nhập mới' })
  @ApiSuccess('Tạo tài khoản thành công')
  async createAccount(@Body() dto: CreateAccountDto) {
    return this.usersService.createAccount(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Admin lấy danh sách tài khoản đăng nhập' })
  @ApiSuccess('Lấy danh sách tài khoản thành công')
  async findAllAccounts() {
    return this.usersService.findAllAccounts();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Admin lấy chi tiết một tài khoản đăng nhập' })
  @ApiSuccess('Lấy chi tiết tài khoản thành công')
  async findOneAccount(@Param('id') id: string) {
    return this.usersService.findOneAccount(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Admin cập nhật role, trạng thái, password và permissions',
  })
  @ApiSuccess('Cập nhật tài khoản thành công')
  async updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    return this.usersService.updateAccount(id, dto);
  }
}
