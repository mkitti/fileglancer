/**
 * Browser-side SSH Key Generation
 *
 * Generates OpenSSH-compatible key pairs using the Web Crypto API.
 * Supports Ed25519 (preferred) with RSA-4096 fallback for older browsers.
 * Supports passphrase encryption using AES-256-CTR with bcrypt key derivation.
 *
 * Keys are generated entirely in the browser - nothing is sent to any server.
 */

import { bcryptPbkdf } from './bcryptPbkdf';

/** Result of SSH key generation */
export type SSHKeyPair = {
  publicKey: string;
  privateKey: string;
  keyType: 'Ed25519' | 'RSA-4096';
};

/** Options for SSH key generation */
export type SSHKeyGenOptions = {
  /** Optional comment to include in the key (e.g., "user@hostname") */
  comment?: string;
  /** Optional passphrase to encrypt the private key */
  passphrase?: string;
  /** Number of bcrypt rounds for key derivation (default: 16) */
  rounds?: number;
};

/** Encryption parameters for private key */
type EncryptionParams = {
  cipherName: string;
  kdfName: string;
  kdfOptions: Uint8Array;
  encrypt: (data: Uint8Array) => Promise<Uint8Array>;
};

// =============================================================================
// Encryption Helpers
// =============================================================================

/** Default number of bcrypt rounds for key derivation */
const DEFAULT_BCRYPT_ROUNDS = 16;

/** Salt size for bcrypt key derivation */
const BCRYPT_SALT_SIZE = 16;

/** AES-256-CTR key size in bytes */
const AES256_KEY_SIZE = 32;

/** AES block size / IV size in bytes */
const AES_BLOCK_SIZE = 16;

/**
 * Sets up encryption parameters for passphrase-protected keys.
 * Uses AES-256-CTR with bcrypt key derivation (OpenSSH standard).
 */
async function setupEncryption(
  passphrase: string,
  rounds: number = DEFAULT_BCRYPT_ROUNDS
): Promise<EncryptionParams> {
  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(BCRYPT_SALT_SIZE));

  // Derive key material using bcrypt_pbkdf
  // We need key (32 bytes) + IV (16 bytes) = 48 bytes
  const keyMaterial = bcryptPbkdf(
    new TextEncoder().encode(passphrase),
    salt,
    rounds,
    AES256_KEY_SIZE + AES_BLOCK_SIZE
  );

  const aesKey = keyMaterial.slice(0, AES256_KEY_SIZE);
  const iv = keyMaterial.slice(AES256_KEY_SIZE);

  // Import AES key for Web Crypto
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    aesKey,
    { name: 'AES-CTR' },
    false,
    ['encrypt']
  );

  // Build KDF options: salt length (4 bytes) + salt + rounds (4 bytes)
  const kdfOptions = new Uint8Array(4 + salt.length + 4);
  const kdfView = new DataView(kdfOptions.buffer);
  kdfView.setUint32(0, salt.length, false);
  kdfOptions.set(salt, 4);
  kdfView.setUint32(4 + salt.length, rounds, false);

  return {
    cipherName: 'aes256-ctr',
    kdfName: 'bcrypt',
    kdfOptions,
    encrypt: async (data: Uint8Array): Promise<Uint8Array> => {
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-CTR', counter: iv, length: 64 },
        cryptoKey,
        data
      );
      return new Uint8Array(encrypted);
    }
  };
}

// =============================================================================
// Ed25519 Key Generation
// =============================================================================

/**
 * Encodes a raw Ed25519 public key in OpenSSH format.
 */
function encodeOpenSSHPublicKeyEd25519(
  rawPublicKey: Uint8Array,
  comment: string
): string {
  const keyType = 'ssh-ed25519';
  const keyTypeBytes = new TextEncoder().encode(keyType);

  const buffer = new ArrayBuffer(
    4 + keyTypeBytes.length + 4 + rawPublicKey.length
  );
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let offset = 0;
  view.setUint32(offset, keyTypeBytes.length, false);
  offset += 4;
  bytes.set(keyTypeBytes, offset);
  offset += keyTypeBytes.length;
  view.setUint32(offset, rawPublicKey.length, false);
  offset += 4;
  bytes.set(rawPublicKey, offset);

  const base64Key = btoa(String.fromCharCode(...bytes));
  return comment
    ? `${keyType} ${base64Key} ${comment}`
    : `${keyType} ${base64Key}`;
}

/**
 * Encodes Ed25519 key pair in OpenSSH private key format.
 * Supports optional passphrase encryption.
 */
async function encodeOpenSSHPrivateKeyEd25519(
  rawPrivateKey: Uint8Array,
  rawPublicKey: Uint8Array,
  comment: string,
  encryption?: EncryptionParams
): Promise<string> {
  const keyType = 'ssh-ed25519';
  const keyTypeBytes = new TextEncoder().encode(keyType);
  const commentBytes = new TextEncoder().encode(comment);
  const authMagic = new TextEncoder().encode('openssh-key-v1\0');

  // Use encryption params or defaults for unencrypted
  const cipherNameStr = encryption?.cipherName ?? 'none';
  const kdfNameStr = encryption?.kdfName ?? 'none';
  const cipherNameBytes = new TextEncoder().encode(cipherNameStr);
  const kdfNameBytes = new TextEncoder().encode(kdfNameStr);
  const kdfOptions = encryption?.kdfOptions ?? new Uint8Array(0);

  const checkInt = crypto.getRandomValues(new Uint32Array(1))[0];

  const privateKeyWithPublic = new Uint8Array(64);
  privateKeyWithPublic.set(rawPrivateKey, 0);
  privateKeyWithPublic.set(rawPublicKey, 32);

  // Build private section
  const privateSectionLength =
    4 + // checkInt
    4 + // checkInt (repeated)
    4 +
    keyTypeBytes.length + // key type
    4 +
    rawPublicKey.length + // public key
    4 +
    privateKeyWithPublic.length + // private key (includes public)
    4 +
    commentBytes.length; // comment

  // Padding to cipher block size (16 for AES, 8 for unencrypted)
  const blockSize = encryption ? AES_BLOCK_SIZE : 8;
  const paddingLength =
    (blockSize - (privateSectionLength % blockSize)) % blockSize;
  const paddedPrivateSectionLength = privateSectionLength + paddingLength;

  const privateSection = new Uint8Array(paddedPrivateSectionLength);
  const privateView = new DataView(privateSection.buffer);
  let pOffset = 0;

  privateView.setUint32(pOffset, checkInt, false);
  pOffset += 4;
  privateView.setUint32(pOffset, checkInt, false);
  pOffset += 4;
  privateView.setUint32(pOffset, keyTypeBytes.length, false);
  pOffset += 4;
  privateSection.set(keyTypeBytes, pOffset);
  pOffset += keyTypeBytes.length;
  privateView.setUint32(pOffset, rawPublicKey.length, false);
  pOffset += 4;
  privateSection.set(rawPublicKey, pOffset);
  pOffset += rawPublicKey.length;
  privateView.setUint32(pOffset, privateKeyWithPublic.length, false);
  pOffset += 4;
  privateSection.set(privateKeyWithPublic, pOffset);
  pOffset += privateKeyWithPublic.length;
  privateView.setUint32(pOffset, commentBytes.length, false);
  pOffset += 4;
  privateSection.set(commentBytes, pOffset);
  pOffset += commentBytes.length;

  // Add padding bytes (1, 2, 3, ...)
  for (let i = 0; i < paddingLength; i++) {
    privateSection[pOffset + i] = (i + 1) & 0xff;
  }

  // Encrypt private section if passphrase provided
  const finalPrivateSection = encryption
    ? await encryption.encrypt(privateSection)
    : privateSection;

  // Build public section
  const publicSectionLength = 4 + keyTypeBytes.length + 4 + rawPublicKey.length;
  const publicSection = new Uint8Array(publicSectionLength);
  const publicView = new DataView(publicSection.buffer);
  let pubOffset = 0;

  publicView.setUint32(pubOffset, keyTypeBytes.length, false);
  pubOffset += 4;
  publicSection.set(keyTypeBytes, pubOffset);
  pubOffset += keyTypeBytes.length;
  publicView.setUint32(pubOffset, rawPublicKey.length, false);
  pubOffset += 4;
  publicSection.set(rawPublicKey, pubOffset);

  // Calculate total length
  const totalLength =
    authMagic.length +
    4 +
    cipherNameBytes.length +
    4 +
    kdfNameBytes.length +
    4 +
    kdfOptions.length +
    4 + // number of keys
    4 +
    publicSectionLength +
    4 +
    finalPrivateSection.length;

  // Build full key
  const fullKey = new Uint8Array(totalLength);
  const fullView = new DataView(fullKey.buffer);
  let fOffset = 0;

  fullKey.set(authMagic, fOffset);
  fOffset += authMagic.length;
  fullView.setUint32(fOffset, cipherNameBytes.length, false);
  fOffset += 4;
  fullKey.set(cipherNameBytes, fOffset);
  fOffset += cipherNameBytes.length;
  fullView.setUint32(fOffset, kdfNameBytes.length, false);
  fOffset += 4;
  fullKey.set(kdfNameBytes, fOffset);
  fOffset += kdfNameBytes.length;
  fullView.setUint32(fOffset, kdfOptions.length, false);
  fOffset += 4;
  fullKey.set(kdfOptions, fOffset);
  fOffset += kdfOptions.length;
  fullView.setUint32(fOffset, 1, false); // number of keys
  fOffset += 4;
  fullView.setUint32(fOffset, publicSectionLength, false);
  fOffset += 4;
  fullKey.set(publicSection, fOffset);
  fOffset += publicSectionLength;
  fullView.setUint32(fOffset, finalPrivateSection.length, false);
  fOffset += 4;
  fullKey.set(finalPrivateSection, fOffset);

  const base64 = btoa(String.fromCharCode(...fullKey));
  const wrapped = base64.match(/.{1,70}/g)!.join('\n');

  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${wrapped}\n-----END OPENSSH PRIVATE KEY-----\n`;
}

/**
 * Generates an Ed25519 SSH key pair using the Web Crypto API.
 */
async function generateEd25519KeyPair(
  comment: string,
  encryption?: EncryptionParams
): Promise<SSHKeyPair> {
  const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, [
    'sign',
    'verify'
  ]);

  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  const publicKeyBytes = new Uint8Array(publicKeyRaw);

  const privateKeyPkcs8 = await crypto.subtle.exportKey(
    'pkcs8',
    keyPair.privateKey
  );
  const privateKeyPkcs8Bytes = new Uint8Array(privateKeyPkcs8);
  const rawPrivateKey = privateKeyPkcs8Bytes.slice(-32);

  return {
    publicKey: encodeOpenSSHPublicKeyEd25519(publicKeyBytes, comment),
    privateKey: await encodeOpenSSHPrivateKeyEd25519(
      rawPrivateKey,
      publicKeyBytes,
      comment,
      encryption
    ),
    keyType: 'Ed25519'
  };
}

// =============================================================================
// RSA Key Generation (Fallback)
// =============================================================================

type RSAKeyComponents = {
  n: Uint8Array;
  e: Uint8Array;
  d: Uint8Array;
  p: Uint8Array;
  q: Uint8Array;
  dp: Uint8Array;
  dq: Uint8Array;
  qi: Uint8Array;
};

/**
 * Parses a DER-encoded integer from a byte array.
 */
function parseDerInteger(
  bytes: Uint8Array,
  offset: number
): { value: Uint8Array; nextOffset: number } {
  if (bytes[offset] !== 0x02) {
    throw new Error('Expected INTEGER');
  }
  offset++;

  let length = bytes[offset++];
  if (length & 0x80) {
    const numBytes = length & 0x7f;
    length = 0;
    for (let i = 0; i < numBytes; i++) {
      length = (length << 8) | bytes[offset++];
    }
  }

  const value = bytes.slice(offset, offset + length);
  return { value, nextOffset: offset + length };
}

/**
 * Parses RSA private key components from PKCS#8 format.
 */
function parseRSAPrivateKey(pkcs8Bytes: Uint8Array): RSAKeyComponents {
  let offset = 0;

  // Outer SEQUENCE
  if (pkcs8Bytes[offset++] !== 0x30) {
    throw new Error('Expected SEQUENCE');
  }
  let len = pkcs8Bytes[offset++];
  if (len & 0x80) {
    offset += len & 0x7f;
  }

  // Version INTEGER
  const version = parseDerInteger(pkcs8Bytes, offset);
  offset = version.nextOffset;

  // AlgorithmIdentifier SEQUENCE
  if (pkcs8Bytes[offset++] !== 0x30) {
    throw new Error('Expected SEQUENCE');
  }
  len = pkcs8Bytes[offset++];
  if (len & 0x80) {
    const numBytes = len & 0x7f;
    len = 0;
    for (let i = 0; i < numBytes; i++) {
      len = (len << 8) | pkcs8Bytes[offset++];
    }
  }
  offset += len;

  // OCTET STRING containing RSAPrivateKey
  if (pkcs8Bytes[offset++] !== 0x04) {
    throw new Error('Expected OCTET STRING');
  }
  len = pkcs8Bytes[offset++];
  if (len & 0x80) {
    const numBytes = len & 0x7f;
    len = 0;
    for (let i = 0; i < numBytes; i++) {
      len = (len << 8) | pkcs8Bytes[offset++];
    }
  }

  const rsaKeyBytes = pkcs8Bytes.slice(offset);
  offset = 0;

  if (rsaKeyBytes[offset++] !== 0x30) {
    throw new Error('Expected SEQUENCE');
  }
  len = rsaKeyBytes[offset++];
  if (len & 0x80) {
    offset += len & 0x7f;
  }

  const rsaVersion = parseDerInteger(rsaKeyBytes, offset);
  offset = rsaVersion.nextOffset;

  const n = parseDerInteger(rsaKeyBytes, offset);
  offset = n.nextOffset;

  const e = parseDerInteger(rsaKeyBytes, offset);
  offset = e.nextOffset;

  const d = parseDerInteger(rsaKeyBytes, offset);
  offset = d.nextOffset;

  const p = parseDerInteger(rsaKeyBytes, offset);
  offset = p.nextOffset;

  const q = parseDerInteger(rsaKeyBytes, offset);
  offset = q.nextOffset;

  const dp = parseDerInteger(rsaKeyBytes, offset);
  offset = dp.nextOffset;

  const dq = parseDerInteger(rsaKeyBytes, offset);
  offset = dq.nextOffset;

  const qi = parseDerInteger(rsaKeyBytes, offset);

  return {
    n: n.value,
    e: e.value,
    d: d.value,
    p: p.value,
    q: q.value,
    dp: dp.value,
    dq: dq.value,
    qi: qi.value
  };
}

/**
 * Encodes a string or Uint8Array as an SSH string (4-byte length prefix + data).
 */
function sshString(data: string | Uint8Array): Uint8Array {
  const bytes =
    typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const result = new Uint8Array(4 + bytes.length);
  const view = new DataView(result.buffer);
  view.setUint32(0, bytes.length, false);
  result.set(bytes, 4);
  return result;
}

/**
 * Encodes a byte array as an SSH multi-precision integer.
 */
function sshMpint(bytes: Uint8Array): Uint8Array {
  let start = 0;
  while (start < bytes.length - 1 && bytes[start] === 0) {
    start++;
  }
  bytes = bytes.slice(start);

  const needsPadding = bytes[0] & 0x80;
  const content = needsPadding ? new Uint8Array([0, ...bytes]) : bytes;

  const result = new Uint8Array(4 + content.length);
  const view = new DataView(result.buffer);
  view.setUint32(0, content.length, false);
  result.set(content, 4);
  return result;
}

/**
 * Encodes RSA public key in OpenSSH format.
 */
function encodeOpenSSHPublicKeyRSA(
  n: Uint8Array,
  e: Uint8Array,
  comment: string
): string {
  const keyType = 'ssh-rsa';

  const typeBytes = sshString(keyType);
  const eBytes = sshMpint(e);
  const nBytes = sshMpint(n);

  const blob = new Uint8Array(typeBytes.length + eBytes.length + nBytes.length);
  let offset = 0;
  blob.set(typeBytes, offset);
  offset += typeBytes.length;
  blob.set(eBytes, offset);
  offset += eBytes.length;
  blob.set(nBytes, offset);

  const base64Key = btoa(String.fromCharCode(...blob));
  return comment
    ? `${keyType} ${base64Key} ${comment}`
    : `${keyType} ${base64Key}`;
}

/**
 * Encodes RSA key pair in OpenSSH private key format.
 * Supports optional passphrase encryption.
 */
async function encodeOpenSSHPrivateKeyRSA(
  rsaKey: RSAKeyComponents,
  comment: string,
  encryption?: EncryptionParams
): Promise<string> {
  const keyType = 'ssh-rsa';
  const authMagic = new TextEncoder().encode('openssh-key-v1\0');

  // Use encryption params or defaults for unencrypted
  const cipherNameStr = encryption?.cipherName ?? 'none';
  const kdfNameStr = encryption?.kdfName ?? 'none';
  const kdfOptions = encryption?.kdfOptions ?? new Uint8Array(0);

  const checkInt = crypto.getRandomValues(new Uint32Array(1))[0];

  // Build public blob
  const pubTypeBytes = sshString(keyType);
  const pubEBytes = sshMpint(rsaKey.e);
  const pubNBytes = sshMpint(rsaKey.n);
  const publicBlob = new Uint8Array(
    pubTypeBytes.length + pubEBytes.length + pubNBytes.length
  );
  let pubOffset = 0;
  publicBlob.set(pubTypeBytes, pubOffset);
  pubOffset += pubTypeBytes.length;
  publicBlob.set(pubEBytes, pubOffset);
  pubOffset += pubEBytes.length;
  publicBlob.set(pubNBytes, pubOffset);

  // Build private section components
  const privTypeBytes = sshString(keyType);
  const privNBytes = sshMpint(rsaKey.n);
  const privEBytes = sshMpint(rsaKey.e);
  const privDBytes = sshMpint(rsaKey.d);
  const privQiBytes = sshMpint(rsaKey.qi);
  const privPBytes = sshMpint(rsaKey.p);
  const privQBytes = sshMpint(rsaKey.q);
  const privCommentBytes = sshString(comment);

  const privateSectionLength =
    4 + // checkInt
    4 + // checkInt (repeated)
    privTypeBytes.length +
    privNBytes.length +
    privEBytes.length +
    privDBytes.length +
    privQiBytes.length +
    privPBytes.length +
    privQBytes.length +
    privCommentBytes.length;

  // Padding to cipher block size (16 for AES, 8 for unencrypted)
  const blockSize = encryption ? AES_BLOCK_SIZE : 8;
  const paddingLength =
    (blockSize - (privateSectionLength % blockSize)) % blockSize;
  const paddedLength = privateSectionLength + paddingLength;

  const privateSection = new Uint8Array(paddedLength);
  const privateView = new DataView(privateSection.buffer);
  let pOffset = 0;

  privateView.setUint32(pOffset, checkInt, false);
  pOffset += 4;
  privateView.setUint32(pOffset, checkInt, false);
  pOffset += 4;
  privateSection.set(privTypeBytes, pOffset);
  pOffset += privTypeBytes.length;
  privateSection.set(privNBytes, pOffset);
  pOffset += privNBytes.length;
  privateSection.set(privEBytes, pOffset);
  pOffset += privEBytes.length;
  privateSection.set(privDBytes, pOffset);
  pOffset += privDBytes.length;
  privateSection.set(privQiBytes, pOffset);
  pOffset += privQiBytes.length;
  privateSection.set(privPBytes, pOffset);
  pOffset += privPBytes.length;
  privateSection.set(privQBytes, pOffset);
  pOffset += privQBytes.length;
  privateSection.set(privCommentBytes, pOffset);
  pOffset += privCommentBytes.length;

  // Add padding bytes (1, 2, 3, ...)
  for (let i = 0; i < paddingLength; i++) {
    privateSection[pOffset + i] = (i + 1) & 0xff;
  }

  // Encrypt private section if passphrase provided
  const finalPrivateSection = encryption
    ? await encryption.encrypt(privateSection)
    : privateSection;

  // Build header components
  const cipherBytes = sshString(cipherNameStr);
  const kdfBytes = sshString(kdfNameStr);
  const kdfOptionsWithLen = new Uint8Array(4 + kdfOptions.length);
  new DataView(kdfOptionsWithLen.buffer).setUint32(0, kdfOptions.length, false);
  kdfOptionsWithLen.set(kdfOptions, 4);

  const numKeys = new Uint8Array(4);
  new DataView(numKeys.buffer).setUint32(0, 1, false);
  const publicBlobLen = new Uint8Array(4);
  new DataView(publicBlobLen.buffer).setUint32(0, publicBlob.length, false);
  const privateSectionLen = new Uint8Array(4);
  new DataView(privateSectionLen.buffer).setUint32(
    0,
    finalPrivateSection.length,
    false
  );

  const totalLength =
    authMagic.length +
    cipherBytes.length +
    kdfBytes.length +
    kdfOptionsWithLen.length +
    numKeys.length +
    publicBlobLen.length +
    publicBlob.length +
    privateSectionLen.length +
    finalPrivateSection.length;

  const fullKey = new Uint8Array(totalLength);
  let fOffset = 0;
  fullKey.set(authMagic, fOffset);
  fOffset += authMagic.length;
  fullKey.set(cipherBytes, fOffset);
  fOffset += cipherBytes.length;
  fullKey.set(kdfBytes, fOffset);
  fOffset += kdfBytes.length;
  fullKey.set(kdfOptionsWithLen, fOffset);
  fOffset += kdfOptionsWithLen.length;
  fullKey.set(numKeys, fOffset);
  fOffset += numKeys.length;
  fullKey.set(publicBlobLen, fOffset);
  fOffset += publicBlobLen.length;
  fullKey.set(publicBlob, fOffset);
  fOffset += publicBlob.length;
  fullKey.set(privateSectionLen, fOffset);
  fOffset += privateSectionLen.length;
  fullKey.set(finalPrivateSection, fOffset);

  const base64 = btoa(String.fromCharCode(...fullKey));
  const wrapped = base64.match(/.{1,70}/g)!.join('\n');

  return `-----BEGIN OPENSSH PRIVATE KEY-----\n${wrapped}\n-----END OPENSSH PRIVATE KEY-----\n`;
}

/**
 * Generates an RSA-4096 SSH key pair using the Web Crypto API.
 * Used as fallback when Ed25519 is not supported by the browser.
 */
async function generateRSAKeyPair(
  comment: string,
  encryption?: EncryptionParams
): Promise<SSHKeyPair> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 4096,
      publicExponent: new Uint8Array([0x01, 0x00, 0x01]),
      hash: 'SHA-256'
    },
    true,
    ['sign', 'verify']
  );

  const privateKeyPkcs8 = await crypto.subtle.exportKey(
    'pkcs8',
    keyPair.privateKey
  );
  const rsaKey = parseRSAPrivateKey(new Uint8Array(privateKeyPkcs8));

  return {
    publicKey: encodeOpenSSHPublicKeyRSA(rsaKey.n, rsaKey.e, comment),
    privateKey: await encodeOpenSSHPrivateKeyRSA(rsaKey, comment, encryption),
    keyType: 'RSA-4096'
  };
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Generates an SSH key pair in OpenSSH format.
 *
 * Uses Ed25519 when available (preferred), with RSA-4096 fallback for
 * browsers that don't support Ed25519.
 *
 * Keys are generated entirely in the browser using the Web Crypto API.
 * Nothing is sent to any server.
 *
 * @param options - Generation options (comment, passphrase, rounds)
 * @returns Promise resolving to the generated key pair
 *
 * @example
 * // Without passphrase
 * const keyPair = await generateSSHKeyPair({ comment: 'user@example.com' });
 *
 * @example
 * // With passphrase encryption
 * const keyPair = await generateSSHKeyPair({
 *   comment: 'user@example.com',
 *   passphrase: 'my-secret-passphrase'
 * });
 *
 * @example
 * // Legacy: just pass a comment string
 * const keyPair = await generateSSHKeyPair('user@example.com');
 */
export async function generateSSHKeyPair(
  options: SSHKeyGenOptions | string = {}
): Promise<SSHKeyPair> {
  // Support legacy string argument for backwards compatibility
  const opts: SSHKeyGenOptions =
    typeof options === 'string' ? { comment: options } : options;

  const comment = opts.comment ?? '';

  // Setup encryption if passphrase provided
  let encryption: EncryptionParams | undefined;
  if (opts.passphrase) {
    encryption = await setupEncryption(opts.passphrase, opts.rounds);
  }

  try {
    return await generateEd25519KeyPair(comment, encryption);
  } catch (e) {
    if (e instanceof Error && e.name === 'NotSupportedError') {
      return await generateRSAKeyPair(comment, encryption);
    }
    throw e;
  }
}

/**
 * Checks if the browser supports Ed25519 key generation.
 *
 * @returns Promise resolving to true if Ed25519 is supported
 */
export async function supportsEd25519(): Promise<boolean> {
  try {
    await crypto.subtle.generateKey({ name: 'Ed25519' }, false, [
      'sign',
      'verify'
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the recommended key file name based on key type.
 *
 * @param keyType - The type of SSH key
 * @returns The recommended file name (e.g., 'id_ed25519' or 'id_rsa')
 */
export function getKeyFileName(keyType: SSHKeyPair['keyType']): string {
  return keyType === 'Ed25519' ? 'id_ed25519' : 'id_rsa';
}
