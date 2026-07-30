import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateOperatorDto, UpdateOperatorDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Controller('auth/operators')
export class OperatorsController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  list() {
    return this.authService.listOperators();
  }

  @Post()
  create(@Body() dto: CreateOperatorDto) {
    return this.authService.createOperator(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOperatorDto) {
    return this.authService.updateOperator(id, dto);
  }
}
