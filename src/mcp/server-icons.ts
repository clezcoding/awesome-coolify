import { MCP_ICON_192_BASE64 } from './mcp-icon-data.js';

const CDN = 'https://cdn.jsdelivr.net/gh/clezcoding/awesome-coolify@main/docs/assets';

export function buildMcpServerIcons() {
  return [
    {
      src: `data:image/png;base64,${MCP_ICON_192_BASE64}`,
      mimeType: 'image/png',
      sizes: ['192x192'],
    },
    {
      src: `${CDN}/favicon-32.png`,
      mimeType: 'image/png',
      sizes: ['32x32'],
    },
    {
      src: `${CDN}/mcp-icon-192.png`,
      mimeType: 'image/png',
      sizes: ['192x192'],
    },
  ];
}
