import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

const resolveCryptoKey = (secret?: string): Buffer => {
  if (!secret) {
    throw new Error('EMAIL_CONFIG_CRYPTO_KEY ausente');
  }

  const asBuffer = Buffer.from(secret, 'base64');
  if (asBuffer.length === 32) {
    return asBuffer;
  }

  const utf8Buffer = Buffer.from(secret, 'utf8');
  if (utf8Buffer.length === 32) {
    return utf8Buffer;
  }

  throw new Error('EMAIL_CONFIG_CRYPTO_KEY inválida: esperado 32 bytes em base64 ou utf8');
};

export const encryptPayload = (payload: Record<string, unknown>, secret = process.env.EMAIL_CONFIG_CRYPTO_KEY): string => {
  const key = resolveCryptoKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const plaintext = JSON.stringify(payload);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.from(
    JSON.stringify({
      v: 1,
      iv: iv.toString('base64'),
      content: encrypted.toString('base64'),
      tag: authTag.toString('base64'),
    }),
    'utf8',
  ).toString('base64');
};

export const decryptPayload = <T>(encryptedPayload: string, secret = process.env.EMAIL_CONFIG_CRYPTO_KEY): T => {
  const key = resolveCryptoKey(secret);
  const decoded = JSON.parse(Buffer.from(encryptedPayload, 'base64').toString('utf8')) as {
    iv: string;
    content: string;
    tag: string;
  };

  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(decoded.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(decoded.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(decoded.content, 'base64')),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString('utf8')) as T;
};
