import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TopologyModule } from './modules/topology/topology.module';

@Module({
  imports: [TopologyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
