import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

export enum BannerPlacementDto {
  HOME_TOP = 'HOME_TOP',
  HOME_MIDDLE = 'HOME_MIDDLE',
  HOME_BOTTOM = 'HOME_BOTTOM',
  CATEGORY = 'CATEGORY',
  PRODUCT = 'PRODUCT',
  CHECKOUT = 'CHECKOUT',
  GLOBAL = 'GLOBAL',
}

export enum BannerDeviceDto {
  ALL = 'ALL',
  DESKTOP = 'DESKTOP',
  MOBILE = 'MOBILE',
}

export class CreatePromoBannerDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subtitle?: string;

  @ApiProperty()
  @IsString()
  @IsUrl()
  imageUrl: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsUrl()
  linkUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  ctaText?: string;

  @ApiPropertyOptional({ description: 'CSS color' })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional({ description: 'CSS color' })
  @IsOptional()
  @IsString()
  textColor?: string;

  @ApiProperty({ enum: BannerPlacementDto })
  @IsEnum(BannerPlacementDto)
  placement: BannerPlacementDto;

  @ApiProperty({ enum: BannerDeviceDto, default: BannerDeviceDto.ALL })
  @IsEnum(BannerDeviceDto)
  device: BannerDeviceDto = BannerDeviceDto.ALL;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number = 0;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  visibleFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  visibleTo?: string;
}


