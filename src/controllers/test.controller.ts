import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LoginParamsDto } from '../collection-orchestrator/models/loginParams.dto';
import { PubsubService } from '../global/services/pubsub.service';
import { RedisService } from '../global/services/redis.service';
import { ElasticService } from '../global/services/elastic.service';

@ApiTags('Smart Collector service')
@Controller('test')
export class TestController {
  protected readonly LOG_MESSAGE = 'TestController';
  constructor(
    protected readonly pubsubService: PubsubService,
    protected readonly redisService: RedisService,
    protected readonly elasticService: ElasticService,
  ) {}

  @Get('testPubSub')
  public async testPubSub(): Promise<any> {
    await this.pubsubService.sendSlackNotification(
      'NotificationsAPI',
      'Testing PubSub notification',
      ['sakura'],
    );
  }

  @Get('getSourceInfoFromRedis')
  @ApiOperation({
    summary: 'Endpoint to obtain source information from redis service',
  })
  @ApiResponse({ status: 200, description: 'Success' })
  public async getSourceInfoFromRedis(
    @Query() searchParams: LoginParamsDto,
  ): Promise<any> {
    try {
      console.log(`process.env.REDIS_HOST::${process.env.REDIS_HOST}`);
      console.log(`process.env.REDIS_PORT::${process.env.REDIS_PORT}`);
      console.log(
        `process.env.REDIS_DB_INDEX_TARGET_PROD::${process.env.REDIS_DB_INDEX_TARGET_PROD}`,
      );
      console.log(
        `process.env.REDIS_DB_INDEX_PROD::${process.env.REDIS_DB_INDEX_PROD}`,
      );
      console.log(`process.env.ENVIRONMENT::${process.env.ENVIRONMENT}`);
      console.log(`Before function...`);
      return await this.redisService.getSession(
        `${searchParams.sourceName}:${searchParams.userName}`,
      );
    } catch (error) {
      console.log('Error getting source information from redis...', error);
      console.log('Error getting user access...', error);
    }
  }

  @Get('testElasticClient')
  @ApiOperation({ summary: 'Endpoint to test elastic client' })
  @ApiResponse({ status: 200, description: 'Success' })
  public async testElasticClient(): Promise<any> {
    try {
      return await this.elasticService.testElasticConnection();
    } catch (error) {
      console.log('Error testing elastic connection...', error);
    }
    return true;
  }

  @Get('testPubSubMaster')
  public async testPubSubMaster(): Promise<any> {
    console.log('testPubSubMaster called');
    await this.pubsubService.sendToPubSub('SmartCollector-Orchestrator', [
      {
        sourceName: 'Test source',
        username: 'Test user',
        credType: 'REGULAR',
      },
    ]);
  }
}
