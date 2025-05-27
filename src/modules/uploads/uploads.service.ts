import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import { AppLogger } from '../../common/services/logger.service';
import { ErrorCode } from '../../common/constants/error-codes.enum';
import { getFileExtension, sanitizeFilename, generateDateBasedFolder } from './uploads.utils';

export type UploadedFileInfo = {
  key: string;
  url: string;
  originalName: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class UploadsService {
  private s3Client: S3Client;
  private readonly bucket: string;
  private readonly baseUrl: string;
  private readonly allowedMimeTypes: string[];
  private readonly maxFileSize: number; // in bytes

  constructor(
    private configService: ConfigService,
    private logger: AppLogger,
  ) {
    this.logger.setContext('UploadsService');

    // Initialize S3 client
    const s3Config = this.configService.get('s3');
    
    if (!s3Config) {
      throw new Error('S3 configuration is missing');
    }

    this.s3Client = new S3Client({
      region: s3Config.region,
      credentials: s3Config.credentials,
    });

    this.bucket = s3Config.bucket;
    this.baseUrl = s3Config.baseUrl;
    
    // Set file upload restrictions
    this.allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
    ];
    
    // 10MB max file size
    this.maxFileSize = 10 * 1024 * 1024;
  }

  /**
   * Validates a file before upload
   */
  validateFile(file: Express.Multer.File): void {
    // Validate file exists
    if (!file) {
      throw new BadRequestException('File is required', ErrorCode.INVALID_INPUT);
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds the limit of ${this.maxFileSize / (1024 * 1024)}MB`,
        ErrorCode.INVALID_INPUT,
      );
    }

    // Validate file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
        ErrorCode.INVALID_INPUT,
      );
    }
  }

  /**
   * Generates a unique file key based on original filename, folder and timestamp
   */
  generateFileKey(file: Express.Multer.File, folder: string = 'general'): string {
    const sanitizedName = sanitizeFilename(file.originalname);
    const fileExtension = getFileExtension(sanitizedName);
    const timestamp = Date.now();
    const uuid = uuidv4();
    const dateBasedFolder = generateDateBasedFolder(folder);
    
    return `${dateBasedFolder}/${timestamp}-${uuid}.${fileExtension}`;
  }

  /**
   * Uploads a file to S3
   */
  async uploadFile(file: Express.Multer.File, folder: string = 'general'): Promise<UploadedFileInfo> {
    try {
      this.validateFile(file);
      
      const key = this.generateFileKey(file, folder);
      
      // Upload file to S3
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ContentDisposition: 'inline',
          // Add metadata for easier management
          Metadata: {
            originalname: sanitizeFilename(file.originalname),
            mimetype: file.mimetype,
          },
        }),
      );

      const url = `${this.baseUrl}/${key}`;
      
      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        key,
        url,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Failed to upload file: ${error.message}`, error);
      throw new InternalServerErrorException(
        'Failed to upload file to storage',
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Upload multiple files to S3
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'general',
  ): Promise<UploadedFileInfo[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided', ErrorCode.INVALID_INPUT);
    }

    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<boolean> {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      this.logger.log(`File deleted successfully: ${key}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error);
      throw new InternalServerErrorException(
        'Failed to delete file from storage',
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate a presigned URL for direct client-side uploads
   */
  async generatePresignedUploadUrl(
    fileName: string,
    contentType: string,
    folder: string = 'general',
  ): Promise<{ key: string; uploadUrl: string; publicUrl: string }> {
    try {
      // Validate content type
      if (!this.allowedMimeTypes.includes(contentType)) {
        throw new BadRequestException(
          `File type ${contentType} is not allowed. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
          ErrorCode.INVALID_INPUT,
        );
      }

      const sanitizedName = sanitizeFilename(fileName);
      const fileExtension = getFileExtension(sanitizedName);
      const timestamp = Date.now();
      const uuid = uuidv4();
      const dateBasedFolder = generateDateBasedFolder(folder);
      const key = `${dateBasedFolder}/${timestamp}-${uuid}.${fileExtension}`;
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ContentDisposition: 'inline',
        Metadata: {
          originalname: sanitizedName,
        },
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 }); // 1 hour
      const publicUrl = `${this.baseUrl}/${key}`;

      this.logger.log(`Presigned URL generated for file: ${key}`);
      
      return {
        key,
        uploadUrl,
        publicUrl,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Failed to generate presigned URL: ${error.message}`, error);
      throw new InternalServerErrorException(
        'Failed to generate upload URL',
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate a presigned URL for downloading/viewing a file
   */
  async generatePresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      
      this.logger.log(`Presigned download URL generated for file: ${key}`);
      
      return downloadUrl;
    } catch (error) {
      this.logger.error(`Failed to generate download URL: ${error.message}`, error);
      throw new InternalServerErrorException(
        'Failed to generate download URL',
        ErrorCode.INTERNAL_SERVER_ERROR,
      );
    }
  }
} 