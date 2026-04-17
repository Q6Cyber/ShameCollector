import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { RedisService } from '../../global/services/redis.service';
import { GlobalModule } from '../../global/global.module';

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReportsService, RedisService],
      imports: [GlobalModule],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
