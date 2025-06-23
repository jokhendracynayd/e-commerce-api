import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateUserActivityDto } from './create-user-activity.dto';

export class CreateBatchActivityDto {
  @ApiProperty({
    description: 'Array of user activities to record in batch',
    type: [CreateUserActivityDto],
  })
  @IsArray({ message: 'Activities must be an array' })
  @IsNotEmpty({ message: 'Activities array cannot be empty' })
  @ValidateNested({ each: true })
  @Type(() => CreateUserActivityDto)
  activities: CreateUserActivityDto[];
}
