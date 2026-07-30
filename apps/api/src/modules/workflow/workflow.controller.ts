import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AccessRequestStatus } from '@umbral/core';
import { WorkflowService } from './workflow.service';
import { AccessRequestDecisionDto, MoveToReviewDto } from './dto/workflow.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Bandeja interna de aprobación — requiere operador autenticado.
// (`PortalController`, en cambio, es el portal público de solicitud para
// proveedores/visitantes sin cuenta y NO lleva guard.)
@UseGuards(JwtAuthGuard)
@Controller('workflow/requests')
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  // Bandeja de aprobación
  @Get()
  listRequests(@Query('status') status?: AccessRequestStatus) {
    return this.workflowService.listRequests(status);
  }

  @Get(':id')
  getRequestById(@Param('id') id: string) {
    return this.workflowService.getRequestById(id);
  }

  @Post(':id/review')
  moveToReview(@Param('id') id: string, @Body() dto: MoveToReviewDto) {
    return this.workflowService.moveToReview(id, dto.actor);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Body() dto: AccessRequestDecisionDto) {
    return this.workflowService.approve(id, dto);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Body() dto: AccessRequestDecisionDto) {
    return this.workflowService.reject(id, dto);
  }
}
