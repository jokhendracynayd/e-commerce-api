import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { TemplateData } from '../interfaces/notification.interface';

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private readonly templatesDir: string;

  constructor() {
    // Templates directory will be in the dist folder when compiled
    this.templatesDir = path.join(__dirname, '..', 'templates');
    this.ensureTemplatesDirExists();
  }

  /**
   * Make sure the templates directory exists
   */
  private ensureTemplatesDirExists(): void {
    try {
      if (!fs.existsSync(this.templatesDir)) {
        fs.mkdirSync(this.templatesDir, { recursive: true });
        this.logger.log(`Created templates directory: ${this.templatesDir}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to create templates directory: ${error.message}`,
        error.stack,
      );
    }
  }

  /**
   * Get the path to a template file
   * @param templateName Template name
   * @returns Path to template file
   */
  getTemplatePath(templateName: string): string {
    return path.join(this.templatesDir, `${templateName}.hbs`);
  }

  /**
   * Check if a template exists
   * @param templateName Template name
   * @returns Boolean indicating if template exists
   */
  templateExists(templateName: string): boolean {
    const templatePath = this.getTemplatePath(templateName);
    return fs.existsSync(templatePath);
  }

  /**
   * Render a template with data
   * @param templateName Template name
   * @param data Template data
   * @returns Rendered template HTML
   */
  async renderTemplate(
    templateName: string,
    data: TemplateData,
  ): Promise<string> {
    try {
      const templatePath = this.getTemplatePath(templateName);

      if (!this.templateExists(templateName)) {
        this.logger.error(`Template not found: ${templateName}`);
        throw new Error(`Template not found: ${templateName}`);
      }

      // In this implementation, we're using the NestJS Mailer module with Handlebars,
      // so we don't need to manually render templates - they'll be processed automatically
      // when emails are sent. This method is provided for extensibility.

      this.logger.log(`Template found: ${templateName}`);
      return templatePath;
    } catch (error) {
      this.logger.error(
        `Failed to render template: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
