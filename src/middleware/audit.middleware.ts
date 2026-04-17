import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LoggerService } from '../global/services/logger.service';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(protected loggerService: LoggerService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { body, params, method, query, url, originalUrl } = req;
    const auditInfo = {
      requestIp: req.connection.remoteAddress || req.headers['x-forwarded-for'],
      dateTime: res.locals['startReqDate'],
      url,
      originalUrl,
      method,
      body,
      params,
      query,
    };

    this.loggerService.log(JSON.stringify(auditInfo));
    next();
  }
}
