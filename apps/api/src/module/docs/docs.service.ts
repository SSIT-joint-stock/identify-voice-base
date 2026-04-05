import * as fs from 'node:fs';
import * as path from 'node:path';
import * as handlebars from 'handlebars';
import { renderMarkdown } from './markdown.util';

export class DocsService {
  private handlebars: typeof handlebars;
  private viewsDir: string;
  private partialsDir: string;

  constructor(private docsRoot: string) {
    this.viewsDir = path.join(
      process.cwd(),
      'src',
      'module',
      'docs',
      'templates',
    );
    this.partialsDir = path.join(this.viewsDir, 'partials');
    this.handlebars = handlebars.create();

    this.registerPartials();
    this.registerHelpers();
  }

  private registerPartials() {
    if (!fs.existsSync(this.partialsDir)) {
      return;
    }
    fs.readdirSync(this.partialsDir).forEach((file) => {
      if (file.endsWith('.hbs')) {
        const name = path.basename(file, '.hbs');
        const tpl = fs.readFileSync(path.join(this.partialsDir, file), 'utf8');
        this.handlebars.registerPartial(name, tpl);
      }
    });
  }

  private registerHelpers() {
    this.handlebars.registerHelper('eq', (a, b) => a === b);
  }

  async renderDoc(id: string) {
    let filePath = path.join(this.docsRoot, `${id}.md`);
    // If it's a directory, check for index.md
    if (fs.existsSync(id) && fs.lstatSync(id).isDirectory()) {
      filePath = path.join(id, 'index.md');
    }

    if (!fs.existsSync(filePath)) {
      return {
        id,
        html: '<h1>404 - Document Not Found</h1><p>The document you requested does not exist.</p>',
      };
    }

    const raw = await fs.promises.readFile(filePath, 'utf8');
    const html = await renderMarkdown(raw);
    return { id, html };
  }

  async renderDocTemplate(templateName: string, context: any): Promise<string> {
    const tplPath = path.join(this.viewsDir, `${templateName}.hbs`);
    if (!fs.existsSync(tplPath)) {
      throw new Error(`Template not found: ${tplPath}`);
    }
    const tplStr = await fs.promises.readFile(tplPath, 'utf8');
    const template = this.handlebars.compile(tplStr);
    return template(context);
  }
}
