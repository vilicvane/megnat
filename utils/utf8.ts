export function isValidUTF8(buffer: Buffer) {
  return Buffer.from(buffer.toString('utf8'), 'utf8').equals(buffer);
}
