import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { ChangeRoleDto, CreateUsersDto, ListUsageDto, UpdateUsersDto } from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lista usuários do tenant' })
  list() {
    return this.service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha usuário por id' })
  get(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Cria usuário' })
  create(@Body() dto: CreateUsersDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza perfil de usuário' })
  update(@Param('id') id: string, @Body() dto: UpdateUsersDto) {
    return this.service.update(id, dto);
  }

  @Roles('ADMIN')
  @Patch(':id/role')
  @ApiOperation({ summary: 'Troca role (ADMIN only)' })
  changeRole(@Param('id') id: string, @Body() dto: ChangeRoleDto) {
    return this.service.changeRole(id, dto);
  }

  @Get(':id/activity-log')
  @ApiOperation({ summary: 'Activity log do usuário' })
  activityLog(@Param('id') id: string) {
    return this.service.activityLog(id);
  }

  @Get('daily-usage/list')
  @ApiOperation({ summary: 'Métricas de uso diário' })
  dailyUsage(@Query() query: ListUsageDto) {
    return this.service.dailyUsage(query);
  }
}
