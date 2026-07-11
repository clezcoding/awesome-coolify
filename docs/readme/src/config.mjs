export const meta = {
  name: 'Coolify MCP Server',
  tagline: 'One MCP server. Multiple Coolify instances. Zero workarounds.',
  taglineDe: 'Ein MCP-Server. Mehrere Coolify-Instanzen. Keine Workarounds.',
  repo: 'https://github.com/clezcoding/awesome-coolify-mcp',
  npm: '@clezcoding/coolify-mcp',
  coolifyApi: '4.1.x',
  status: 'planning',
};

export const badges = [
  { label: 'status', message: 'planning', color: 'yellow', style: 'for-the-badge' },
  { label: 'TypeScript', message: '5.x', color: '3178C6', logo: 'typescript', logoColor: 'white', style: 'for-the-badge' },
  { label: 'MCP', message: 'Model Context Protocol', color: '6366F1', style: 'for-the-badge' },
  { label: 'Coolify', message: 'API 4.1.x', color: '9333EA', style: 'for-the-badge' },
  { label: 'License', message: 'MIT', color: '22c55e', style: 'for-the-badge' },
  { label: 'npm', message: 'coming soon', color: 'CB3837', logo: 'npm', logoColor: 'white', style: 'for-the-badge' },
];

export function shieldUrl({ label, message, color, logo, logoColor, style = 'flat-square' }) {
  const base = `https://img.shields.io/badge/${encodeURIComponent(label)}-${encodeURIComponent(message)}-${color}?style=${style}`;
  if (!logo) return base;
  return `${base}&logo=${logo}${logoColor ? `&logoColor=${logoColor}` : ''}`;
}

export const navLinks = [
  { label: 'Quick Start', href: '#quick-start' },
  { label: 'Features', href: '#features' },
  { label: 'Architecture', href: '#architecture' },
  { label: 'Deutsch', href: '#deutsch' },
  { label: 'English', href: '#english' },
  { label: 'Roadmap', href: '#roadmap' },
  { label: 'Contributing', href: '#contributing' },
];
