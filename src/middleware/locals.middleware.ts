import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import moment from 'moment';

@Injectable()
export class LocalsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    res.locals['startReqDate'] = moment.utc().format();

    next();
  }
}
