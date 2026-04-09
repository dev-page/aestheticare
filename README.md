# AesthetiCare

## Vercel Deployment

This project can run as a Vercel frontend plus Vercel serverless API routes.

### Frontend

Deploy the Vue app from `capstone/` to Vercel.

Set these environment variables in the Vercel project settings:

```env
VITE_API_URL=/api
VITE_OTP_BACKEND_URL=/api
VITE_OTP_API_BASE_URL=/api
```

`VITE_*` variables are baked into the frontend at build time, so redeploy after changing them.

### Backend API

The Vercel serverless backend lives in `capstone/api/[...path].js`.

Add these Vercel environment variables:

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_SENDER=verified_sender@yourdomain.com
```

The service account JSON must come from your Firebase project and should include the private key and client email.

### Verification

After deployment, these should work:

- `/api/health`
- `/api/auth/check-user`
- `/api/send-otp`
- `/api/auth/reset-password`
