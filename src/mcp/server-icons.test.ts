import { describe, expect, it } from 'vitest';

describe('buildMcpServerIcons', () => {
  it('returns at least 3 icon entries (BRND-01)', async () => {
    const { buildMcpServerIcons } = await import('./server-icons.js');
    const icons = buildMcpServerIcons();
    expect(icons.length).toBeGreaterThanOrEqual(3);
  });

  it('first icon is data URI with sizes 192x192 (D-02)', async () => {
    const { buildMcpServerIcons } = await import('./server-icons.js');
    const icons = buildMcpServerIcons();
    expect(icons[0].src).toMatch(/^data:image\/png;base64,/);
    expect(icons[0].sizes).toEqual(['192x192']);
  });

  it('includes jsDelivr favicon-32.png CDN entry (D-01)', async () => {
    const { buildMcpServerIcons } = await import('./server-icons.js');
    const icons = buildMcpServerIcons();
    const urls = icons.map((i) => i.src);
    expect(urls.some((u) => u.includes('jsdelivr.net') && u.includes('favicon-32.png'))).toBe(
      true,
    );
  });

  it('includes jsDelivr mcp-icon-192.png CDN entry (D-01)', async () => {
    const { buildMcpServerIcons } = await import('./server-icons.js');
    const icons = buildMcpServerIcons();
    const urls = icons.map((i) => i.src);
    expect(urls.some((u) => u.includes('jsdelivr.net') && u.includes('mcp-icon-192.png'))).toBe(
      true,
    );
  });

  it('every entry has mimeType image/png (BRND-01)', async () => {
    const { buildMcpServerIcons } = await import('./server-icons.js');
    const icons = buildMcpServerIcons();
    expect(icons.every((i) => i.mimeType === 'image/png')).toBe(true);
  });
});
