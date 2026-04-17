import {
  Controller,
  Get,
  Query,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoggerService } from '../../global/services/logger.service';
import { CollectionOrchestratorService } from '../services/collection-orchestrator.service';
import { GlobalService } from '../../global/services/global.service';

@ApiTags('CollectionOrchestrator')
@Controller('collection-orchestrator')
export class CollectionOrchestratorController {
  protected readonly LOG_MESSAGE = 'CollectionOrchestratorController';

  constructor(
    protected loggerService: LoggerService,
    protected collectionOrchestratorService: CollectionOrchestratorService,
    protected globalService: GlobalService,
  ) {}

  @UsePipes(new ValidationPipe())
  @Get('reportShop')
  public async reportShop(
    @Query('shop') shop: string,
    @Query('username') username: string,
  ): Promise<boolean> {
    let result = false;
    const loggerHeader = `${this.LOG_MESSAGE}::reportShop process`;
    try {
      this.loggerService.info(
        `Report from Login Service was received for shop ${shop}-${username}`,
      );
      // this.collectionOrchestratorService.reportShop(shop, username);
      await Promise.resolve();
      result = true;
    } catch (error) {
      this.loggerService.error(
        `${loggerHeader}::Error starting collection for shop: ${shop}, user: ${username}`,
        error,
      );
    }
    return result;
  }
}
