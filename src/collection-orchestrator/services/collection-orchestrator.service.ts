/* eslint-disable */
import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LoggerService } from '../../global/services/logger.service';
import { GlobalService } from '../../global/services/global.service';
import { RedisService } from '../../global/services/redis.service';
import { PubsubService } from '../../global/services/pubsub.service';
import { CollectionService } from '../../collection/services/collection.service';
import fs from 'fs';

@Injectable()
export class CollectionOrchestratorService {
  protected LOG_MESSAGE: string;
  constructor(
    protected loggerService: LoggerService,
    protected globalService: GlobalService,
    protected redisService: RedisService,
    protected pubsubService: PubsubService,
    protected eventEmitter: EventEmitter2,
    protected collectionService: CollectionService,
  ) {
    this.LOG_MESSAGE = `CollectionOrchestratorService`;
  }

  protected async removeScreenshotFolder(params) {
    try {
      const folderShopUser = `${process.env.PATH_ROOT}/imgLogs/${params.sourceName}`;
      if (fs.existsSync(folderShopUser)) {
        fs.rmdirSync(folderShopUser, { recursive: true });
      }
    } catch (error) {
      this.loggerService.error(
        `Error on removeScreenshotFolder:: ${params.sourceName}-${params.userName}`,
        error,
      );
    }
  }

  async getSourcesFromShameSite(target: any) {
    const loggerHeader = `${this.LOG_MESSAGE}::getSourcesFromShameSite`;
    let result = true;
    const action = 'AGGREGATOR-COLLECTION';
    let startCollectionFlag = true;
    try {
      await this.loggerService.info(
        `${loggerHeader}::${action}-Starting collection for ${target.sourceName}`,
      );
      const collectionParams = {
        action,
        ...target,
      };
      // call fork process
      await this.collectionService.startAggregatorCollector(collectionParams);
      await this.loggerService.info(
        `${loggerHeader}::${action}-Collection for ${target.sourceName} completed successfully`,
      );
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error creating aggregator collection`,
        error,
      );
      result = false;
    }
    return result;
  }
}
