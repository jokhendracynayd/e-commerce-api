import { IsOptional, IsString, IsArray, IsNumber, IsEnum, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum SuggestionType {
  PRODUCTS = 'products',
  CATEGORIES = 'categories',
  BRANDS = 'brands',
  QUERIES = 'queries',
}

export class SuggestQueryDto {
  @ApiProperty({
    description: 'Search query text for suggestions',
    required: true,
    example: 'smartph',
    minLength: 1,
  })
  @IsString()
  q: string;

  @ApiProperty({
    description: 'Types of suggestions to return',
    required: false,
    enum: SuggestionType,
    isArray: true,
    example: [SuggestionType.PRODUCTS, SuggestionType.CATEGORIES],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SuggestionType, { each: true })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((type) => type.trim());
    }
    return value;
  })
  types?: SuggestionType[] = [SuggestionType.PRODUCTS];

  @ApiProperty({
    description: 'Maximum number of suggestions per type',
    required: false,
    example: 5,
    minimum: 1,
    maximum: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  limit?: number = 5;

  @ApiProperty({
    description: 'Enable fuzzy matching for suggestions',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  fuzzy?: boolean = true;

  @ApiProperty({
    description: 'Fuzziness level for suggestions (0-2 or AUTO)',
    required: false,
    example: 'AUTO',
  })
  @IsOptional()
  @IsString()
  fuzziness?: string = 'AUTO';

  @ApiProperty({
    description: 'Include spell corrections',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  spell_check?: boolean = true;

  @ApiProperty({
    description: 'User ID for personalized suggestions',
    required: false,
  })
  @IsOptional()
  @IsString()
  user_id?: string;

  @ApiProperty({
    description: 'Session ID for analytics',
    required: false,
  })
  @IsOptional()
  @IsString()
  session_id?: string;
}

export class AutocompleteQueryDto {
  @ApiProperty({
    description: 'Partial search query for autocomplete',
    required: true,
    example: 'smart',
    minLength: 1,
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Number of autocomplete suggestions',
    required: false,
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  size?: number = 10;

  @ApiProperty({
    description: 'Enable context-aware suggestions',
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  context_aware?: boolean = false;

  @ApiProperty({
    description: 'Category context for suggestions',
    required: false,
  })
  @IsOptional()
  @IsString()
  category_context?: string;

  @ApiProperty({
    description: 'User ID for personalized autocomplete',
    required: false,
  })
  @IsOptional()
  @IsString()
  user_id?: string;
} 