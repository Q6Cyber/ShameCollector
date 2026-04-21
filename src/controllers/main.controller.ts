import { Controller, Get, Query, Res } from '@nestjs/common';
import * as express from 'express';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApiTags } from '@nestjs/swagger';
import { GlobalService } from '../global/services/global.service';
import { LoggerService } from '../global/services/logger.service';
import { MetricsService } from '../global/services/metrics.service';
import { MainOrchestratorService } from '../services/main-orchestrator.service';

@ApiTags('Smart Collector service')
@Controller('main')
export class MainController {
  protected readonly LOG_MESSAGE = 'MainController';
  protected static isSlowCollectionNotificationRunning = false;

  constructor(
    protected readonly globalService: GlobalService,
    protected loggerService: LoggerService,
    protected metricsService: MetricsService,
    protected mainOrchestratorService: MainOrchestratorService,
  ) {}

  @Cron(new Date(Date.now() + 10 * 1000))
  // @Get('startShameCollector')
  public async startShameCollector(): Promise<any> {
    if (process.env.DISABLE_CRON === '1') return true;
    await this.loggerService.info('STARTING SHAMECOLLECTOR');
    if (this.globalService.isActive()) {
      await this.loggerService.info('SHAMECOLLECTOR ACTIVE AND RUNNING');
      // await this.feederService.getBinStats();
    }
    return true;
  }

  // // every day At 12:30 PM
  // @Cron('30 12 * * *')
  @Get('getShameSiteSources')
  public async getShameSiteSources(): Promise<any> {
    if (process.env.DISABLE_CRON === '1') return true;
    const result = await this.mainOrchestratorService.getShameSiteSources();
    return result;
  }

  @Get('isShameCollectorActive')
  isShameCollectorActive() {
    return this.globalService.isActive();
  }

  @Get('enableService')
  enableService() {
    return this.globalService.enable();
  }

  @Get('disableService')
  disableService() {
    return this.globalService.disable();
  }

  @Get('getCollectionMetrics')
  public async getCollectionMetrics(@Res() res: express.Response) {
    res.setHeader('Content-Type', this.metricsService.getContentType());
    const metrics = await this.metricsService.getMetrics();
    res.send(metrics);
  }
}
