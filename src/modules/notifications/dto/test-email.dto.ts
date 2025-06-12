import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../interfaces/notification.interface';

export class TestEmailDto {
  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
    example: NotificationType.WELCOME,
  })
  @IsEnum(NotificationType)
  @IsNotEmpty()
  type: NotificationType;

  @ApiProperty({
    description: 'Data to include in the notification',
    example: {
      firstName: 'John',
      lastName: 'Doe',
    },
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;
} 