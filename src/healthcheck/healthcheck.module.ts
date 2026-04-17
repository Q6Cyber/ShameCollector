import { Module } from '@nestjs/common';
import { HealthController } from './healthcheck.controller';

@Module({
  imports: [],
  controllers: [HealthController],
})
export class HealthCheckModule {}
