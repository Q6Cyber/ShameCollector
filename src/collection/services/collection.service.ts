/* eslint @typescript-eslint/no-var-requires: "off" */
import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../global/services/logger.service';
import { AggregatorsDictionary } from '../common/aggregatorsDictionary';
import { Parsers } from '../helpers/parsers';
import { RedisService } from '../../global/services/redis.service';
import { PubsubService } from '../../global/services/pubsub.service';
import { RequestService } from '../../services/request.service';
import { GlobalService } from '../../global/services/global.service';
import { ElasticService } from '../../global/services/elastic.service';

@Injectable()
export class CollectionService {
  private readonly LOG_MESSAGE = 'CollectionService';
  public shopScript: any;
  private readonly aggregatorsDictionary = AggregatorsDictionary;
  protected source: string;
  protected username: string;
  protected connectionInfo: any;
  protected filters = [];
  protected tryLogin = 20;

  constructor(
    protected loggerService: LoggerService,
    protected parsers: Parsers,
    protected redisService: RedisService,
    protected pubsubService: PubsubService,
    protected requestService: RequestService,
    protected elasticService: ElasticService,
    protected globalService: GlobalService,
  ) {}

  removeHttpHttps(url) {
    return url.replace(/^https?:\/\//, '');
  }

  async coverNameWASP(params) {
    const loggerHeader = `${this.LOG_MESSAGE}::coverNameWASP`;
    try {
      const env =
        process.env.GCLOUD_PROJECT === 'stable-glass-183220' ? 'PROD' : 'DEV';
      const coverNameKey = `${params?.sourceName}:${env}:${params.urlKey}`;
      const coverNameExists =
        await this.redisService.getCoverNameWASP(coverNameKey);
      if (!coverNameExists) {
        const objWasp = {
          type: 'SHOP',
          source: params?.url,
          create_source: true,
          parent_source: params?.sourceName,
          create_missing_source: false,
        };
        const coverName = await this.createCoverNameWASP(objWasp);
        if (coverName) {
          await this.redisService.setCoverNameWASP(coverName, coverNameKey);
        } else {
          throw new Error('CoverName was not created');
        }
      }
    } catch (error) {
      await this.loggerService.info(
        `${loggerHeader}::coverNameWASP::${params?.sourceName}`,
      );
      throw error;
    }
  }

  async createCoverNameWASP(params) {
    const loggerHeader = `${this.LOG_MESSAGE}::createCoverNameWASP`;
    try {
      const response = await this.requestService.request(
        'GET',
        `${process.env.WASP}/covername/getCoverName`,
        null,
        params,
      );
      if (response.statusCode === 200) {
        return response.data ? JSON.parse(response.data) : null;
      } else {
        throw new Error(
          `${loggerHeader}::Error creating cover name: ${response.statusText}`,
        );
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error creating cover name`,
        error,
      );
      throw error;
    }
  }

  async getDefaultConnectionObj(target: any): Promise<any> {
    const loggerHeader = `${this.LOG_MESSAGE}::getDefaultConnectionObj`;
    try {
      const collectionInfo = {
        driver_type: 'Firefox',
        proxy: 'TOR_SOCKS',
        url: target.url,
      };
      return collectionInfo;
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error getting default connectionInfo for target ${target.sourceName}`,
        error,
      );
    }
  }

  async startAggregatorCollector(params: any): Promise<any> {
    const loggerHeader = `${this.LOG_MESSAGE}::startAggregatorCollector`;
    let result;
    // let retryCount = 3;
    try {
      this.username = '';
      this.source = params.sourceName;
      //get source data
      this.connectionInfo = await this.getDefaultConnectionObj(params);
      // await this.createPhoneSession(params);
      // const session = await this.getSession();
      // const sourceName = params.sourceName;

      // create shop script instance
      this.shopScript = new this.aggregatorsDictionary[params.sourceName]({
        source: params.sourceName,
        user: '',
        loggerService: this.loggerService,
        redisService: this.redisService,
        pubsubService: this.pubsubService,
        globalService: this.globalService,
        requestService: this.requestService,
        elasticService: this.elasticService,
        parsers: this.parsers,
        takeScreenshot: false,
        sessionInfo: { connectionInfo: this.connectionInfo },
      });

      // const objWasp = {
      //   urlKey: this.removeHttpHttps(this.connectionInfo.url),
      //   url: this.connectionInfo.url,
      //   sourceName,
      // };
      // await this.coverNameWASP(objWasp);

      // while (retryCount > 0) {
      await this.shopScript.setupTargetIterator();
      result = await this.shopScript.processShop();

      // switch (result.action) {
      //   case 'FINISHED_PHONE':
      //     if (!result?.msg.match(/still has topics/)) {
      //       this.redisService.deleteSessionRedis(`${params.sourceName}`);
      //       this.redisService.deleteSessionRedis(`${params.sourceName}`);
      //     }
      //     retryCount = 0;
      //     // save collection status
      //     const date = moment().format('YYYY-MM-DD');
      //     const key = `PhoneDailyStats:${this.source}:${date}`;
      //     const existing = await this.redisService.getCard(key);
      //     if (existing) {
      //       existing.status = 'Completed';
      //       await this.redisService.setPhoneData(key, existing);
      //     }
      //     break;
      //   case 'SESSION_EXPIRED':
      //     retryCount = 0;
      //     break;
      //   case 'ERROR':
      //     try {
      //       this.loggerService.info(
      //         `${loggerHeader}::Closing browser::${params.sourceName}`,
      //       );
      //     } catch (error) {}
      //     await sleep(60000);
      //     retryCount--;
      //     break;
      // }
      await this.shopScript.quitDriver();
      // }
    } catch (error) {
      // const message = lodash.get(error, ['message'], '');
      // if (
      //   message.match(/The session/) ||
      //   message.match(/Session doesnt exist/)
      // ) {
      //   await this.redisService.deleteTarget(`${params.sourceName}`);
      // }
      this.loggerService.error(
        `${loggerHeader}::Error collecting data from PhoneShop ${params.sourceName}`,
        error,
      );
      result = {
        ...params,
        status: false,
        action: 'ERROR',
        msg: error.message,
        errorType: error.type || false,
      };
    }
    return result;
  }
}
