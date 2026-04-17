import { Test, TestingModule } from '@nestjs/testing';
import { FeederModule } from '../feeder/feeder.module';
import { GlobalModule } from '../global/global.module';
import { MainOrchestratorService } from './main-orchestrator.service';
import { RequestService } from '../services/request.service';

describe('MainOrchestratorService', () => {
  let service: MainOrchestratorService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MainOrchestratorService, RequestService],
      imports: [GlobalModule, FeederModule],
    }).compile();

    service = module.get<MainOrchestratorService>(MainOrchestratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
