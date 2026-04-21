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
Verify that searchProcess continues execution or returns successfully without
*/

describe('RamsonWareLive', () => {
  let service: RamsonWareLive;
  let loggerService: LoggerService;

  const mockLoggerService = {
    info: jest.fn(),
    error: jest.fn(),
  };

  const mockSeleniumService = {
    driver: {
      get: jest.fn(),
      findElement: jest.fn(),
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
    elasticService: {} as any,
    seleniumService: mockSeleniumService as any,
    requestService: {} as any,
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
            return instance;
          },
        },
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: SeleniumService, useValue: mockSeleniumService },
        { provide: GlobalService, useValue: {} },
        { provide: RedisService, useValue: {} },
        { provide: PubsubService, useValue: {} },
        { provide: ElasticService, useValue: {} },
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
    it('should successfully retrieve and parse data when aggregator is online', async () => {
      // Mock initial HTML for getActiveGroups
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
                <td>Yes</td> <!-- Available column (index 3) -->
                <td>Status</td>
                <td>Last Check</td>
                <td>http://test-group.onion</td> <!-- FQDN column (index 6) -->
              </tr>
            </tbody>
          </table>
        </div>
      `;

      // Mock getSourceText to return groups HTML first, then details HTML
      jest.spyOn(service as any, 'getSourceText')
        .mockResolvedValueOnce(mockGroupsHtml)
        .mockResolvedValueOnce(mockDetailsHtml);

      // Mock openGroupLocations to avoid actually calling selenium get (already tested separately)
      const openGroupLocationsSpy = jest.spyOn(service as any, 'openGroupLocations').mockResolvedValue(undefined);

      const result = await service['searchProcess']();

      expect(result).toBe(true);
      expect(openGroupLocationsSpy).toHaveBeenCalledWith({
        name: 'TestGroup',
        link: '/group/test-group',
      });

      // Verify the parsed output
      expect(service['parsedRawPosts']).toHaveLength(1);
      const post = service['parsedRawPosts'][0];
      expect(post.type).toBe('RANSOMWARE_GROUP');
      expect(post.state).toBe('ACTIVE');
      expect(post.sourceName).toBe('TestGroup');
      expect(post.urlList).toHaveLength(1);
      expect(post.urlList[0].url).toBe('http://test-group.onion');
      expect(post.urlList[0].isActive).toBe(true);

      expect(mockLoggerService.info).toHaveBeenCalledWith(expect.stringContaining('Starting extraction'));
    });
  });

  describe('openGroupLocations', () => {
    it('should handle 504 Gateway Timeout gracefully', async () => {
      const group = { name: 'TestGroup', link: '/group/test-group' };

      // Mock driver.get to throw a timeout error
      mockSeleniumService.driver.get.mockRejectedValue(new Error('504 Gateway Timeout'));

      await service['openGroupLocations'](group);

      // Verify error was logged with the expected header/message
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        expect.stringContaining('RamsonWareLive::openGroupLocations:: Error expanding locations for TestGroup'),
        expect.any(Error),
      );
    });

    it('should successfully navigate and click the toggle when server is responsive', async () => {
      const group = { name: 'TestGroup', link: '/group/test-group' };
      const mockToggle = { click: jest.fn() };

      mockSeleniumService.driver.get.mockResolvedValue(undefined);
      mockSeleniumService.driver.findElement.mockResolvedValue(mockToggle);
      
      // Mock clickElement to avoid selenium script execution in test
      const clickElementSpy = jest.spyOn(service as any, 'clickElement').mockResolvedValue(undefined);
      // Mock awaitingTime (sleep)
      jest.spyOn(service as any, 'awaitingTime').mockResolvedValue(undefined);

      await service['openGroupLocations'](group);

      expect(mockSeleniumService.driver.get).toHaveBeenCalledWith(
        'https://www.ransomware.live/group/test-group'
      );
      expect(mockSeleniumService.driver.findElement).toHaveBeenCalledWith({
        selector: 'a#toggle-locations',
        type: 'css',
      });
      expect(clickElementSpy).toHaveBeenCalledWith(mockToggle);
    });
  });
});