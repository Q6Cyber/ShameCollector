import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { LoggerService } from '../../global/services/logger.service';

import { CollectionService } from '../services/collection.service';

@ApiTags('Shop collection service')
@Controller('shopcollection')
export class CollectionShopController {
  protected readonly LOG_MESSAGE = 'CollectionController';

  constructor(
    protected collectionService: CollectionService,
    protected loggerService: LoggerService,
  ) {}
}
