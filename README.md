# SiteLedger Backend API

Construction finance REST API for the SiteLedger mobile app.

## Quick start (local)

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

API runs at `http://localhost:5000`  
Health check: `GET /api/health`

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret for JWT signing |
| `PORT` | No | Default `5000` (local only) |
| `USE_CLOUDINARY` | No | `true` for Cloudinary, `false` for local disk (default) |
| `CLOUDINARY_CLOUD_NAME` | If Cloudinary | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | If Cloudinary | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | If Cloudinary | Cloudinary API secret |

## Upload storage

### Local development (`USE_CLOUDINARY=false`)

- Receipts saved to `backend/uploads/`
- Served at `http://localhost:5000/uploads/...`
- No Cloudinary account needed
- Best for local testing with Expo Go on LAN

### Production / Vercel (`USE_CLOUDINARY=true`)

- Receipts uploaded to **Cloudinary** (`siteledger/receipts` folder)
- Returns permanent `secure_url` — required on Vercel (no persistent disk)
- Set all three `CLOUDINARY_*` variables in Vercel dashboard

**Upload response (consistent):**

```json
{
  "success": true,
  "message": "File uploaded successfully",
  "data": {
    "url": "https://res.cloudinary.com/...",
    "fileName": "receipt.jpg",
    "mimeType": "image/jpeg",
    "publicId": "siteledger/receipts/receipt-123"
  }
}
```

## Vercel deployment

1. Connect repo to Vercel
2. Set environment variables:

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_production_secret
USE_CLOUDINARY=true
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

3. Deploy — entry point: `api/index.js`

**Notes:**
- Health route (`/api/health`) responds instantly without DB
- MongoDB connection is cached for serverless
- CORS allows mobile app requests
- Upload route requires JWT (`Authorization: Bearer <token>`)
- Max upload size: 10MB

## Demo seed data (local only)

```bash
npm run seed
```

Creates:
- User: `demo@siteledger.app` / `Demo1234`
- 2 projects, 3 entities, 6 payments

**Do not run seed in production.**

## API routes

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Login, signup, profile |
| `/api/projects` | Projects + summary + team |
| `/api/entities` | Category entities |
| `/api/payments` | Payments |
| `/api/dashboard` | Dashboard summary |
| `/api/upload` | Receipt upload (protected) |
