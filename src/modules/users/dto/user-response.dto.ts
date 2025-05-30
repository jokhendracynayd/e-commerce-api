import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, Role, UserStatus } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User email',
    example: 'user@example.com',
  })
  email: string;

  @ApiPropertyOptional({
    description: 'User first name',
    example: 'John',
    nullable: true,
  })
  firstName?: string | null;

  @ApiPropertyOptional({
    description: 'User last name',
    example: 'Doe',
    nullable: true,
  })
  lastName?: string | null;

  @ApiPropertyOptional({
    description: 'User phone number',
    example: '+1234567890',
    nullable: true,
  })
  phone?: string | null;

  @ApiProperty({
    description: 'Whether user email is verified',
    example: true,
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Whether user phone is verified',
    example: false,
  })
  isPhoneVerified: boolean;

  @ApiPropertyOptional({
    description: 'User gender',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender | null;

  @ApiProperty({
    description: 'User status',
    enum: UserStatus,
    example: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiProperty({
    description: 'User role',
    enum: Role,
    example: Role.USER,
  })
  role: Role;

  @ApiPropertyOptional({
    description: 'User last login time',
    example: '2023-01-01T12:00:00Z',
    nullable: true,
  })
  lastLoginAt?: Date | null;

  @ApiPropertyOptional({
    description: 'User profile image URL',
    example: 'https://example.com/profile.jpg',
    nullable: true,
  })
  profileImage?: string | null;

  @ApiPropertyOptional({
    description: 'User date of birth',
    example: '1990-01-01T00:00:00Z',
    nullable: true,
  })
  dateOfBirth?: Date | null;

  @ApiPropertyOptional({
    description: 'User bio',
    example: 'A passionate shopper...',
    nullable: true,
  })
  bio?: string | null;

  @ApiProperty({
    description: 'User account creation time',
    example: '2023-01-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'User account last update time',
    example: '2023-01-01T12:00:00Z',
  })
  updatedAt: Date;
}
