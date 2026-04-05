import { Public } from '@/common/decorators/public.decorator';
import { Controller, Get, Logger, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import * as fs from 'node:fs';
import * as nodePath from 'node:path';
import { DocsService } from './docs.service';
import { SidebarService } from './sidebar.service';

@Controller('docs')
export class DocsController {
  private logger = new Logger(DocsController.name);
  private docsRoot: string;
  private sidebar: SidebarService;
  private service: DocsService;

  constructor() {
    this.docsRoot = nodePath.join(process.cwd(), 'docs');
    this.sidebar = new SidebarService(this.docsRoot);
    this.service = new DocsService(this.docsRoot);
  }

  @Public()
  @Get()
  getDocsRoot(@Res() res: Response) {
    return res.redirect('/docs/page/index');
  }

  @Public()
  @Get('sidebar')
  getSidebar() {
    return this.sidebar.getSidebar();
  }

  @Public()
  @Get('page/*path')
  async getPage(@Param('path') path: string, @Res() res: Response) {
    let id = path.replace(/,/g, '/');
    if (id.endsWith('.md')) {
      id = id.replace('.md', '');
    }

    if (id.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i)) {
      const filePath = nodePath.join(this.docsRoot, id);
      if (fs.existsSync(filePath)) {
        return res.sendFile(filePath);
      }
    }

    this.logger.log(`Rendering doc: ${id}`);
    const doc = await this.service.renderDoc(id);
    const sidebar = this.sidebar.getSidebar();

    const html = await this.service.renderDocTemplate('layout', {
      title: 'API Documentation',
      content: doc.html,
      sidebar,
      activeId: id,
    });

    res.setHeader('Content-Type', 'text/html').send(html);
  }
}
