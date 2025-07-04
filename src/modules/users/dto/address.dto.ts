import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';

export class AddressDto {
  @ApiProperty({
    description: 'Address ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Street address',
    example: '123 Main St',
  })
  street: string;

  @ApiProperty({
    description: 'City',
    example: 'New York',
  })
  city: string;

  @ApiProperty({
    description: 'State or province',
    example: 'NY',
  })
  state: string;

  @ApiProperty({
    description: 'Zip or postal code',
    example: '10001',
  })
  zipCode: string;

  @ApiProperty({
    description: 'Country',
    example: 'USA',
  })
  country: string;

  @ApiProperty({
    description: 'Whether this is the default address',
    example: true,
  })
  isDefault: boolean;

  @ApiPropertyOptional({
    description: 'Recipient name',
    example: 'John Doe',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'Mobile phone number',
    example: '1234567890',
  })
  mobileNumber?: string;

  @ApiPropertyOptional({
    description: 'Locality or neighborhood',
    example: 'Downtown',
  })
  locality?: string;

  @ApiPropertyOptional({
    description: 'Landmark for easier identification',
    example: 'Near Central Park',
  })
  landmark?: string;

  @ApiPropertyOptional({
    description: 'Alternative phone number',
    example: '0987654321',
  })
  alternatePhone?: string;

  @ApiPropertyOptional({
    description: 'Type of address (Home/Work)',
    example: 'Home',
  })
  addressType?: string;

  @ApiProperty({
    description: 'Creation date',
    example: '2023-01-01T12:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update date',
    example: '2023-01-01T12:00:00Z',
  })
  updatedAt: Date;
}

export class CreateAddressDto {
  @ApiProperty({
    description: 'Street address',
    example: '123 Main St',
  })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiProperty({
    description: 'City',
    example: 'New York',
  })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({
    description: 'State or province',
    example: 'NY',
  })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({
    description: 'Zip or postal code',
    example: '10001',
  })
  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ApiProperty({
    description: 'Country',
    example: 'USA',
  })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default address',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean = false;

  @ApiPropertyOptional({
    description: 'Recipient name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Mobile phone number',
    example: '1234567890',
  })
  @IsString()
  @IsOptional()
  mobileNumber?: string;

  @ApiPropertyOptional({
    description: 'Locality or neighborhood',
    example: 'Downtown',
  })
  @IsString()
  @IsOptional()
  locality?: string;

  @ApiPropertyOptional({
    description: 'Landmark for easier identification',
    example: 'Near Central Park',
  })
  @IsString()
  @IsOptional()
  landmark?: string;

  @ApiPropertyOptional({
    description: 'Alternative phone number',
    example: '0987654321',
  })
  @IsString()
  @IsOptional()
  alternatePhone?: string;

  @ApiPropertyOptional({
    description: 'Type of address (Home/Work)',
    example: 'Home',
  })
  @IsString()
  @IsOptional()
  addressType?: string;
}

export class UpdateAddressDto {
  @ApiPropertyOptional({
    description: 'Street address',
    example: '123 Main St',
  })
  @IsString()
  @IsOptional()
  street?: string;

  @ApiPropertyOptional({
    description: 'City',
    example: 'New York',
  })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({
    description: 'State or province',
    example: 'NY',
  })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    description: 'Zip or postal code',
    example: '10001',
  })
  @IsString()
  @IsOptional()
  zipCode?: string;

  @ApiPropertyOptional({
    description: 'Country',
    example: 'USA',
  })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiPropertyOptional({
    description: 'Whether this is the default address',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Recipient name',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Mobile phone number',
    example: '1234567890',
  })
  @IsString()
  @IsOptional()
  mobileNumber?: string;

  @ApiPropertyOptional({
    description: 'Locality or neighborhood',
    example: 'Downtown',
  })
  @IsString()
  @IsOptional()
  locality?: string;

  @ApiPropertyOptional({
    description: 'Landmark for easier identification',
    example: 'Near Central Park',
  })
  @IsString()
  @IsOptional()
  landmark?: string;

  @ApiPropertyOptional({
    description: 'Alternative phone number',
    example: '0987654321',
  })
  @IsString()
  @IsOptional()
  alternatePhone?: string;

  @ApiPropertyOptional({
    description: 'Type of address (Home/Work)',
    example: 'Home',
  })
  @IsString()
  @IsOptional()
  addressType?: string;
}
