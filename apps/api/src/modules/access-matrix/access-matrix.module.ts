import { Module } from '@nestjs/common';
import { AccessMatrixCompilerService } from './access-matrix-compiler.service';
import { IdentityModule } from '../identity/identity.module';
import { CredentialsModule } from '../credentials/credentials.module';
import { AccessRightsModule } from '../access-rights/access-rights.module';

@Module({
  imports: [IdentityModule, CredentialsModule, AccessRightsModule],
  providers: [AccessMatrixCompilerService],
  exports: [AccessMatrixCompilerService],
})
export class AccessMatrixModule {}
