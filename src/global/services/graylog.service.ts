/* eslint @typescript-eslint/no-var-requires: "off" */
import { Injectable } from '@nestjs/common';
import * as util from 'util';
import Gelf from 'gelf';

@Injectable()
export class GrayLogHandler {
  protected logHeader: string;
  protected graylog;
  constructor() {
    this.logHeader = `GrayLogHandler::`;

    this.graylog = new Gelf({
      graylogPort: Number(process.env.GRAYLOG_PORT),
      graylogHostname: process.env.GRAYLOG_HOST,
      connection: 'wan',
      maxChunkSizeWan: 1420,
      maxChunkSizeLan: 8154,
    });

    this.graylog.on('error', (err) => {
      console.log('ouch!', err);
    });
  }

  async error(message: any, extra = {}) {
    try {
      await this.graylog.emit('gelf.log', extra);
    } catch (error) {
      throw new Error(
        `${this.logHeader}error::Error sending to Graylog Service: ${util.inspect(error)}`,
      );
    }
  }

  async info(message: string, extra = {}) {
    try {
      this.graylog.emit('gelf.log', extra);
      await Promise.resolve();
    } catch (error) {
      throw new Error(
        `${this.logHeader}info::Error sending to Graylog Service: ${util.inspect(error)}`,
      );
    }
  }
}
