import { IsEmail, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'nothing@nothing.com',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'Nothing@123',
  })
  @IsString()
  password: string;

  @ApiProperty({
    description: 'Remember user session',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
