import {
  Body,
  Controller,
  Get,
  Post,
  UsePipes,
  ValidationPipe,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FeederService } from '../services/feeder.service';
import { LoggerService } from '../../global/services/logger.service';
import { PubsubService } from '../../global/services/pubsub.service';

@ApiTags('Feeder')
@Controller('feeder')
export class FeederController {
  constructor(
    protected loggerService: LoggerService,
    protected pubsubService: PubsubService,
    protected feederService: FeederService,
  ) {}

  @UsePipes(new ValidationPipe())
  @Post('getBinStatsByShops')
  public async getBinStatsByShop(@Body() body: string[]): Promise<any> {
    return this.feederService.getBinStats(body);
  }

  @UsePipes(new ValidationPipe())
  @Get('getBinStatsAll')
  public async getBinStatsAll(): Promise<any> {
    return this.feederService.getBinStats();
  }

  @Get('sendSlackNotification')
  async sendSlackNotification(
    @Query('message') message: string,
  ): Promise<boolean> {
    const loggerHeader = `sendSlackNotification`;
    let result = true;
    try {
      const dataToSend = {
        shop: 'Shop',
        username: 'Username',
        isForumCollection: false,
        isPrivateMessages: false,
        message: message,
      };
      const pubSubTopicName = 'SmartCollector-Worker';
      await this.pubsubService.sendToPubSub(pubSubTopicName, [dataToSend]);
    } catch (error) {
      result = false;
      this.loggerService.error(
        `${loggerHeader}::Error sending notification message.`,
        error,
      );
    }
    return result;
  }
}
