# AesthetiCare

## Hostinger Deployment

This project is split into two deployments:

- `aestheticare.io` for the Vue frontend
- `api.aestheticare.io` for the Node backend

### Frontend

Deploy the built `dist/` folder to the `aestheticare.io` website.

Required frontend env values:

```env
VITE_API_URL=https://api.aestheticare.io
VITE_OTP_BACKEND_URL=https://api.aestheticare.io
VITE_OTP_API_BASE_URL=https://api.aestheticare.io
```

### Backend

Deploy `capstone/otp-backend` as a Node.js web app on `api.aestheticare.io`.

Required backend env values:

```env
PORT=3000
FRONTEND_BASE_URL=https://aestheticare.io
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_SENDER=verified_sender@yourdomain.com
PAYMONGO_SECRET_KEY=your_paymongo_secret_key
GOOGLE_OAUTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_OAUTH_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_OAUTH_REFRESH_TOKEN=your_google_oauth_refresh_token
GOOGLE_CALENDAR_ID=primary
FIREBASE_SERVICE_ACCOUNT_PATH=otp-backend/serviceAccountKey.json
```

You can also provide `FIREBASE_SERVICE_ACCOUNT_JSON` instead of a file path if your hosting panel stores secrets as environment variables.

### Verification

After deployment, these should work:

- `https://api.aestheticare.io/health` returns JSON
- OTP requests go to `https://api.aestheticare.io`
- Google Meet consultation links appear in customer appointments

