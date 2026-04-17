import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GcloudPubSubModule } from '@ecobee/nodejs-gcloud-pubsub-module';
import { FeederModule } from '../feeder.module';
import { FeederService } from './feeder.service';
import { GlobalModule } from '../../global/global.module';
import { RedisService } from '../../global/services/redis.service';
import { PubsubService } from '../../global/services/pubsub.service';
import { GlobalService } from '../../global/services/global.service';
import { MainOrchestratorService } from '../../services/main-orchestrator.service';
import { RequestService } from '../../services/request.service';
import sinon from 'sinon';

let service: FeederService;
let requestService: RequestService;

let result;

const expectedShops = [
  'Sakura_Test_SC_Feeder_22',
  'Sakura_Test_SC_Feeder_23',
  'Sakura_Test_SC_Feeder_25',
];

const expectedBinStatsShop22 = [
  'Sakura_Test_SC_Feeder_12_Sakura_Test_SC_Feeder_22_410185_regular',
  'Sakura_Test_SC_Feeder_12_Sakura_Test_SC_Feeder_22_510179_regular',
  'Sakura_Test_SC_Feeder_12_Sakura_Test_SC_Feeder_22_510185_regular',
  'Sakura_Test_SC_Feeder_12_Sakura_Test_SC_Feeder_22_510195_regular',
  'Sakura_Test_SC_Feeder_12_Sakura_Test_SC_Feeder_22_510101_regular',
  'Sakura_Test_SC_Feeder_12_Sakura_Test_SC_Feeder_22_510181_regular',
  'Sakura_Test_SC_Feeder_12_Sakura_Test_SC_Feeder_22_410186_enhanced',
];

const mustNotShow = [
  'Sakura_Test_SC_Feeder_12_Sakura_Test_SC_Feeder_21_485547_regular',
];

const oldest =
  'Sakura_Test_SC_Feeder_12_Sakura_Test_SC_Feeder_22_410186_enhanced';

beforeAll(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      FeederModule,
      GlobalModule,
      ConveyorModule,
      SyncModule,
      GcloudPubSubModule.forRootAsync({
        useFactory: () => {
          const authOptions = { projectId: process.env.GCLOUD_PROJECT };
          return {
            authOptions,
          };
        },
      }),
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
    providers: [
      FeederService,
      RedisService,
      PubsubService,
      GlobalService,
      MainOrchestratorService,
      RequestService,
    ],
  }).compile();

  service = module.get<FeederService>(FeederService);
  requestService = module.get<RequestService>(RequestService);
});

describe('FeederModule', () => {
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return shops', async () => {
    jest.setTimeout(60000);
    const getCredentialsMock = sinon
      .stub(service.requestService, 'getCredentials')
      .callsFake(async (source: string, username: string): Promise<any> => {
        await Promise.resolve();
        return true;
      });

    result = await service.getBinStats(expectedShops);
    expect(result.length).toBe(4);
    getCredentialsMock.restore();
  });

  it('should NOT contain unexpected binstats', () => {
    const allBinStats = result
      .reduce((acc, cur) => {
        return acc.concat(cur.bins);
      }, [])
      .map((x) => x.id);
    expect(allBinStats.filter((x) => mustNotShow.includes(x)).length).toBe(0);
  });

  it('Should show oldest first', async () => {
    const shopToTest = result.find(
      (x) => x.shop === 'Sakura_Test_SC_Feeder_22',
    );
    await Promise.resolve();
    expect(shopToTest.bins[0].id).toBe(oldest);
  });
});
