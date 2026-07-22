import { Controller, Post, Body } from '@nestjs/common';
import { DecisionService } from './decision.service';
import { EvaluateDecisionDto, CompileMatrixDto } from './dto/decision.dto';

@Controller('decision')
export class DecisionController {
  constructor(private readonly decisionService: DecisionService) {}

  @Post('evaluate')
  evaluate(@Body() dto: EvaluateDecisionDto) {
    return this.decisionService.evaluate(dto);
  }

  @Post('compile-matrix')
  compileMatrix(@Body() dto: CompileMatrixDto) {
    return this.decisionService.compileMatrix(dto);
  }
}
