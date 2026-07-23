import { Module } from '@nestjs/common';
import { UserPassController } from './user-pass.controller';
import { UserPassService } from './user-pass.service';

@Module({
  controllers: [UserPassController],
  providers: [UserPassService],
  exports: [UserPassService],
})
export class UserPassModule {}
