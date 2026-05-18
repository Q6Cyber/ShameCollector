import { Test, TestingModule } from '@nestjs/testing';
import { RamsonWareLive } from './RamsonWareLive';
import { LoggerService } from '../../global/services/logger.service';
import { SeleniumService } from '../services/selenium.service';
import { GlobalService } from '../../global/services/global.service';
import { RedisService } from '../../global/services/redis.service';
import { PubsubService } from '../../global/services/pubsub.service';
import { ElasticService } from '../../global/services/elastic.service';
import { RequestService } from '../../services/request.service';
import { Parsers } from '../helpers/parsers';

/* 
Tests

Test Case 1: Successful Data Retrieval
Mock getSourceText to return valid HTML for the group list and group details.
Verify that searchProcess correctly identifies active groups.
Verify that parsedRawPosts is populated with the expected JSON structure.
Verify that searchProcess returns true.

Test Case 2: 504 Gateway Timeout / Page Load Failure
Mock seleniumService.driver.get to throw a "504 Gateway Timeout" error.
Verify that openGroupLocations handles the error gracefully.
Verify that loggerService.error is called with the appropriate message.
Verify that searchProcess continues execution or returns successfully without crashing
*/

describe('RamsonWareLive', () => {
  let service: RamsonWareLive;
  let loggerService: LoggerService;

  const mockLoggerService = {
    info: jest.fn(),
    error: jest.fn(),
  };

  const mockElasticService = {
    updateUsingBulk: jest.fn(),
  };

  const mockSeleniumService = {
    driver: {
      get: jest.fn(),
      findElement: jest.fn(),
      findElements: jest.fn(),
      getPageSource: jest.fn(),
      manage: jest.fn().mockReturnValue({
        setTimeouts: jest.fn(),
      }),
    },
    By: {
      css: jest.fn((selector) => ({ selector, type: 'css' })),
      xpath: jest.fn((selector) => ({ selector, type: 'xpath' })),
    },
  };

  const mockParams = {
    source: 'RamsonWareLive',
    user: 'test-user',
    loggerService: mockLoggerService as any,
    parsers: {} as any,
    redisService: {} as any,
    pubsubService: {} as any,
    globalService: {} as any,
    elasticService: mockElasticService as any,
    seleniumService: mockSeleniumService as any,
    requestService: {
      request: jest.fn(),
    } as any,
    searchCriterias: {} as any,
    isCollection: true,
    sessionInfo: {
      connectionInfo: {
        url: 'https://www.ransomware.live',
      },
    } as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: RamsonWareLive,
          useFactory: () => {
            const instance = new RamsonWareLive(mockParams);
            // Manually inject mocked seleniumService as it's normally initialized in setupSelenium
            instance.seleniumService = mockSeleniumService as any;
            // Ensure requestService is accessible for WASP calls
            (instance as any).requestService = mockParams.requestService;
            return instance;
          },
        },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: SeleniumService, useValue: mockSeleniumService },
        { provide: GlobalService, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: PubsubService, useValue: {} },
        { provide: ElasticService, useValue: mockElasticService },
        { provide: RequestService, useValue: {} },
        { provide: Parsers, useValue: {} },
      ],
    }).compile();

    service = module.get<RamsonWareLive>(RamsonWareLive);
    loggerService = module.get<LoggerService>(LoggerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('searchProcess', () => {
    it('should successfully retrieve and parse data when aggregator is online (ACTIVE group)', async () => {
      // Mock initial HTML for getActiveGroups with an "Online" badge
      const mockGroupsHtml = `
        <li class="rl-group-item">
          <a href="/group/test-group">Test Group</a>
          <span class="rl-group-badge">TestGroup</span>
          <div class="flex-shrink-0"><span class="badge">Online</span></div>
        </li>
      `;

      // Mock updated HTML for extractAndDeduplicateUrls
      const mockDetailsHtml = `
        <div id="locations-section">
          <table>
            <tbody>
              <tr class="pathData">
                <td>Group Name</td>
                <td>Type</td>
                <td>Title</td>
                <td>Yes</td> 
                <td>Status</td>
                <td>Last Check</td>
                <td>0mega.cc</td> 
              </tr>
            </tbody>
          </table>
        </div>
      `;

      jest
        .spyOn(service as any, 'getSourceText')
        .mockResolvedValueOnce(mockGroupsHtml)
        .mockResolvedValueOnce(mockDetailsHtml);

      const openGroupLocationsSpy = jest
        .spyOn(service as any, 'openGroupLocations')
        .mockResolvedValue(undefined);

      const result = await service['searchProcess']();

      expect(result).toBe(true);
      expect(openGroupLocationsSpy).toHaveBeenCalledWith({
        name: 'TestGroup',
        link: '/group/test-group',
        isOnline: true,
      });

      // Added the  here so it properly targets the object!
      expect((service as any).parsedRawPosts).toHaveLength(1);
      const post = (service as any).parsedRawPosts[0];

      expect(post.isOnline).toBe(true);
      expect(post.sourceName).toBe('TestGroup');
    });

    it('should successfully retrieve and parse data when aggregator is offline (INACTIVE group)', async () => {
      // Mock initial HTML for getActiveGroups with an "Offline" badge
      const mockGroupsHtml = `
        <li class="rl-group-item">
          <a href="/group/offline-group">Offline Group</a>
          <span class="rl-group-badge">OfflineGroup</span>
          <div class="flex-shrink-0"><span class="badge">Offline</span></div>
        </li>
      `;

      const mockDetailsHtml = `
        <div id="locations-section">
          <table>
            <tbody>
              <tr class="pathData">
                <td>Group Name</td>
                <td>Type</td>
                <td>Title</td>
                <td>Yes</td> 
                <td>Status</td>
                <td>Last Check</td>
                <td>offline.cc</td> 
              </tr>
            </tbody>
          </table>
        </div>
      `;

      jest
        .spyOn(service as any, 'getSourceText')
        .mockResolvedValueOnce(mockGroupsHtml)
        .mockResolvedValueOnce(mockDetailsHtml);

      const openGroupLocationsSpy = jest
        .spyOn(service as any, 'openGroupLocations')
        .mockResolvedValue(undefined);

      const result = await service['searchProcess']();

      expect(result).toBe(true);

      expect(openGroupLocationsSpy).toHaveBeenCalledWith({
        name: 'OfflineGroup',
        link: '/group/offline-group',
        isOnline: false,
      });

      expect((service as any).parsedRawPosts).toHaveLength(1);
    });
  });

  describe('openGroupLocations', () => {
    it('should handle 504 Gateway Timeout gracefully', async () => {
      const group = { name: 'TestGroup', link: '/group/test-group' };

      // Mock driver.get to throw a timeout error
      mockSeleniumService.driver.get.mockRejectedValue(
        new Error('504 Gateway Timeout'),
      );

      await service['openGroupLocations'](group);

      // Verify error was logged with the expected header/message
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'RamsonWareLive::openGroupLocations:: Error expanding locations for TestGroup',
        ),
        expect.any(Error),
      );
    });

    it('should successfully navigate and click the toggle when server is responsive', async () => {
      const group = { name: 'TestGroup', link: '/group/test-group' };
      const mockToggle = { click: jest.fn() };

      mockSeleniumService.driver.get.mockResolvedValue(undefined);
      mockSeleniumService.driver.findElement.mockResolvedValue(mockToggle);

      // Mock clickElement to avoid selenium script execution in test
      const clickElementSpy = jest
        .spyOn(service as any, 'clickElement')
        .mockResolvedValue(undefined);
      // Mock awaitingTime (sleep)
      jest.spyOn(service as any, 'awaitingTime').mockResolvedValue(undefined);

      await service['openGroupLocations'](group);

      expect(mockSeleniumService.driver.get).toHaveBeenCalledWith(
        'https://www.ransomware.live/group/test-group',
      );
      expect(mockSeleniumService.driver.findElement).toHaveBeenCalledWith({
        selector: 'a#toggle-locations',
        type: 'css',
      });
      expect(clickElementSpy).toHaveBeenCalledWith(mockToggle);
    });
  });

  describe('publishSourcesToElastic', () => {
    it('should process cache hits/misses, safely update existing groups via updateByQuery, and create brand new groups', async () => {
      // 1. Setup mock data to test both scenarios
      service['parsedRawPosts'] = [
        {
          sourceName: 'GroupA',
          isOnline: true,
          state: 'ACTIVE',
          urlList: [
            { url: 'http://groupa.onion', status: 'AVAILABLE', isActive: true },
          ],
        },
        {
          sourceName: 'GroupB',
          isOnline: false,
          state: 'INACTIVE',
          urlList: [
            {
              url: 'https://groupb.com',
              status: 'UNAVAILABLE',
              isActive: false,
            },
          ],
        },
      ];

      // 2. Mock Redis logic
      const mockRedisService = (service as any).redisService;
      mockRedisService.getCoverNameWASP = jest
        .fn()
        .mockResolvedValueOnce(null) // First group: Cache Miss
        .mockResolvedValueOnce({ cover_name: 'CachedCoverB' }); // Second group: Cache Hit
      mockRedisService.setCoverNameWASP = jest
        .fn()
        .mockResolvedValue('Cover name stored correctly');

      // 3. Mock WASP Request (Only expected to be called ONCE due to the cache hit on GroupB)
      const mockRequestService = (service as any).requestService;
      mockRequestService.request = jest.fn().mockResolvedValue({
        statusCode: 200,
        data: JSON.stringify({ cover_name: 'GeneratedCoverA' }),
      });

      // 4. Mock OpenSearch Client behaviors
      const mockElasticClient = {
        updateByQuery: jest
          .fn()
          .mockResolvedValueOnce({ body: { updated: 1 } }) // GroupA existed, safely updated
          .mockResolvedValueOnce({ body: { updated: 0 } }), // GroupB didn't exist!
        index: jest.fn().mockResolvedValue({ body: { result: 'created' } }),
      };
      (service as any).elasticService.client = mockElasticClient;

      // 5. Execute the method
      await service['publishSourcesToElastic']();

      // === ASSERTIONS ===

      // Redis checking
      expect(mockRedisService.getCoverNameWASP).toHaveBeenCalledTimes(2);
      expect(mockRedisService.getCoverNameWASP).toHaveBeenCalledWith(
        expect.stringContaining('RANSOMWARE_GROUP:'),
      );

      // WASP API (Should only be called for GroupA)
      expect(mockRequestService.request).toHaveBeenCalledTimes(1);
      expect(mockRequestService.request).toHaveBeenCalledWith(
        'GET',
        expect.any(String),
        null,
        expect.objectContaining({ source: 'GroupA' }),
      );
      expect(mockRedisService.setCoverNameWASP).toHaveBeenCalledTimes(1); // Saves GroupA to cache

      // OpenSearch updateByQuery (Should be called for both)
      expect(mockElasticClient.updateByQuery).toHaveBeenCalledTimes(2);

      // OpenSearch fallback creation (Should ONLY be called for GroupB because updated was 0)
      expect(mockElasticClient.index).toHaveBeenCalledTimes(1);
      expect(mockElasticClient.index).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'CachedCoverB',
          body: expect.objectContaining({
            type: 'RANSOMWARE_GROUP',
            sourceName: 'GroupB',
          }),
        }),
      );
    });
  });
});
