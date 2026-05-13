# Frontend Setup Guide

## Environment Configuration

### 1. Copy Environment Template
The `.env.example` file contains all required variables. For local development:

```bash
cp frontend/.env.example frontend/.env.local
```

### 2. Configure Required Variables

#### Backend API
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```
- Points to the FastAPI backend
- For production: `https://api.yourdomain.com`

#### Stripe Integration
```env
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
```

**To get your Stripe key:**
1. Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
2. Copy the **Publishable key** (starts with `pk_test_` for testing, `pk_live_` for production)
3. Paste into `.env.local`

**Note:** Only the **public key** goes in the frontend. The secret key stays on the backend.

#### OAuth (Google)
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abcd....apps.googleusercontent.com
```

**To get your Google Client ID:**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the **Google+ API**
4. Go to **Credentials** → **Create OAuth 2.0 Client ID**
5. Select **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback/google` (dev)
   - `https://yourdomain.com/auth/callback/google` (prod)
7. Copy the **Client ID** (not the secret)

#### OAuth (GitHub)
```env
NEXT_PUBLIC_GITHUB_CLIENT_ID=Iv1.abcd...
```

**To get your GitHub Client ID:**
1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the form:
   - **Application name:** Books4All
   - **Homepage URL:** `http://localhost:3000` (dev) or `https://yourdomain.com` (prod)
   - **Authorization callback URL:** `http://localhost:3000/auth/callback/github` (dev)
4. Copy the **Client ID** (not the client secret)

#### App Configuration (Optional)
```env
NEXT_PUBLIC_APP_NAME=Books4All
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Verify Environment Setup

```bash
cd frontend

# Check that .env.local exists
cat .env.local

# Should see (with your actual values):
# NEXT_PUBLIC_API_URL=http://localhost:8000
# NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
# NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
# NEXT_PUBLIC_GITHUB_CLIENT_ID=...
```

## Running the Frontend

### Development
```bash
cd frontend
npm install              # Install dependencies (first time only)
npm run dev             # Start dev server on http://localhost:3000
```

### Production Build
```bash
npm run build           # Build optimized production bundle
npm run start           # Start production server
```

### Type Checking
```bash
npm run lint            # Run ESLint
npx tsc --noEmit       # Check TypeScript without emitting
```

## Backend Prerequisites

Before starting the frontend, ensure the backend is running:

```bash
cd backend

# Start dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or with uv
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Backend must be accessible at:** `http://localhost:8000`

## Testing Checklist

Once both frontend and backend are running:

### 1. Authentication
- [ ] Register with email/password
- [ ] Register with Google OAuth
- [ ] Register with GitHub OAuth
- [ ] Login with credentials
- [ ] Login with Google
- [ ] Login with GitHub
- [ ] Logout
- [ ] Forgot password flow

### 2. Browsing
- [ ] View homepage
- [ ] Browse books (should load from backend)
- [ ] Search books
- [ ] Filter by category
- [ ] Filter by condition
- [ ] Filter by price range
- [ ] Sort by different options
- [ ] Navigate book detail
- [ ] View reviews

### 3. Shopping (as Buyer)
- [ ] Add book to cart
- [ ] View cart
- [ ] Update quantities
- [ ] Remove items
- [ ] Proceed to checkout
- [ ] Enter shipping address
- [ ] Create order
- [ ] Redirect to Stripe (will show test page in dev)

### 4. Orders
- [ ] View order history
- [ ] View order details
- [ ] Cancel pending order

### 5. Seller Dashboard (requires SELLER role)
- [ ] View my listings
- [ ] Create new listing
- [ ] Upload cover image
- [ ] Edit existing listing
- [ ] Publish draft listing
- [ ] Delete listing
- [ ] View sales orders
- [ ] Mark order as shipped

## Troubleshooting

### "Cannot connect to API"
- Ensure backend is running on `http://localhost:8000`
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS is enabled on backend

### "OAuth redirect fails"
- Check redirect URI is registered in Google Cloud Console / GitHub
- Format: `http://localhost:3000/auth/callback/{google|github}` (dev)
- Format: `https://yourdomain.com/auth/callback/{google|github}` (prod)

### "Stripe button doesn't work"
- Verify `NEXT_PUBLIC_STRIPE_PUBLIC_KEY` is set in `.env.local`
- Key should start with `pk_test_` (development)
- Check browser console for errors

### "Token refresh fails"
- Ensure refresh token is being stored correctly
- Check localStorage in browser DevTools
- Verify backend `/api/v1/auth/refresh` endpoint is working

### Port Already in Use
Frontend default: `3000`, Backend default: `8000`

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3001
```

## Production Deployment

### Update Environment Variables
```bash
# .env.production (never commit this)
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=prod_client_id
NEXT_PUBLIC_GITHUB_CLIENT_ID=prod_client_id
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Build
```bash
npm run build
npm run start
```

### Deployment Platforms
- **Vercel** (recommended for Next.js): Simply push to GitHub
- **AWS:** EC2 + PM2 or ECS
- **Heroku:** `git push heroku main`
- **DigitalOcean:** App Platform

## Security Checklist

- [ ] Never commit `.env.local` (add to `.gitignore`)
- [ ] Public keys (Stripe `pk_*`, OAuth Client IDs) are safe to expose
- [ ] Backend secret keys (Stripe `sk_*`) stay on backend only
- [ ] JWT tokens stored in secure httpOnly cookies where possible
- [ ] CORS properly configured on backend
- [ ] No API secrets in frontend code

## Additional Resources

- **Next.js Docs:** https://nextjs.org/docs
- **Stripe Keys:** https://dashboard.stripe.com/apikeys
- **Google OAuth:** https://console.cloud.google.com/
- **GitHub OAuth:** https://github.com/settings/developers
- **Backend Setup:** See `backend/README.md`

---

**Questions?** Check `.planning/FINAL_HANDOFF.md` for architecture details.
