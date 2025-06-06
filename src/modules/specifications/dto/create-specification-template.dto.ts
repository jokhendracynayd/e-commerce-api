import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  MaxLength,
  MinLength,
  IsBoolean,
  IsInt,
  Min,
  IsEnum,
  IsObject,
} from 'class-validator';

export enum SpecificationDataType {
  STRING = 'string',
  NUMBER = 'number',
  BOOLEAN = 'boolean',
  DATE = 'date',
  ENUM = 'enum',
}

export class CreateSpecificationTemplateDto {
  @ApiProperty({
    description: 'Category ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Specification key',
    example: 'RAM',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  specKey: string;

  @ApiProperty({
    description: 'Display name shown in the UI',
    example: 'RAM Memory',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  displayName: string;

  @ApiProperty({
    description: 'Group this specification belongs to',
    example: 'Technical Specifications',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  specGroup: string;

  @ApiPropertyOptional({
    description: 'Sort order within the group',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether this specification is required',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @ApiPropertyOptional({
    description: 'Whether this specification is filterable',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isFilterable?: boolean;

  @ApiPropertyOptional({
    description: 'Data type of this specification',
    enum: SpecificationDataType,
    default: SpecificationDataType.STRING,
  })
  @IsOptional()
  @IsEnum(SpecificationDataType)
  dataType?: SpecificationDataType;

  @ApiPropertyOptional({
    description: 'Predefined options for enum type',
    example: {
      options: ['2GB', '4GB', '8GB', '16GB']
    }
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
} 