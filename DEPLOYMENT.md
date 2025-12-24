# 🚀 Deployment Guide

This guide covers deploying the Air India Maharaja Assistant to various platforms.

## 📋 Prerequisites

- GitHub repository with your code
- API keys ready:
  - OpenAI API key (required)
  - Amadeus API credentials (optional, for flight search)

## 🎯 Recommended: Railway

Railway is the easiest option for full-stack Node.js applications.

### Step 1: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

### Step 2: Deploy from GitHub

1. Select "Deploy from GitHub repo"
2. Choose your repository
3. Railway will auto-detect Node.js

### Step 3: Configure Environment Variables

In Railway dashboard, go to **Variables** tab and add:

```env
NODE_ENV=production
PORT=3001
OPENAI_API_KEY=your_openai_api_key_here
AMADEUS_API_KEY=your_amadeus_api_key_here (optional)
AMADEUS_API_SECRET=your_amadeus_api_secret_here (optional)
AMADEUS_ENV=test
```

### Step 4: Configure Build Settings

Railway will automatically:
- Run `npm install`
- Run `npm run build` (builds frontend)
- Run `npm run start` (starts server)

### Step 5: Get Your URL

Railway will provide a URL like: `https://your-app.railway.app`

**Done!** Your app is live! 🎉

---

## 🔄 Alternative: Render

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create New Web Service

1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the repository

### Step 3: Configure Service

- **Name**: `air-india-chatbot`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Plan**: Free (or paid)

### Step 4: Environment Variables

Add in the Render dashboard:

```env
NODE_ENV=production
PORT=10000
OPENAI_API_KEY=your_openai_api_key_here
AMADEUS_API_KEY=your_amadeus_api_key_here (optional)
AMADEUS_API_SECRET=your_amadeus_api_secret_here (optional)
AMADEUS_ENV=test
```

### Step 5: Deploy

Click "Create Web Service" and wait for deployment.

**Note**: Free tier on Render spins down after 15 minutes of inactivity.

---

## ☁️ Alternative: Vercel (Frontend) + Railway/Render (Backend)

For better performance, you can separate frontend and backend:

### Backend (Railway/Render)

1. Deploy backend as shown above
2. Get your backend URL (e.g., `https://your-backend.railway.app`)

### Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add Environment Variable:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
5. Deploy!

---

## 🐛 Troubleshooting

### Backend not starting

- Check that `PORT` environment variable is set
- Verify `OPENAI_API_KEY` is correct
- Check logs in your platform's dashboard

### Frontend can't connect to backend

- Ensure `VITE_API_URL` points to your backend URL
- Check CORS settings (already configured in code)
- Verify backend is running and accessible

### Build fails

- Ensure all dependencies are in `package.json`
- Check Node.js version (should be 18+)
- Review build logs for specific errors

### API errors

- Verify API keys are set correctly
- Check API quotas/limits
- Review error logs in platform dashboard

---

## 📝 Post-Deployment Checklist

- [ ] Test chatbot functionality
- [ ] Verify API connections work
- [ ] Test bilingual support (English/Hindi)
- [ ] Check flight search (if Amadeus configured)
- [ ] Test conversation persistence
- [ ] Verify error handling
- [ ] Check mobile responsiveness

---

## 🔒 Security Notes

- Never commit `.env` files
- Use environment variables for all secrets
- Enable HTTPS (automatic on Railway/Render/Vercel)
- Regularly rotate API keys
- Monitor API usage and costs

---

## 💰 Cost Estimates

### Railway
- **Free tier**: $5 credit/month
- **Hobby**: $20/month (unlimited)

### Render
- **Free tier**: Limited hours, spins down
- **Starter**: $7/month per service

### Vercel
- **Free tier**: Unlimited for personal projects
- **Pro**: $20/month

### API Costs
- **OpenAI**: ~$0.002 per 1K tokens (GPT-3.5-turbo)
- **Amadeus**: Free tier available

---

## 📚 Additional Resources

- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)

---

**Need help?** Check the main README.md or open an issue in the repository.

