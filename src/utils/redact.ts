export function redactSecrets(text: string): string {
  return text
    .replace(/(Bearer\s+)[a-zA-Z0-9\-_.]+/gi, '$1***')
    .replace(
      /(token|api_key|password|secret|key)=([a-zA-Z0-9\-_.]+)/gi,
      '$1=***',
    );
}
