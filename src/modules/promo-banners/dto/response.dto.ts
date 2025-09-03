import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PromoBannerResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  subtitle?: string;

  @ApiProperty()
  imageUrl: string;

  @ApiPropertyOptional()
  linkUrl?: string;

  @ApiPropertyOptional()
  ctaText?: string;

  @ApiPropertyOptional()
  backgroundColor?: string;

  @ApiPropertyOptional()
  textColor?: string;

  @ApiProperty()
  placement: string;

  @ApiProperty()
  device: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiPropertyOptional()
  visibleFrom?: Date | null;

  @ApiPropertyOptional()
  visibleTo?: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
