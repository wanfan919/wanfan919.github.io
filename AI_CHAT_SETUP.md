# AI Chat Setup

## 1) Deploy the proxy (Cloudflare Worker)

1. Create a Worker and paste `ai-proxy/cloudflare-worker.js`.
2. Add secret: `OPENAI_API_KEY`.
3. Optional env var: `OPENAI_MODEL` (default `gpt-4.1-mini`).
4. Deploy. You should get URL like:
   `https://wf-ai-proxy.<your-subdomain>.workers.dev/chat`

## 2) Configure the website endpoint

Edit this line in `js/main.js`:

```js
const endpoint = cfg.endpoint || 'https://your-worker-domain.example.com/chat'
```

Replace it with your deployed Worker URL.

## 3) Push and verify

After deployment, open the site and click the `AI` floating button at the lower-right.

If it says endpoint not configured, the URL in `js/main.js` was not replaced correctly.
If it says request failed, check Worker logs and the `OPENAI_API_KEY` secret.
