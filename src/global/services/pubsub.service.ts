import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';
import * as util from 'util';
import { GcloudPubSubService } from '@ecobee/nodejs-gcloud-pubsub-module';
import { pb } from '@q6cyber/proto2ts';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PubsubService {
  private readonly LOG_MESSAGE = 'PubsubService';
  // private subscriptionSCMaster;

  constructor(
    protected eventEmitter: EventEmitter2,
    protected loggerService: LoggerService,
    private readonly gcloudPubSubService: GcloudPubSubService,
  ) {
    // this.subscriptionSCMaster = gcloudPubSubService.gcloudPubSubLib
    //   .topic('SmartCollector-Orchestrator')
    //   .subscription('SmartCollector-Orchestrator-sub');
    // this.subscriptionSCMaster.on('message', this.onMessage.bind(this));
  }

  onMessage(message) {
    // Called every time a message is received.

    // message.id = ID of the message.
    // message.ackId = ID used to acknowledge the message receival.
    // message.data = Contents of the message.
    // message.attributes = Attributes of the message.
    // message.timestamp = Timestamp when Pub/Sub received the message.

    // Ack the message:
    if (message.data) {
      const dataJson = JSON.parse(message.data);
      this.loggerService.info(
        `PubSubService::Receiving message with data: ${util.inspect(dataJson)}`,
      );
      message.ack();
      this.eventEmitter.emit('getMoreBinstatsByUser', dataJson);
    } else {
      console.log(`Bad message: ${message.id}`);
      this.loggerService.error(`PubSubService::Bad message received`, {
        messageId: message.id,
      });
      // message.nack();
    }

    // This doesn't ack the message, but allows more messages to be retrieved
    // if your limit was hit or if you don't want to ack the message.
    // message.nack();
  }

  async sendToPubSub(topicName: string, dataToSend: any[]): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::sendToPubSub`;
    let result = false;
    const publishMessages: any[] = [];
    try {
      dataToSend.forEach((data) => {
        const dataBuffer = Buffer.from(JSON.stringify(data));
        publishMessages.push(
          this.gcloudPubSubService.publishMessage(topicName, dataBuffer),
        );
      });
      const messageIds = await Promise.all(publishMessages);
      this.loggerService.info(
        `${loggerHeader}::Topic: ${topicName} - Messages processed: ${util.inspect(
          messageIds,
        )}`,
      );
      result = true;
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error sending messages to G - PubSub:topic - ${topicName}`,
        error,
      );
    }
    return result;
  }

  async sendToPubSubPhone(
    topicName: string,
    dataToSend: any[],
  ): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::sendToPubSubPhone`;
    let result = false;
    const publishMessages: any[] = [];
    try {
      const metadata = {
        type: 'collect.PhoneNumberCollect',
      };
      dataToSend.forEach((data) => {
        publishMessages.push(
          this.gcloudPubSubService.publishMessage(
            topicName,
            pb.collect.PhoneNumberCollect.toBinary(data),
            metadata,
          ),
        );
      });

      const messageIds = await Promise.all(publishMessages);
      this.loggerService.info(
        `${loggerHeader}::Topic: ${topicName} - Messages processed: ${util.inspect(
          messageIds,
        )}`,
      );
      result = true;
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error sending phone messages to G - PubSub`,
        error,
      );
    }
    return result;
  }

  public async sendSlackNotification(
    topic: string,
    message: string,
    channelsToPublish: string[],
    from = 'ShameCollector',
  ): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::sendSlackNotification`;
    let result = true;
    try {
      for (const channel of channelsToPublish) {
        const slackMessage: any = {
          topic,
          message,
          to: `#${channel}`,
          from,
        };
        result = await this.sendNotification(slackMessage);
      }
    } catch (error) {
      result = false;
      this.loggerService.error(
        `${loggerHeader}::Error sending slack notification`,
        error,
      );
    }
    return result;
  }

  async sendNotification(messageInfo: any): Promise<boolean> {
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
        result = await this.sendToPubSub(topic, [messageBody]);
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
