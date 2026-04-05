import { Marked } from 'marked';
import { gfmHeadingId } from 'marked-gfm-heading-id';
import hljs from 'highlight.js';

export async function renderMarkdown(raw: string): Promise<string> {
  const markedInstance = new Marked();

  markedInstance.use(gfmHeadingId());

  markedInstance.use({
    walkTokens(token) {
      if (token.type === 'code') {
        const lang = token.lang || 'plaintext';
        try {
          const highlightedCode = hljs.highlight(token.text as string, {
            language: lang,
          }).value;
          token.text = highlightedCode;
          // We mark it as escaped since we've already done the highlighting ourselves
          (token as any).escaped = true;
        } catch {
          // If highlighting fails, keep original text
        }
      }
    },
  });

  const html = await markedInstance.parse(raw);
  return String(html);
}
