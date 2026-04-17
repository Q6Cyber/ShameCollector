/*eslint camelcase: ["error", {properties: "never"}]*/
import { GrayLogHandler } from './graylog.service';
import { Injectable } from '@nestjs/common';
import * as util from 'util';

@Injectable()
export class LoggerService {
  protected logHeader: string;
  protected extraData: any;

  constructor(protected graylog: GrayLogHandler) {
    this.logHeader = 'LoggerService::';
    this.extraData = {
      environment: process.env.ENVIRONMENT,
      application: process.env.APP_ID,
    };
  }

  avoidNofification() {
    return ['test'].includes(process.env.ENVIRONMENT || 'test');
  }

  setData(message, data) {
    this.extraData.short_message = message;
    if (data) {
      this.extraData.full_message = util.inspect(data);
    }
    this.extraData.timestamp = new Date().toISOString();
  }

  async error(message: string, data: any = {}): Promise<any> {
    await Promise.resolve();
    if (!this.avoidNofification()) {
      this.setData(message, data);
      this.graylog.error(message, this.extraData);
    }
    // console.error('error', message, this.extraData);

    return true;
  }

  async info(message: string, data: any = {}): Promise<any> {
    await Promise.resolve();
    if (!this.avoidNofification()) {
      this.setData(message, data);
      this.graylog.info(message, this.extraData);
    }
    // console.log('info', message, this.extraData);
    return true;
  }

  async log(message: string, data: any = {}): Promise<any> {
    await Promise.resolve();
    console.log('Log', message, this.extraData);
    console.log('Log data', util.inspect(data));
    return true;
  }
}
