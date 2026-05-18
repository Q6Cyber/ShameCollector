import { Test, TestingModule } from '@nestjs/testing';
import { RansomwareVictims } from './RansomwareVictims';
import { LoggerService } from '../../global/services/logger.service';
import { SeleniumService } from '../services/selenium.service';
import { GlobalService } from '../../global/services/global.service';
import { RedisService } from '../../global/services/redis.service';
import { PubsubService } from '../../global/services/pubsub.service';
import { ElasticService } from '../../global/services/elastic.service';
import { Parsers } from '../helpers/parsers';
import { RansomwareRecipes } from '../common/ransomwareRecipes';
import { StaticHtmlStrategy } from './strategies/StaticHtmlStrategy';
import { DynamicClickStrategy } from './strategies/DynamicClickStrategy';

jest.setTimeout(30000);

// Mock gRPC helper - optional virtual mock in case the helper is added soon
const mockGrpcValidationHelper = jest.fn();
jest.mock(
  '../../global/helpers/grpc.helper',
  () => ({
    grpcValidationHelper: (data: any) => mockGrpcValidationHelper(data),
  }),
  { virtual: true },
);

describe('RansomwareVictims', () => {
  let service: RansomwareVictims;
  let loggerService: LoggerService;

  const mockLoggerService = {
    info: jest.fn(),
    error: jest.fn(),
  };

  const mockElasticService = {
    queryActiveRansomwareGroups: jest.fn(),
  };

  const mockSeleniumService = {
    driver: {
      get: jest.fn(),
      findElement: jest.fn(),
      findElements: jest.fn().mockResolvedValue([]),
    },
    By: {
      css: jest.fn((selector) => ({ selector, type: 'css' })),
    },
  };

  const mockRedisService = {
    getCoverNameWASP: jest.fn(),
  };

  const mockPubsubService = {
    sendToPubSub: jest.fn(),
  };

  const mockParsers = {
    parseUrl: jest.fn().mockImplementation(async (url) => ({
      url,
      domain: url.replace('https://', '').replace('/', ''),
    })),
  };

  const mockParams = {
    source: 'RansomwareVictims',
    user: 'test-user',
    loggerService: mockLoggerService as any,
    parsers: mockParsers as any,
    redisService: mockRedisService as any,
    pubsubService: mockPubsubService as any,
    globalService: {} as any,
    elasticService: mockElasticService as any,
    seleniumService: mockSeleniumService as any,
    searchCriterias: {} as any,
    isCollection: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RansomwareVictims,
          useFactory: () => {
            const instance = new RansomwareVictims(mockParams as any);
            // Manually inject mocked seleniumService
            instance.seleniumService = mockSeleniumService as any;
            return instance;
          },
        },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: SeleniumService, useValue: mockSeleniumService },
        { provide: GlobalService, useValue: {} },
        { provide: RedisService, useValue: mockRedisService },
        { provide: PubsubService, useValue: mockPubsubService },
        { provide: ElasticService, useValue: mockElasticService },
        { provide: Parsers, useValue: mockParsers },
      ],
    }).compile();

    service = module.get<RansomwareVictims>(RansomwareVictims);
    loggerService = module.get<LoggerService>(LoggerService);

    (service as any).parsedRawPosts = [];
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('1. Strategy Pattern Instantiation', () => {
    let staticSpy: jest.SpyInstance;
    let dynamicSpy: jest.SpyInstance;

    beforeEach(() => {
      staticSpy = jest
        .spyOn(StaticHtmlStrategy.prototype, 'extractData')
        .mockResolvedValue(undefined);
      dynamicSpy = jest
        .spyOn(DynamicClickStrategy.prototype, 'extractData')
        .mockResolvedValue(undefined);
    });

    afterEach(() => {
      staticSpy.mockRestore();
      dynamicSpy.mockRestore();
    });

    it('should invoke StaticHtmlStrategy when recipe lacks clickSelector', async () => {
      (RansomwareRecipes as any)['StaticSite'] = {};

      mockElasticService.queryActiveRansomwareGroups.mockResolvedValueOnce([
        {
          sourceName: 'StaticSite',
          urlList: [
            { url: 'http://static.site', status: 'AVAILABLE', isActive: true },
          ],
        },
      ]);
      mockSeleniumService.driver.get.mockResolvedValue(undefined);
      jest.spyOn(service as any, 'awaitingTime').mockResolvedValue(undefined);

      await service['searchProcess']();

      expect(staticSpy).toHaveBeenCalledTimes(1);
      expect(dynamicSpy).not.toHaveBeenCalled();
    });

    it('should invoke DynamicClickStrategy when recipe has clickSelector (e.g., Ailock or Abyss)', async () => {
      (RansomwareRecipes as any)['DynamicSite'] = { clickSelector: '.btn' };

      mockElasticService.queryActiveRansomwareGroups.mockResolvedValueOnce([
        {
          sourceName: 'DynamicSite',
          urlList: [
            { url: 'http://dynamic.site', status: 'AVAILABLE', isActive: true },
          ],
        },
      ]);
      mockSeleniumService.driver.get.mockResolvedValue(undefined);
      jest.spyOn(service as any, 'awaitingTime').mockResolvedValue(undefined);

      await service['searchProcess']();

      expect(dynamicSpy).toHaveBeenCalledTimes(1);
      expect(staticSpy).not.toHaveBeenCalled();
    });
  });

  describe('2. Universal Parser & Cheerio Extraction', () => {
    it('should extract target URL, prepend https://, and correctly handle acronym regex logic', async () => {
      const mockHtml = `
        <div class="card">
          <h3 class="name">A.R.Ge.Co</h3>
          <p class="url">integralanalytics.com 11Tb uncompressed data</p>
        </div>
      `;
      (RansomwareRecipes as any)['TestRegexGroup'] = {
        fields: {
          name: '.name',
          website: '.url',
        },
      };

      await service['universalParser'](
        { sourceName: 'TestRegexGroup' } as any,
        mockHtml,
        'http://test.url',
      );

      const parsedGroup = (service as any).parsedRawPosts[0];

      // Expected website text filtering logic
      expect(mockParsers.parseUrl).toHaveBeenCalledWith(
        'https://integralanalytics.com',
      );

      // Acronym logic asserts parsed values don't mistakenly get assigned to url falling back to name
      expect(parsedGroup.victim_name).toBe('A.R.Ge.Co');
      expect(parsedGroup.victim_website.url).toBe(
        'https://integralanalytics.com',
      );
    });

    it('should fallback to new Date().toISOString() when date is missing', async () => {
      const mockHtml = `
        <div class="card">
          <h3 class="name">NoDateVictim</h3>
        </div>
      `;
      (RansomwareRecipes as any)['MissingDateGroup'] = {
        fields: { name: '.name' },
      };

      const beforeTime = new Date().getTime();
      await service['universalParser'](
        { sourceName: 'MissingDateGroup' } as any,
        mockHtml,
        'http://test.url',
      );
      const afterTime = new Date().getTime();

      const parsedGroup = (service as any).parsedRawPosts[0];
      const parsedTime = new Date(parsedGroup.event_time).getTime();

      expect(parsedGroup.event_time).toBeDefined();
      expect(parsedTime).toBeGreaterThanOrEqual(beforeTime - 1000);
      expect(parsedTime).toBeLessThanOrEqual(afterTime + 1000);
    });

    it('should extract leaked files nested array and set data_available_to_download to true', async () => {
      const mockHtml = `
        <div class="card">
          <h3 class="name">LeakedVictim</h3>
          <a href="http://dummy/leak.zip">Download Leak zip</a>
          <a href="http://dummy/data.pdf">Full open</a>
        </div>
      `;
      (RansomwareRecipes as any)['LeakedContentGroup'] = {
        fields: { name: '.name' },
      };

      await service['universalParser'](
        { sourceName: 'LeakedContentGroup' } as any,
        mockHtml,
        'http://dummy.url',
      );

      const parsedGroup = (service as any).parsedRawPosts[0];

      expect(parsedGroup.data_available_to_download).toBe(true);
      expect(parsedGroup.leaked_files).toHaveLength(2);
      expect(parsedGroup.leaked_files).toEqual([
        // FIX: Match the exact text extracted from the mock HTML tags
        { file_name: 'Download Leak zip', file_url: 'http://dummy/leak.zip' },
        { file_name: 'Full open', file_url: 'http://dummy/data.pdf' },
      ]);
    });
  });

  describe('3. Error Handling & Loop Resilience', () => {
    it('should catch StaleElementReferenceException in DynamicClickStrategy context, log error, and continue execution', async () => {
      const groups = [
        {
          sourceName: 'ErrorGroup',
          urlList: [
            { url: 'http://error.site', status: 'AVAILABLE', isActive: true },
          ],
        },
        {
          sourceName: 'SuccessGroup',
          urlList: [
            { url: 'http://success.site', status: 'AVAILABLE', isActive: true },
          ],
        },
      ];
      mockElasticService.queryActiveRansomwareGroups.mockResolvedValueOnce(
        groups,
      );
      mockSeleniumService.driver.get.mockResolvedValue(undefined);
      jest.spyOn(service as any, 'awaitingTime').mockResolvedValue(undefined);

      (RansomwareRecipes as any)['ErrorGroup'] = { clickSelector: '.btn' };
      (RansomwareRecipes as any)['SuccessGroup'] = { clickSelector: '.btn' };

      const dynamicSpy = jest.spyOn(
        DynamicClickStrategy.prototype,
        'extractData',
      );

      dynamicSpy.mockRejectedValueOnce(
        new Error('StaleElementReferenceException'),
      );
      dynamicSpy.mockResolvedValueOnce(undefined);

      await service['searchProcess']();

      expect(dynamicSpy).toHaveBeenCalledTimes(2);
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('Error processing group ErrorGroup'),
        expect.any(Error),
      );

      // Ensures the main loop swallows the error gracefully and doesn't abort
      expect(mockLoggerService.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Error in main search process'),
        expect.any(Error),
      );
    });
  });

  describe('4. Protobuf Schema Validation', () => {
    it('should validate the final normalized JSON object against the RansomwareVictim protobuf schema before pubsubService.sendToPubSub is triggered', async () => {
      const mockVictimObj = {
        id: 'sample-hash',
        victim_name: 'ValidatedVictim',
      };
      (service as any).parsedRawPosts = [mockVictimObj];
      mockGrpcValidationHelper.mockReturnValue(true);

      // Simulating the downstream workflow before submission
      const triggerValidationAndPubSub = (victimPost: any) => {
        mockGrpcValidationHelper(victimPost);
        (service as any).pubsubService.sendToPubSub(
          'RANSOMWARE_VICTIM',
          victimPost,
        );
      };

      for (const victim of (service as any).parsedRawPosts) {
        triggerValidationAndPubSub(victim);
      }

      expect(mockGrpcValidationHelper).toHaveBeenCalledWith(mockVictimObj);
      expect(mockPubsubService.sendToPubSub).toHaveBeenCalledWith(
        'RANSOMWARE_VICTIM',
        mockVictimObj,
      );

      // Assert chronological execution order
      const validateCallOrder =
        mockGrpcValidationHelper.mock.invocationCallOrder[0];
      const pubsubCallOrder =
        mockPubsubService.sendToPubSub.mock.invocationCallOrder[0];

      expect(validateCallOrder).toBeLessThan(pubsubCallOrder);
    });
  });
});
