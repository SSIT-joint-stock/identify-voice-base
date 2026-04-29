import { Injectable } from '@nestjs/common';
import { AlignmentType, Document, Packer, Paragraph, TextRun } from 'docx';
import pdfMake from 'pdfmake';
import robotoFonts from 'pdfmake/fonts/Roboto';
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import {
  TranslateExportRequestDto,
  type TranslateExportFormat,
} from '../dto/translate-request.dto';

const MIME_TYPES: Record<TranslateExportFormat, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};

pdfMake.setFonts(robotoFonts);

@Injectable()
export class TranslateExportService {
  async export(dto: TranslateExportRequestDto) {
    const filename = this.buildFilename(dto.filename, dto.format);
    const buffer =
      dto.format === 'docx'
        ? await this.createDocx(dto.text, dto.title)
        : await this.createPdf(dto.text, dto.title);

    return {
      buffer,
      filename,
      mimeType: MIME_TYPES[dto.format],
    };
  }

  private async createDocx(text: string, title?: string) {
    const paragraphs = this.toTextBlocks(text).map(
      (block) =>
        new Paragraph({
          children: [
            new TextRun({
              text: block,
              size: 24,
            }),
          ],
          spacing: {
            after: 180,
            line: 360,
          },
        }),
    );

    const document = new Document({
      sections: [
        {
          children: [
            ...(title?.trim()
              ? [
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: title.trim(),
                        bold: true,
                        size: 32,
                      }),
                    ],
                    spacing: {
                      after: 300,
                    },
                  }),
                ]
              : []),
            ...paragraphs,
          ],
        },
      ],
    });

    return Packer.toBuffer(document);
  }

  private async createPdf(text: string, title?: string) {
    const content: Content[] = [
      ...(title?.trim()
        ? [
            {
              text: title.trim(),
              style: 'title',
              alignment: 'center' as const,
              margin: [0, 0, 0, 18] as [number, number, number, number],
            },
          ]
        : []),
      ...this.toTextBlocks(text).map((block) => ({
        text: block,
        margin: [0, 0, 0, 10] as [number, number, number, number],
      })),
    ];

    const definition: TDocumentDefinitions = {
      content,
      defaultStyle: {
        font: 'Roboto',
        fontSize: 12,
        lineHeight: 1.35,
      },
      styles: {
        title: {
          bold: true,
          fontSize: 18,
        },
      },
      pageMargins: [48, 56, 48, 56],
    };

    return pdfMake.createPdf(definition).getBuffer();
  }

  private toTextBlocks(text: string) {
    const normalizedText = text.replace(/\r\n/g, '\n').trim();

    if (!normalizedText) {
      return [''];
    }

    return normalizedText
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
  }

  private buildFilename(
    filename: string | undefined,
    format: TranslateExportFormat,
  ) {
    const baseName = (filename?.trim() || 'ban-dich')
      .replace(/\.[^.]+$/, '')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120);

    return `${baseName || 'ban-dich'}.${format}`;
  }
}
