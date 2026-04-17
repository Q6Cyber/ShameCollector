import { Injectable } from '@nestjs/common';
import { LoggerService } from '../../global/services/logger.service';
import { ElasticService } from '../../global/services/elastic.service';
import lodash from 'lodash';

/**
 * @description Service handler used for process the cards from feeder and filter them according client card distribution and basename
 * @export
 * @class OrderResolverService
 */
@Injectable()
export class FeederService {
  private readonly LOG_MESSAGE = 'FeederService';

  constructor(
    protected loggerService: LoggerService,
    protected elasticService: ElasticService,
  ) {}

  private getDriverType(target) {
    const activeDriverType = target.urlList.find((x) => x.isActive === true);
    if (!activeDriverType) {
      return false;
    }
    return activeDriverType.driverType;
  }

  async getBinStats(shopsList: any[] = []): Promise<any> {
    const shops = await this.elasticService.queryActiveShops();
    for (const target of shops) {
      let credentials = lodash.get(target, 'credentials', []);

      credentials = credentials.filter(
        (x) => ['REGULAR'].includes(x.credType) && !x.disabled,
      );
      target['credentials'] = credentials;
    }

    return shops;
  }
}
