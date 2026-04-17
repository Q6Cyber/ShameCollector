import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

@Injectable()
export class ParseObjectPipe implements PipeTransform {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  transform(value: string, metadata: ArgumentMetadata) {
    try {
      return JSON.parse(value);
    } catch (error) {
      throw new BadRequestException('Invalid Request', { cause: error });
    }
  }
}
