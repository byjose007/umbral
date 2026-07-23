import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { SubmitAccessRequestDto } from './dto/workflow.dto';

// Portal público de solicitud de acceso para proveedores y visitantes
@Controller('portal/access-requests')
export class PortalController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  submitRequest(@Body() dto: SubmitAccessRequestDto) {
    return this.workflowService.submitRequest(dto);
  }

  @Get(':id')
  getRequestStatus(@Param('id') id: string) {
    return this.workflowService.getRequestById(id);
  }
}
