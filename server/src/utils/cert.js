/**
 * Generate self-signed certificates for local development
 * Usage: npm run cert:generate
 */
import { generate } from 'selfsigned';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const certsDir = join(__dirname, '../../certs');

// Ensure certs directory exists
if (!existsSync(certsDir)) {
  mkdirSync(certsDir, { recursive: true });
}

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'organizationName', value: 'OpenWorld QUIC Dev' },
];

const options = {
  keySize: 2048,
  days: 365,
  algorithm: 'sha256',
  extensions: [
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' },
        { type: 7, ip: '127.0.0.1' },
        { type: 7, ip: '::1' },
      ],
    },
    {
      name: 'basicConstraints',
      cA: false,
    },
    {
      name: 'keyUsage',
      digitalSignature: true,
      keyEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
    },
  ],
};

console.log('🔐 Generating self-signed certificates...');

const pems = generate(attrs, options);

writeFileSync(join(certsDir, 'key.pem'), pems.private);
writeFileSync(join(certsDir, 'cert.pem'), pems.cert);

console.log('✅ Certificates generated:');
console.log(`   - ${join(certsDir, 'key.pem')}`);
console.log(`   - ${join(certsDir, 'cert.pem')}`);
console.log('');
console.log('⚠️  For browser testing, you may need to:');
console.log('   1. Trust the certificate in your system keychain, or');
console.log('   2. Use Chrome with: --ignore-certificate-errors-spki-list=<hash>');
console.log('   3. Or use mkcert for locally-trusted certificates');
