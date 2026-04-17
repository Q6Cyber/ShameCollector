import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { RedisService } from './redis.service';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

@Injectable()
export class GlobalService {
  protected active = true;
  protected takeCollectionScreenshot = false;
  protected isCollectionRunning = false;
  protected lastUpdatedTime: Date;

  constructor(
    protected loggerService: LoggerService,
    protected redisService: RedisService,
  ) {
    this.lastUpdatedTime = new Date();
  }

  public disable() {
    this.active = false;
    return this.active;
  }

  public enable() {
    this.active = true;
    return this.active;
  }

  public isActive() {
    return this.active;
  }

  public enableTakeScreenshot() {
    this.takeCollectionScreenshot = true;
    return this.takeCollectionScreenshot;
  }

  public disableTakeScreenshot() {
    this.takeCollectionScreenshot = false;
    return this.takeCollectionScreenshot;
  }

  public isScreenshotActive() {
    return this.takeCollectionScreenshot;
  }

  public async getIsCollectionRunning() {
    let diffTime = Date.now() - this.lastUpdatedTime.getTime();
    diffTime = diffTime / (1000 * 60);
    if (diffTime > 9) {
      this.isCollectionRunning = false;
      await this.loggerService.info(
        `Collection running status reset due to timeout. Last updated ${this.lastUpdatedTime.toISOString()}`,
      );
    }
    await Promise.resolve();
    return this.isCollectionRunning;
  }

  public setIsCollectionRunning(value: boolean) {
    this.isCollectionRunning = value;
    this.lastUpdatedTime = new Date();
    return this.isCollectionRunning;
  }

  async getSeleniumGridSessionIds(): Promise<any> {
    try {
      const data = JSON.stringify({
        query:
          '{ grid { uri, maxSession, sessionCount }, nodesInfo { nodes { id, uri, status, sessions { id } }} }',
      });
      const seleniumUrl = process.env.SELENIUM_REMOTE_URL
        ? process.env.SELENIUM_REMOTE_URL.replace('/wd/hub', '')
        : '';
      const config: AxiosRequestConfig = {
        method: 'post',
        baseURL: `${seleniumUrl}/graphql`,
        headers: {
          'Content-Type': 'application/json',
        },
        data: data,
      };
      const response: AxiosResponse = await axios(config);
      return response.data.data.nodesInfo.nodes;
    } catch (error) {
      await this.loggerService.error(
        `Error getting selenium sessions id`,
        error,
      );
    }
  }
}
