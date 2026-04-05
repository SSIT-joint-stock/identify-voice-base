import * as fs from 'node:fs';
import * as path from 'node:path';

export type SidebarItem =
  | { type: 'doc'; label: string; id: string }
  | { type: 'category'; label: string; items: SidebarItem[] };

export class SidebarService {
  constructor(private readonly docsRoot: string) {}

  getSidebar(): SidebarItem[] {
    if (!fs.existsSync(this.docsRoot)) {
      return [];
    }
    return this.walkDir(this.docsRoot, this.docsRoot);
  }

  private walkDir(dir: string, base: string): SidebarItem[] {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const items: SidebarItem[] = [];

    // Prioritize overview folder first, then alphabetical
    const sortedEntries = entries.sort((a, b) => {
      const isAOverview = a.isDirectory() && a.name === 'overview';
      const isBOverview = b.isDirectory() && b.name === 'overview';
      if (isAOverview && !isBOverview) return -1;
      if (isBOverview && !isAOverview) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const entry of sortedEntries) {
      if (entry.name.startsWith('.')) continue;

      if (entry.isDirectory()) {
        const sub = this.walkDir(path.join(dir, entry.name), base);
        if (sub.length > 0) {
          items.push({
            type: 'category',
            label: this.formatLabel(entry.name),
            items: sub,
          });
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const id = path
          .relative(base, path.join(dir, entry.name))
          .replace(/\\/g, '/')
          .replace(/\.md$/, '');

        // Skip root index.md in the sidebar if you want, or include it
        items.push({
          type: 'doc',
          label:
            entry.name.toLowerCase() === 'index.md'
              ? 'Introduction'
              : this.formatLabel(entry.name.replace(/\.md$/, '')),
          id,
        });
      }
    }

    return items;
  }

  private formatLabel(name: string): string {
    return name
      .replace(/^\d+[-_—\s]+/, '') // Strip leading numeric prefixes like 00_, 01-
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
