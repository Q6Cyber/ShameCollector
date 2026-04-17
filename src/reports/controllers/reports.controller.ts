import { ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { LoggerService } from '../../global/services/logger.service';
import { ReportsService } from '../services/reports.service';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  protected readonly LOG_MESSAGE = 'ReportsController';

  constructor(
    protected reportsService: ReportsService,
    protected loggerService: LoggerService,
  ) {}

  @Get('getCollectionCycleReport')
  async getCollectionCycleReport() {
    // const loggerHeader = `${this.LOG_MESSAGE}::getCollectionCycleReport`;
    // let result = {};
    // try {
    //   result = await this.reportsService.getCollectionCycleReport();
    //   return result;
    // } catch (error) {
    //   this.loggerService.error(
    //     `${loggerHeader}::Error to get collection cycle report`,
    //     error,
    //   );
    // }
    // return result;
  }
}
