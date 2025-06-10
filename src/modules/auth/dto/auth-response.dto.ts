import { ApiProperty } from '@nestjs/swagger';

export class UserDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'User email' })
  email: string;

  @ApiProperty({ description: 'User first name', required: false })
  firstName?: string;

  @ApiProperty({ description: 'User last name', required: false })
  lastName?: string;

  @ApiProperty({ description: 'User role', enum: ['USER', 'ADMIN', 'SELLER'] })
  role: string;

  @ApiProperty({ description: 'User phone number', required: false })
  phone?: string;

  @ApiProperty({ description: 'Whether user email is verified' })
  is_email_verified: boolean;

  @ApiProperty({ description: 'Whether user phone is verified' })
  is_phone_verified: boolean;

  @ApiProperty({
    description: 'User account status',
    enum: ['ACTIVE', 'BLOCKED', 'PENDING_VERIFICATION'],
  })
  status: string;

  @ApiProperty({
    description: 'Whether admin password change is required',
    required: false,
  })
  password_change_required?: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT refresh token',
    required: false
  })
  refreshToken?: string;

  @ApiProperty({ type: UserDto })
  user: UserDto;
}

export class TokenResponseDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'JWT access token',
  })
  accessToken: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success: boolean;
}
