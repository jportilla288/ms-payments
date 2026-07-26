/**
 * Development helper: builds a correctly signed webhook event so the endpoint
 * can be exercised locally without the gateway reaching localhost.
 *
 * Usage:
 *   node scripts/build-webhook-event.js <reference> [status] [gatewayTransactionId]
 *
 * Example:
 *   node scripts/build-webhook-event.js TX-1769384521-A3F9C2D1 APPROVED
 */
require('dotenv/config');
const { createHash } = require('node:crypto');

const [, , reference, status = 'APPROVED', gatewayId = 'gw-local-1'] = process.argv;

if (!reference) {
  console.error('Missing argument: <reference>');
  console.error('Usage: node scripts/build-webhook-event.js <reference> [status] [gatewayTransactionId]');
  process.exit(1);
}

const secret = process.env.PAYMENT_EVENTS_KEY;

if (!secret) {
  console.error('PAYMENT_EVENTS_KEY is not set in .env');
  process.exit(1);
}

const timestamp = Math.floor(Date.now() / 1000);
const properties = ['transaction.id', 'transaction.status'];

const data = {
  transaction: {
    id: gatewayId,
    reference,
    status,
    status_message: null,
  },
};

const concatenated = properties
  .map((path) => path.split('.').reduce((current, key) => current?.[key], data))
  .map((value) => (value === null || value === undefined ? '' : String(value)))
  .join('');

const checksum = createHash('sha256')
  .update(`${concatenated}${timestamp}${secret}`)
  .digest('hex');

const event = {
  event: 'transaction.updated',
  data,
  signature: { properties, checksum },
  timestamp,
};

console.log('--- signed string ---');
console.log(`${concatenated}${timestamp}<secret>`);
console.log('\n--- paste this as the Postman body ---');
console.log(JSON.stringify(event, null, 2));
