import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID(4, { message: 'userId must be a valid UUID' })
  userId: string;

  @ApiProperty({
    description: 'JWT refresh token (optional when using HTTP-only cookies)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false
  })
  @IsOptional()
  @IsString({ message: 'refreshToken must be a string' })
  refreshToken?: string;
}
