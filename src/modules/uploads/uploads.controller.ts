import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  UseGuards,
  BadRequestException,
  Delete,
  Param,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { UploadsService, UploadedFileInfo } from './uploads.service';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { ErrorCode } from '../../common/constants/error-codes.enum';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

class UploadFileDto {
  @IsOptional()
  @IsString()
  @Length(1, 64)
  @Matches(/^[a-zA-Z0-9_\/-]*$/, {
    message: 'folder can only contain letters, numbers, dash, underscore, and slash',
  })
  folder?: string;
}

class UploadFromUrlDto {
  @IsString()
  @Length(1, 2048)
  @Matches(/^https?:\/\/.*$/, {
    message: 'url must be a valid HTTP or HTTPS URL',
  })
  url: string;

  @IsOptional()
  @IsString()
  @Length(1, 128)
  @Matches(/^[a-zA-Z0-9_.\-]+$/, {
    message: 'fileName can only contain letters, numbers, dot, dash, and underscore',
  })
  fileName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  @Matches(/^[a-zA-Z0-9_\/-]*$/, {
    message: 'folder can only contain letters, numbers, dash, underscore, and slash',
  })
  folder?: string;
}

class PresignedUrlDto {
  @IsString()
  @Length(1, 128)
  @Matches(/^[a-zA-Z0-9_.\-]+$/, {
    message: 'fileName can only contain letters, numbers, dot, dash, and underscore',
  })
  fileName: string;

  @IsString()
  @Length(3, 64)
  contentType: string;

  @IsOptional()
  @IsString()
  @Length(1, 64)
  @Matches(/^[a-zA-Z0-9_\/-]*$/, {
    message: 'folder can only contain letters, numbers, dash, underscore, and slash',
  })
  folder?: string;
}

@ApiTags('uploads')
@Controller('uploads')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiBearerAuth('JWT-auth')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('single')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          example: 'products',
          description: 'Folder to store the file in (default: general)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        url: { type: 'string' },
        originalName: { type: 'string' },
        mimetype: { type: 'string' },
        size: { type: 'number' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadFileDto: UploadFileDto,
  ): Promise<UploadedFileInfo> {
    if (!file) {
      throw new BadRequestException(
        'File is required',
        ErrorCode.INVALID_INPUT,
      );
    }

    return this.uploadsService.uploadFile(
      file,
      uploadFileDto.folder || 'general',
    );
  }

  @Post('multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
        folder: {
          type: 'string',
          example: 'products',
          description: 'Folder to store the files in (default: general)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          key: { type: 'string' },
          url: { type: 'string' },
          originalName: { type: 'string' },
          mimetype: { type: 'string' },
          size: { type: 'number' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10)) // Maximum 10 files
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadFileDto: UploadFileDto,
  ): Promise<UploadedFileInfo[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Files are required',
        ErrorCode.INVALID_INPUT,
      );
    }

    return this.uploadsService.uploadMultipleFiles(
      files,
      uploadFileDto.folder || 'general',
    );
  }

  @Post('from-url')
  @ApiOperation({ summary: 'Upload a file from URL' })
  @ApiBody({
    type: UploadFromUrlDto,
    description: 'URL and optional details for the file to upload',
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded from URL successfully',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        url: { type: 'string' },
        originalName: { type: 'string' },
        mimetype: { type: 'string' },
        size: { type: 'number' },
      },
    },
  })
  async uploadFromUrl(
    @Body() uploadFromUrlDto: UploadFromUrlDto,
  ): Promise<UploadedFileInfo> {
    const { url, fileName, folder } = uploadFromUrlDto;

    if (!url) {
      throw new BadRequestException(
        'URL is required',
        ErrorCode.INVALID_INPUT,
      );
    }

    return this.uploadsService.uploadFromUrl(
      url,
      fileName,
      folder || 'general',
    );
  }

  @Post('presigned-url')
  @ApiOperation({
    summary: 'Generate a presigned URL for direct client-side uploads',
  })
  @ApiBody({
    type: PresignedUrlDto,
    description: 'Information about the file to upload',
  })
  @ApiResponse({
    status: 201,
    description: 'Presigned URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
        uploadUrl: { type: 'string' },
        publicUrl: { type: 'string' },
      },
    },
  })
  async generatePresignedUrl(
    @Body() presignedUrlDto: PresignedUrlDto,
  ): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
    const { fileName, contentType, folder } = presignedUrlDto;

    if (!fileName || !contentType) {
      throw new BadRequestException(
        'fileName and contentType are required',
        ErrorCode.INVALID_INPUT,
      );
    }

    return this.uploadsService.generatePresignedUploadUrl(
      fileName,
      contentType,
      folder || 'general',
    );
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete a file by key' })
  @ApiParam({
    name: 'key',
    description: 'The file key to delete',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
      },
    },
  })
  @Roles('ADMIN') // Only admins can delete files
  async deleteFile(@Param('key') key: string): Promise<{ success: boolean }> {
    if (!key) {
      throw new BadRequestException(
        'File key is required',
        ErrorCode.INVALID_INPUT,
      );
    }

    const success = await this.uploadsService.deleteFile(key);
    return { success };
  }
}
