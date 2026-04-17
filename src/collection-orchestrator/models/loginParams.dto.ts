import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class LoginParamsDto {
  @ApiProperty()
  sourceName: string;

  @ApiProperty()
  userName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  isForumCollection: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  isPrivateMessages: boolean;
}
