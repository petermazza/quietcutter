# QuietCutter

Video silence remover - Make every second count.

## Features
- Remove silent segments from videos
- Fast server-side processing with FFmpeg
- Smart presets for different content types
- Freemium model with Stripe payments

## Deployment to Railway

### Prerequisites
- Railway account (https://railway.app)
- GitHub account
- Stripe account (for payments)

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/quietcutter.git
   git push -u origin main
   ```

2. **Deploy to Railway**
   - Go to https://railway.app
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your quietcutter repository
   - Railway will auto-detect the Dockerfile

3. **Add Environment Variables**
   In Railway dashboard, add these variables:
   ```
   NEXT_PUBLIC_BASE_URL=https://your-app.up.railway.app
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
   STRIPE_SECRET_KEY=sk_live_xxx
   ```

4. **Custom Domain (Optional)**
   - In Railway, go to Settings → Domains
   - Add your custom domain (e.g., quietcutter.com)
   - Update DNS records as instructed

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_BASE_URL` | Your app's URL (for Stripe redirects) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |

## Local Development

```bash
yarn install
yarn dev
```

## Tech Stack
- Next.js 14 (App Router)
- FFmpeg (server-side video processing)
- Stripe (payments)
- Tailwind CSS
