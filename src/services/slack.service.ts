import { Injectable } from '@nestjs/common';
import { PubsubService } from '../global/services/pubsub.service';
import { LoggerService } from '../global/services/logger.service';
import { IMessageSlack } from '../common/slack.dto';

@Injectable()
export class SlackService {
  private readonly LOG_MESSAGE = 'SlackService';

  constructor(
    protected pubsubService: PubsubService,
    protected loggerService: LoggerService,
  ) {}

  async sendNotification(messageInfo: IMessageSlack): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::sendNotification`;
    let result = true;
    try {
      if (process.env.SEND_TO_SLACK_FLAG === '1') {
        const { message, topic, to, from } = messageInfo;
        const messageBody = {
          message,
          type: 'SLACK',
          to,
          from,
        };
        result = await this.pubsubService.sendToPubSub(topic, [messageBody]);
      }
    } catch (error) {
      result = false;
      this.loggerService.error(
        `${loggerHeader}::Error sending slack message to PubSub`,
        error,
      );
    }
    return result;
  }
}
