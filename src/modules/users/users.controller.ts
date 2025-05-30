import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  UserResponseDto,
  UpdateUserDto,
  ChangePasswordDto,
  AddressDto,
  CreateAddressDto,
  UpdateAddressDto,
} from './dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

// Define interface for the authenticated request
interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Get current user profile
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile',
    type: UserResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  getProfile(@Req() req: RequestWithUser): Promise<UserResponseDto> {
    return this.usersService.getUserById(req.user.id);
  }

  // Update current user profile
  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Updated user profile',
    type: UserResponseDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Phone number already in use' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: UpdateUserDto })
  updateProfile(
    @Req() req: RequestWithUser,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(req.user.id, updateUserDto);
  }

  // Change current user password
  @Patch('me/password')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Change current user password' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password changed successfully',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid input data or passwords do not match',
  })
  @ApiUnauthorizedResponse({
    description: 'Unauthorized or incorrect current password',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: ChangePasswordDto })
  changePassword(
    @Req() req: RequestWithUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ success: boolean }> {
    return this.usersService.changePassword(req.user.id, changePasswordDto);
  }

  // Get all users (admin only)
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all users (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of users',
    schema: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserResponseDto' },
        },
        total: {
          type: 'number',
          example: 42,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Not an admin' })
  @ApiBearerAuth('JWT-auth')
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Number of records to skip',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Number of records to take',
  })
  @ApiQuery({
    name: 'email',
    required: false,
    type: String,
    description: 'Filter by email',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: Role,
    description: 'Filter by role',
  })
  async getUsers(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('email') email?: string,
    @Query('role') role?: Role,
  ): Promise<{ users: UserResponseDto[]; total: number }> {
    const where: any = {};

    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    if (role) {
      where.role = role;
    }

    return this.usersService.getUsers({
      skip: skip ? +skip : undefined,
      take: take ? +take : undefined,
      where,
    });
  }

  // Get user by ID (admin only)
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User profile',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Not an admin' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'User ID' })
  getUserById(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.getUserById(id);
  }

  // Update user by ID (admin only)
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user by ID (admin only)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Updated user profile',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiConflictResponse({ description: 'Phone number already in use' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'Forbidden - Not an admin' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiBody({ type: UpdateUserDto })
  updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateUser(id, updateUserDto);
  }

  // Address management endpoints

  // Get all addresses for current user
  @Get('me/addresses')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get all addresses for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of addresses',
    type: [AddressDto],
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  getUserAddresses(@Req() req: RequestWithUser): Promise<AddressDto[]> {
    return this.usersService.getUserAddresses(req.user.id);
  }

  // Get address by ID for current user
  @Get('me/addresses/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get address by ID for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address details',
    type: AddressDto,
  })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Address ID' })
  getUserAddressById(
    @Req() req: RequestWithUser,
    @Param('id') addressId: string,
  ): Promise<AddressDto> {
    return this.usersService.getUserAddressById(req.user.id, addressId);
  }

  // Create new address for current user
  @Post('me/addresses')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create new address for current user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Created address',
    type: AddressDto,
  })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({ type: CreateAddressDto })
  createUserAddress(
    @Req() req: RequestWithUser,
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<AddressDto> {
    return this.usersService.createUserAddress(req.user.id, createAddressDto);
  }

  // Update address for current user
  @Patch('me/addresses/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update address for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Updated address',
    type: AddressDto,
  })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @ApiBadRequestResponse({ description: 'Invalid input data' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Address ID' })
  @ApiBody({ type: UpdateAddressDto })
  updateUserAddress(
    @Req() req: RequestWithUser,
    @Param('id') addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<AddressDto> {
    return this.usersService.updateUserAddress(
      req.user.id,
      addressId,
      updateAddressDto,
    );
  }

  // Delete address for current user
  @Delete('me/addresses/:id')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete address for current user' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Address deleted',
  })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Address ID' })
  async deleteUserAddress(
    @Req() req: RequestWithUser,
    @Param('id') addressId: string,
  ): Promise<void> {
    await this.usersService.deleteUserAddress(req.user.id, addressId);
  }

  // Set address as default for current user
  @Patch('me/addresses/:id/default')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Set address as default for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address set as default',
    type: AddressDto,
  })
  @ApiNotFoundResponse({ description: 'Address not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiBearerAuth('JWT-auth')
  @ApiParam({ name: 'id', description: 'Address ID' })
  setDefaultAddress(
    @Req() req: RequestWithUser,
    @Param('id') addressId: string,
  ): Promise<AddressDto> {
    return this.usersService.setDefaultAddress(req.user.id, addressId);
  }
}
