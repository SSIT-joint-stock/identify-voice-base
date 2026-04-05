import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import * as fs from 'fs';
import * as Handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';
import * as path from 'path';
import { z } from 'zod';

import EmailConfig from '@/config/email.config';

const emailSchema = z.string().email();

@Injectable()
export class WorkerEmailService implements OnModuleInit {
  private readonly logger = new Logger(WorkerEmailService.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly templateCache = new Map<
    string,
    HandlebarsTemplateDelegate
  >();

  constructor(
    @Inject(EmailConfig.KEY)
    private readonly emailConfig: ConfigType<typeof EmailConfig>,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.emailConfig.host,
      port: this.emailConfig.port,
      secure: this.emailConfig.secure,
      auth: {
        user: this.emailConfig.user,
        pass: this.emailConfig.pass,
      },
      ...({ family: 4 } as any), // Force IPv4 to prevent IPv6 timeouts on cloud providers
    });
  }

  async onModuleInit() {
    this.logger.log(
      `Initializing Email Worker with SMTP: ${this.emailConfig.host}:${this.emailConfig.port} (secure: ${this.emailConfig.secure})`,
    );
    // Verify transporter on initialization
    await this.verifyTransporter();
  }

  private async verifyTransporter(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('Email transporter verified successfully');
    } catch (error) {
      this.logger.error(
        `Email transporter verification failed: ${error.message}`,
      );
      throw new Error('Email transporter configuration is invalid');
    }
  }

  private getCompiledTemplate(
    templateName: string,
  ): HandlebarsTemplateDelegate {
    if (!this.templateCache.has(templateName)) {
      let templatePath = path.join(
        process.cwd(),
        this.emailConfig.templatesPath,
        `${templateName}.hbs`,
      );

      if (!fs.existsSync(templatePath)) {
        // Fallback for production where we might be running from dist/workers/email
        const fallbackPath = path.join(
          __dirname,
          '..',
          '..',
          'module',
          'email',
          'templates',
          `${templateName}.hbs`,
        );
        if (fs.existsSync(fallbackPath)) {
          templatePath = fallbackPath;
        } else {
          throw new Error(
            `Email template '${templateName}' not found at ${templatePath} or ${fallbackPath}`,
          );
        }
      }

      const templateSource = fs.readFileSync(templatePath, 'utf8');
      this.templateCache.set(templateName, Handlebars.compile(templateSource));
    }
    return this.templateCache.get(templateName)!;
  }

  async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    // Validate email
    emailSchema.parse(to);

    try {
      const result = await this.transporter.sendMail({
        from: this.emailConfig.from,
        to,
        subject,
        text,
        html,
      });

      this.logger.log(
        `Email sent successfully to ${to} with messageId: ${result.messageId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}: ${error.message}`);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  async sendTemplatedEmail(
    to: string,
    templateName: string,
    context: Record<string, any>,
  ): Promise<void> {
    // Validate email
    emailSchema.parse(to);

    try {
      const template = this.getCompiledTemplate(templateName);
      const html = template(context);

      // Generate subject from template or use default
      const subject =
        context.subject || `Message from ${this.emailConfig.from}`;

      await this.sendEmail(to, subject, '', html);
    } catch (error) {
      this.logger.error(
        `Failed to send templated email to ${to}: ${error.message}`,
      );
      throw error;
    }
  }

  async sendVerificationEmail(
    to: string,
    code: string,
    ttl: Date,
  ): Promise<void> {
    await this.sendTemplatedEmail(to, 'verification', {
      code,
      ttl: ttl.toISOString(),
      subject: 'Verify your email',
    });
  }

  async sendForgotPasswordEmail(
    to: string,
    code: string,
    ttl: Date,
  ): Promise<void> {
    await this.sendTemplatedEmail(to, 'forgot-password', {
      code,
      ttl: ttl.toISOString(),
      subject: 'Reset your password',
    });
  }
}
