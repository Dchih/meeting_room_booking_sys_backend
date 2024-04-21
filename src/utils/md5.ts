import * as crypto from 'crypto';

export function md5(pw: string) {
  const hash = crypto.createHash('md5');
  hash.update(pw);
  return hash.digest('hex');
}
