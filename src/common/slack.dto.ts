import { ApiProperty } from '@nestjs/swagger';

export class IMessageSlack {
  @ApiProperty({
    description: 'Channel to publish the message on Slack app',
  })
  topic: string;

  @ApiProperty({
    description: 'Message to publish',
  })
  message: string;

  @ApiProperty({
    description: 'Emitter of message',
  })
  from: string;

  @ApiProperty({
    description: 'Receptor of message',
  })
  to: string;
}
