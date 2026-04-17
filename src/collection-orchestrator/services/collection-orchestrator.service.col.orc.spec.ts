import { Test, TestingModule } from '@nestjs/testing';
import { CollectionOrchestratorService } from './collection-orchestrator.service';
import { ForkMessageService } from './fork-message.service';
import { GlobalModule } from '../../global/global.module';
import { Last4GeneratorService } from './last4-generator.service';
import { ConveyorModule } from '../../conveyor/conveyor.module';
import { ConveyorService } from '../../conveyor/services/conveyor.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MainOrchestratorService } from '../../services/main-orchestrator.service';
import { RequestService } from '../../services/request.service';
import { RedisService } from '../../collection/services/redis.service';
import { CollectionService } from '../../collection/services/collection.service';

describe('CollectionOrchestratorService', () => {
  let service: CollectionOrchestratorService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollectionOrchestratorService,
        ForkMessageService,
        Last4GeneratorService,
        ConveyorService,
        MainOrchestratorService,
        RequestService,
        RedisService,
        {
          provide: CollectionService,
          useValue: {}, // simple mock, add methods if needed
        },
      ],
      imports: [
        GlobalModule,
        ConveyorModule,
        EventEmitterModule.forRoot({
          // set this to `true` to use wildcards
          wildcard: false,
          // the delimiter used to segment namespaces
          delimiter: '.',
          // set this to `true` if you want to emit the newListener event
          newListener: false,
          // set this to `true` if you want to emit the removeListener event
          removeListener: false,
          // the maximum amount of listeners that can be assigned to an event
          maxListeners: 10,
          // show event name in memory leak message when more than maximum amount of listeners is assigned
          verboseMemoryLeak: false,
          // disable throwing uncaughtException if an error event is emitted and it has no listeners
          ignoreErrors: false,
        }),
      ],
    }).compile();

    service = module.get<CollectionOrchestratorService>(
      CollectionOrchestratorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
