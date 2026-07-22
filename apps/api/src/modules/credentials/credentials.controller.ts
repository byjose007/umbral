import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { CredentialsService } from './credentials.service';
import {
  IssueCredentialDto,
  BlockCredentialDto,
  GenerateDynamicQRDto,
  VerifyCredentialDto,
} from './dto/credentials.dto';

@Controller('credentials')
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  @Post('issue')
  issueCredential(@Body() dto: IssueCredentialDto) {
    return this.credentialsService.issueCredential(dto);
  }

  @Get('person/:personId')
  getCredentialsForPerson(@Param('personId') personId: string) {
    return this.credentialsService.getCredentialsForPerson(personId);
  }

  @Get(':id')
  getCredentialById(@Param('id') id: string) {
    return this.credentialsService.getCredentialById(id);
  }

  @Post('block')
  blockCredential(@Body() dto: BlockCredentialDto) {
    return this.credentialsService.blockCredential(dto);
  }

  @Post('qr/generate')
  generateQRToken(@Body() dto: GenerateDynamicQRDto) {
    return this.credentialsService.generateQRToken(dto);
  }

  @Post('verify')
  verifyCredential(@Body() dto: VerifyCredentialDto) {
    return this.credentialsService.verifyCredential(dto);
  }
}
