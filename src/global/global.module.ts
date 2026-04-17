import { Module } from '@nestjs/common';
import { GcloudPubSubModule } from '@ecobee/nodejs-gcloud-pubsub-module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GrayLogHandler } from './services/graylog.service';
import { LoggerService } from './services/logger.service';
import { GlobalService } from './services/global.service';
import { PubsubService } from './services/pubsub.service';
import { ElasticService } from './services/elastic.service';
import { RedisService } from './services/redis.service';
import { MetricsService } from './services/metrics.service';

@Module({
  providers: [
    LoggerService,
    GlobalService,
    GrayLogHandler,
    PubsubService,
    ElasticService,
    RedisService,
    MetricsService,
  ],
  imports: [
    EventEmitterModule.forRoot({
      // set this to `true` to use wildcards
      wildcard: false,
      // the delimiter used to segment namespaces
      delimiter: '.',
      // set this to `true` if you want to emit the newListener event
      newListener: false,
      // set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // the maximum amount of listeners that can be assigned to an event
      maxListeners: 10,
      // show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: false,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),
    GcloudPubSubModule.forRootAsync({
      useFactory: () => {
        const authOptions = { projectId: process.env.GCLOUD_PROJECT };
        return {
          authOptions,
        };
      },
    }),
  ],
  exports: [
    LoggerService,
    GlobalService,
    PubsubService,
    ElasticService,
    RedisService,
    MetricsService,
  ],
})
export class GlobalModule {}
