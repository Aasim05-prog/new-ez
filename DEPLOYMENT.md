# Vercel Deployment

This repo has two apps:

- `frontend`: Vite + React
- `backend`: Express REST API

Deploy them as two Vercel projects.

## Backend Project

Set Vercel's root directory to `backend`.

Add these environment variables in Vercel:

```env
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-long-random-secret
RAZORPAY_KEY_ID=rzp_live_or_test_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_USER=your.gmail@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=EduMarket <your.gmail@gmail.com>
CORS_ORIGIN=https://your-frontend-project.vercel.app
```

After deploy, your API base is:

```text
https://your-backend-project.vercel.app/api
```

## Frontend Project

Set Vercel's root directory to `frontend`.

Add these environment variables:

```env
VITE_API_BASE=https://your-backend-project.vercel.app/api
VITE_SOCKET_URL=https://your-backend-project.vercel.app
VITE_GEMINI_API_KEY=optional_gemini_key
```

## Important Socket.IO Note

Vercel serverless functions do not support persistent Socket.IO WebSocket servers. The REST chat endpoints will still work, but realtime typing/messages/notifications need the backend on a long-running host such as Render, Railway, Fly.io, or a VPS.

Vercel serverless functions also have request body limits. Large PDF uploads are safer on a long-running backend or with direct browser-to-Cloudinary uploads.

For full realtime chat, deploy `backend` to a long-running host and set:

```env
VITE_API_BASE=https://your-long-running-backend.example.com/api
VITE_SOCKET_URL=https://your-long-running-backend.example.com
CORS_ORIGIN=https://your-frontend-project.vercel.app
```
