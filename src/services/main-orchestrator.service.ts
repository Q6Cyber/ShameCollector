import { Injectable } from '@nestjs/common';
import { LoggerService } from '../global/services/logger.service';
import { GlobalService } from '../global/services/global.service';
import { RequestService } from '../services/request.service';
import { CollectionOrchestratorService } from '../collection-orchestrator/services/collection-orchestrator.service';

@Injectable()
export class MainOrchestratorService {
  private readonly LOG_MESSAGE = 'MainOrchestratorService';

  constructor(
    protected loggerService: LoggerService,
    protected globalService: GlobalService,
    protected requestService: RequestService,
    protected collectionOrchestratorService: CollectionOrchestratorService,
  ) {}

  async runShameCollectorService(): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::runShameCollectorService`;
    let result = false;
    try {
      if (this.globalService.isActive()) {
        // await this.synchronizer.main();
        // const structure = await this.feederService.main();
        // await this.collectorOrchestratorService.addConveyorData(structure);
        result = true;
      }
      await Promise.resolve();
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error running ShameCollector Service`,
        error,
      );
    }
    return result;
  }

  async getShameSiteSources(): Promise<boolean> {
    const loggerHeader = `${this.LOG_MESSAGE}::getShameSiteSources`;
    try {
      const targets = [
        { sourceName: 'RamsonWareLive', url: 'https://www.ransomware.live' },
      ];

      for (const target of targets) {
        await this.collectionOrchestratorService.getSourcesFromShameSite(
          target,
        );
      }
    } catch (error) {
      await this.loggerService.error(
        `${loggerHeader}::Error getting shame site sources`,
        error,
      );
      throw error;
    }
    return true;
  }
}
