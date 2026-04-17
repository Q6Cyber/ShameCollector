import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GcloudPubSubModule } from '@ecobee/nodejs-gcloud-pubsub-module';
import { CollectionOrchestratorService } from './services/collection-orchestrator.service';
import { CollectionOrchestratorController } from './controllers/collection-orchestrator.controller';
import { GlobalModule } from '../global/global.module';
import { MainOrchestratorService } from '../services/main-orchestrator.service';
import { RequestService } from '../services/request.service';
import { CollectionModule } from '../collection/collection.module';

@Module({
  providers: [
    CollectionOrchestratorService,
    MainOrchestratorService,
    RequestService,
  ],
  controllers: [CollectionOrchestratorController],
  imports: [
    GlobalModule,
    CollectionModule,
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
  exports: [CollectionOrchestratorService],
})
export class CollectionOrchestratorModule {}
