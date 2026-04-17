import { Test, TestingModule } from '@nestjs/testing';
import { PubsubService } from './pubsub.service';
import { SlackService } from '../../services/slack.service';
import { LoggerService } from './logger.service';
import { IMessageSlack } from '../../common/slack.dto';
import {
  GcloudPubSubModule,
  GcloudPubSubService,
} from '@ecobee/nodejs-gcloud-pubsub-module';
import sinon from 'sinon';
import { GrayLogHandler } from './graylog.service';

describe('PubsubService', () => {
  let pubsubService: PubsubService;
  let loggerService: LoggerService;
  let gCloudPubSubService: GcloudPubSubService;
  let slackService: SlackService;

  const notificationTopicName = 'NotificationsAPI';
  const slackMessage: IMessageSlack = {
    topic: notificationTopicName,
    message: 'Testing slack service',
    from: 'Slack service test',
    to: '#sakura',
  };
  const dataToSend = [
    {
      message: 'Testing slack service',
      type: 'SLACK',
      to: '#sakura',
      from: 'Slack service test',
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PubsubService, LoggerService, SlackService, GrayLogHandler],
      imports: [
        GcloudPubSubModule.forRootAsync({
          useFactory: () => {
            const authOptions = { projectId: process.env.GCLOUD_PROJECT };
            return {
              authOptions,
            };
          },
        }),
      ],
    }).compile();

    pubsubService = module.get<PubsubService>(PubsubService);
    loggerService = module.get<LoggerService>(LoggerService);
    gCloudPubSubService = module.get<GcloudPubSubService>(GcloudPubSubService);
    slackService = module.get<SlackService>(SlackService);
  });

  it('PubsubService should be defined', () => {
    expect(pubsubService).toBeDefined();
  });

  it('PubsubService should send data using topic name', async () => {
    const gCloudPubSubMock = sinon.stub(gCloudPubSubService, 'publishMessage');

    const result = await pubsubService.sendToPubSub(
      notificationTopicName,
      dataToSend,
    );
    expect(result).toEqual(true);
    sinon.assert.calledOnceWithExactly(
      gCloudPubSubMock,
      notificationTopicName,
      Buffer.from(JSON.stringify(dataToSend[0])),
    );
  });

  it('PubsubService should catch the error', async () => {
    const gCloudPubSubMock = sinon
      .stub(gCloudPubSubService, 'publishMessage')
      .throws(new Error('Pubsub service error'));

    const result = await pubsubService.sendToPubSub(
      notificationTopicName,
      dataToSend,
    );
    expect(result).toEqual(false);
    sinon.assert.calledOnceWithExactly(
      gCloudPubSubMock,
      notificationTopicName,
      Buffer.from(JSON.stringify(dataToSend[0])),
    );
  });

  describe('Slack service using pubsub service', () => {
    it('SlackService should be defined', () => {
      expect(slackService).toBeDefined();
    });

    it('SlackService should send a notification using Notifications api topic', async () => {
      const result = await slackService.sendNotification(slackMessage);
      expect(result).toEqual(true);
    });
  });
});
