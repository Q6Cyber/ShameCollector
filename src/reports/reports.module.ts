import { Module } from '@nestjs/common';
import { ReportsController } from './controllers/reports.controller';
import { ReportsService } from './services/reports.service';
import { RedisService } from '../global/services/redis.service';
import { GlobalModule } from '../global/global.module';
@Module({
  controllers: [ReportsController],
  providers: [ReportsService, RedisService],
  imports: [GlobalModule],
})
export class ReportsModule {}
