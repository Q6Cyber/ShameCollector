import { Injectable } from '@nestjs/common';
import { LoggerService } from './logger.service';
import * as util from 'util';
import client from 'prom-client';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class MetricsService {
  protected logHeader: string;
  protected register: any;
  protected collectionGauge: any;
  protected doneShopsGauge: any;
  protected itemsSentCounter: any;
  protected forumPostsSentCounter: any;

  constructor(protected loggerService: LoggerService) {
    this.register = new client.Registry();
    this.register.setDefaultLabels({
      application: 'SmartCollectorService-metrics',
    });

    //create messages processed counter
    try {
      this.itemsSentCounter = new client.Counter({
        name: 'cards_sent_total',
        help: 'Total number of cards sent to post-processing',
        registers: [this.register],
      });
    } catch (error) {
      this.loggerService.error(
        `${this.logHeader}::constructor::Error creating messages processed counter`,
        { error: util.inspect(error) },
      );
    }

    try {
      // Create a gauge metric
      this.collectionGauge = new client.Gauge({
        name: 'collection_amount_gauge',
        help: 'Collection amount gauge',
        registers: [this.register],
      });
    } catch (error) {
      this.loggerService.error(
        `${this.logHeader}::constructor::Error creating collection gauge`,
        { error: util.inspect(error) },
      );
    }

    try {
      // Create a gauge metric
      this.doneShopsGauge = new client.Gauge({
        name: 'done_shops_amount_gauge',
        help: 'Done shops amount gauge',
        registers: [this.register],
      });
    } catch (error) {
      this.loggerService.error(
        `${this.logHeader}::constructor::Error creating doneShops gauge`,
        { error: util.inspect(error) },
      );
    }

    try {
      this.forumPostsSentCounter = new client.Counter({
        name: 'forum_posts_sent_total',
        help: 'Total number of forum posts sent to post-processing',
        registers: [this.register],
      });
    } catch (error) {
      this.loggerService.error(
        `${this.logHeader}::constructor::Error creating forum posts sent counter`,
        { error: util.inspect(error) },
      );
    }

    this.logHeader = 'MetricsService';
  }

  public setCollectionGauge(value: number) {
    try {
      this.collectionGauge.set(value);
    } catch (err) {
      this.loggerService.error(
        `${this.logHeader}::setCollectionGauge::Error on set collection gauge`,
        { error: util.inspect(err) },
      );
    }
  }

  public setDoneShopsGauge(value: number) {
    try {
      this.doneShopsGauge.set(value);
    } catch (err) {
      this.loggerService.error(
        `${this.logHeader}::setDoneShopsGauge::Error on set Done shops gauge`,
        { error: util.inspect(err) },
      );
    }
  }

  public setCardsSentCounter(value: number) {
    try {
      this.itemsSentCounter.inc(value);
    } catch (err) {
      this.loggerService.error(
        `${this.logHeader}::setGauge::Error on set gauge`,
        { error: util.inspect(err) },
      );
    }
  }

  public setForumPostsSentCounter(value: number) {
    try {
      this.forumPostsSentCounter.inc(value);
    } catch (err) {
      this.loggerService.error(
        `${this.logHeader}::setGauge::Error on set gauge`,
        { error: util.inspect(err) },
      );
    }
  }

  public async getMetrics(): Promise<any> {
    try {
      const metrics = await this.register.metrics();
      return metrics;
    } catch (err) {
      this.loggerService.error(
        `${this.logHeader}::getMetrics::Error sending metrics`,
        { error: util.inspect(err) },
      );
      throw err;
    }
  }

  public getContentType() {
    return this.register.contentType;
  }

  @OnEvent('collectionMetrics')
  public addToMetrics(data) {
    try {
      const type = data.type;
      switch (type) {
        case 'cards_sent':
          this.setCardsSentCounter(data.value);
          break;
        case 'forum_messages_sent':
          this.setForumPostsSentCounter(data.value);
      }
    } catch (error) {
      this.loggerService.error(
        `${this.logHeader}::addToMetrics::Error on add to metrics`,
        { error: util.inspect(error) },
      );
    }
  }
}
