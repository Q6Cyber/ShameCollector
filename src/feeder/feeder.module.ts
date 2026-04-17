import { Module } from '@nestjs/common';
import { FeederController } from './controllers/feeder.controller';
import { FeederService } from './services/feeder.service';
import { GlobalModule } from '../global/global.module';

@Module({
  controllers: [FeederController],
  providers: [FeederService],
  imports: [GlobalModule],
  exports: [FeederService],
})
export class FeederModule {}
