import { Module } from '@nestjs/common';
import { GuardPwaController } from './guard-pwa.controller';
import { GuardPwaService } from './guard-pwa.service';

@Module({
  controllers: [GuardPwaController],
  providers: [GuardPwaService],
  exports: [GuardPwaService],
})
export class GuardPwaModule {}
