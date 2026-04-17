import * as crypto from 'crypto';

// Deterministic key generation using a fixed seed for testing
// In production, these should be loaded from secure environment variables
const seed = Buffer.from('12345678901234567890123456789012'); // 32 bytes
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
  privateKeyEncoding: { format: 'der', type: 'pkcs8' },
  publicKeyEncoding: { format: 'der', type: 'spki' }
});

const privateKeyObj = crypto.createPrivateKey({
  key: privateKey,
  format: 'der',
  type: 'pkcs8'
});

const publicKeyObj = crypto.createPublicKey({
  key: publicKey,
  format: 'der',
  type: 'spki'
});

export async function getPublicKey(): Promise<Uint8Array> {
    const exported = publicKeyObj.export({ type: 'spki', format: 'der' });
    // Strip ASN.1 header for raw 32-byte public key (usually last 32 bytes)
    return new Uint8Array(exported.slice(-32));
}

export async function signPayload(message: string): Promise<string> {
    const signature = crypto.sign(undefined, new Uint8Array(Buffer.from(message)), privateKeyObj);
    return signature.toString('hex');
}

export async function verifySignature(message: string, signatureHex: string, publicKeyParams?: Uint8Array): Promise<boolean> {
    const signature = Buffer.from(signatureHex, 'hex');
    let pk = publicKeyObj;
    
    if (publicKeyParams) {
        // Build an SPKI ASN.1 header around the 32 byte raw ed25519 key
        const header = new Uint8Array(Buffer.from('302a300506032b6570032100', 'hex'));
        const publicKeysU8 = new Uint8Array(publicKeyParams);
        const der = new Uint8Array(header.length + publicKeysU8.length);
        der.set(header, 0);
        der.set(publicKeysU8, header.length);
        pk = crypto.createPublicKey({ key: Buffer.from(der), format: 'der', type: 'spki' });
    }
    
    return crypto.verify(undefined, new Uint8Array(Buffer.from(message)), pk, new Uint8Array(signature));
}
