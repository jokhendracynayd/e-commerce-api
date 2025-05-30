import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';
import {
  UserResponseDto,
  UpdateUserDto,
  ChangePasswordDto,
  CreateAddressDto,
  UpdateAddressDto,
  AddressDto,
} from './dto';
import { AppLogger } from '../../common/services/logger.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly logger: AppLogger,
  ) {
    this.logger.setContext('UsersService');
  }

  // Get user by ID
  async getUserById(id: string): Promise<UserResponseDto> {
    try {
      const user = await this.prismaService.user.findUnique({
        where: { id },
        select: this.getUserSelect(),
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      return user as UserResponseDto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error fetching user with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch user');
    }
  }

  // Get all users (with pagination and filtering)
  async getUsers(params: {
    skip?: number;
    take?: number;
    orderBy?: Prisma.UserOrderByWithRelationInput;
    where?: Prisma.UserWhereInput;
  }): Promise<{ users: UserResponseDto[]; total: number }> {
    const {
      skip = 0,
      take = 10,
      orderBy = { createdAt: 'desc' },
      where = {},
    } = params;

    try {
      const [users, total] = await Promise.all([
        this.prismaService.user.findMany({
          skip,
          take,
          where,
          orderBy,
          select: this.getUserSelect(),
        }),
        this.prismaService.user.count({ where }),
      ]);

      return {
        users: users as UserResponseDto[],
        total,
      };
    } catch (error) {
      this.logger.error(`Error fetching users: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to fetch users');
    }
  }

  // Update user
  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    try {
      // Check if user exists
      const userExists = await this.prismaService.user.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!userExists) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Check if phone is unique if provided
      if (updateUserDto.phone) {
        const phoneExists = await this.prismaService.user.findFirst({
          where: {
            phone: updateUserDto.phone,
            id: { not: id },
          },
          select: { id: true },
        });

        if (phoneExists) {
          throw new ConflictException('Phone number is already in use');
        }
      }

      // Update the user
      const updatedUser = await this.prismaService.user.update({
        where: { id },
        data: updateUserDto,
        select: this.getUserSelect(),
      });

      return updatedUser as UserResponseDto;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error(
        `Error updating user with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update user');
    }
  }

  // Change user password
  async changePassword(
    id: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ success: boolean }> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'New password and confirmation do not match',
      );
    }

    try {
      // Get user with password
      const user = await this.prismaService.user.findUnique({
        where: { id },
        select: { id: true, password: true },
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${id} not found`);
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password,
      );
      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }

      // Validate password strength
      this.validatePasswordStrength(newPassword);

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Update password
      await this.prismaService.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          lastPasswordChange: new Date(),
        },
      });

      this.logger.log(`Password changed for user with ID ${id}`);
      return { success: true };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Error changing password for user with ID ${id}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to change password');
    }
  }

  // Get user addresses
  async getUserAddresses(userId: string): Promise<AddressDto[]> {
    try {
      // Check if user exists
      const userExists = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const addresses = await this.prismaService.address.findMany({
        where: { userId },
        orderBy: { isDefault: 'desc' },
      });

      return addresses as AddressDto[];
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error fetching addresses for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch addresses');
    }
  }

  // Get user address by ID
  async getUserAddressById(
    userId: string,
    addressId: string,
  ): Promise<AddressDto> {
    try {
      const address = await this.prismaService.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!address) {
        throw new NotFoundException(
          `Address with ID ${addressId} not found for user ${userId}`,
        );
      }

      return address as AddressDto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error fetching address ${addressId} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to fetch address');
    }
  }

  // Create user address
  async createUserAddress(
    userId: string,
    createAddressDto: CreateAddressDto,
  ): Promise<AddressDto> {
    try {
      // Check if user exists
      const userExists = await this.prismaService.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!userExists) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // If this is the default address, unset other default addresses
      if (createAddressDto.isDefault) {
        await this.prismaService.address.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      // If this is the first address, make it default
      const addressCount = await this.prismaService.address.count({
        where: { userId },
      });

      if (addressCount === 0) {
        createAddressDto.isDefault = true;
      }

      // Create the address
      const address = await this.prismaService.address.create({
        data: {
          ...createAddressDto,
          user: { connect: { id: userId } },
        },
      });

      return address as AddressDto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error creating address for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to create address');
    }
  }

  // Update user address
  async updateUserAddress(
    userId: string,
    addressId: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<AddressDto> {
    try {
      // Check if address exists and belongs to the user
      const address = await this.prismaService.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!address) {
        throw new NotFoundException(
          `Address with ID ${addressId} not found for user ${userId}`,
        );
      }

      // If setting as default, unset other default addresses
      if (updateAddressDto.isDefault) {
        await this.prismaService.address.updateMany({
          where: {
            userId,
            id: { not: addressId },
          },
          data: { isDefault: false },
        });
      }

      // Update the address
      const updatedAddress = await this.prismaService.address.update({
        where: { id: addressId },
        data: updateAddressDto,
      });

      return updatedAddress as AddressDto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error updating address ${addressId} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to update address');
    }
  }

  // Delete user address
  async deleteUserAddress(userId: string, addressId: string): Promise<void> {
    try {
      // Check if address exists and belongs to the user
      const address = await this.prismaService.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!address) {
        throw new NotFoundException(
          `Address with ID ${addressId} not found for user ${userId}`,
        );
      }

      // Delete the address
      await this.prismaService.address.delete({
        where: { id: addressId },
      });

      // If the deleted address was the default, set another address as default if available
      if (address.isDefault) {
        const anotherAddress = await this.prismaService.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        });

        if (anotherAddress) {
          await this.prismaService.address.update({
            where: { id: anotherAddress.id },
            data: { isDefault: true },
          });
        }
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error deleting address ${addressId} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to delete address');
    }
  }

  // Set default address
  async setDefaultAddress(
    userId: string,
    addressId: string,
  ): Promise<AddressDto> {
    try {
      // Check if address exists and belongs to the user
      const address = await this.prismaService.address.findFirst({
        where: {
          id: addressId,
          userId,
        },
      });

      if (!address) {
        throw new NotFoundException(
          `Address with ID ${addressId} not found for user ${userId}`,
        );
      }

      // Update all addresses to not be default
      await this.prismaService.address.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      // Set this address as default
      const updatedAddress = await this.prismaService.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });

      return updatedAddress as AddressDto;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Error setting default address ${addressId} for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to set default address');
    }
  }

  // Private methods
  private getUserSelect() {
    return {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      gender: true,
      status: true,
      role: true,
      lastLoginAt: true,
      profileImage: true,
      dateOfBirth: true,
      bio: true,
      createdAt: true,
      updatedAt: true,
      password: false,
    };
  }

  private validatePasswordStrength(password: string): void {
    if (password.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    if (!/(?=.*[a-zA-Z])/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one letter',
      );
    }

    if (!/(?=.*\d)/.test(password)) {
      throw new BadRequestException(
        'Password must contain at least one number',
      );
    }
  }
}
