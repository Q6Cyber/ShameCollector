import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { GlobalExceptionsFilter } from './filters/global.exception.filter';
import { AuditMiddleware } from './middleware/audit.middleware';
import { LocalsMiddleware } from './middleware/locals.middleware';
import { FeederModule } from './feeder/feeder.module';
import { GlobalModule } from './global/global.module';
import { CollectionOrchestratorModule } from './collection-orchestrator/collection-orchestrator.module';
import { MainController } from './controllers/main.controller';
import { MainOrchestratorService } from './services/main-orchestrator.service';
import { RequestService } from './services/request.service';
import { ReportsModule } from './reports/reports.module';
import { HealthCheckModule } from './healthcheck/healthcheck.module';
import { TestController } from './controllers/test.controller';
import { StartupService } from './services/startup.service';
import { CollectionModule } from './collection/collection.module';

@Module({
  providers: [
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionsFilter,
    },
    MainOrchestratorService,
    RequestService,
    StartupService,
  ],
  controllers: [MainController, TestController],
  imports: [
    GlobalModule,
    CollectionModule,
    ConfigModule.forRoot({ isGlobal: true }),
    FeederModule,
    ScheduleModule.forRoot(),
    CollectionOrchestratorModule,
    ReportsModule,
    HealthCheckModule,
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
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LocalsMiddleware).forRoutes(MainController);
    consumer.apply(AuditMiddleware).forRoutes(MainController);
  }
  constructor() {
    /*
    Next line avoid the warning message:
    "MaxListenersExceededWarning: Possible EventEmitter memory leak detected.
    11 beforeExit listeners added" warning message."
  */
    process.setMaxListeners(100);
  }
}
