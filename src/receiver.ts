import express from 'express';
import { verifySignature } from './signing/hmac';

const port = parseInt(process.env.RECEIVER_PORT || '4000', 10);
const status = parseInt(process.env.RECEIVER_STATUS || '200', 10);
const secret = process.env.RECEIVER_SECRET;
const app = express();

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const rawBody = req.body.toString('utf8');
  const signature = req.header('x-webhook-signature');
  const timestamp = req.header('x-webhook-timestamp');

  if (secret) {
    if (!signature || !timestamp) return res.status(401).send('Missing signature');
    if (!verifySignature(rawBody, timestamp, signature, secret)) {
      return res.status(401).send('Invalid signature');
    }
  }

  console.log('Received webhook', {
    id: req.header('x-webhook-id'),
    timestamp,
    signature,
    body: JSON.parse(rawBody)
  });
  res.status(status).json({ ok: status >= 200 && status < 300 });
});

app.listen(port, () => {
  console.log(`Receiver listening on http://localhost:${port}/webhook with status ${status}`);
});
