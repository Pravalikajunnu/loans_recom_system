# Production Deployment Guide: AI-Powered Loan Recommendation System

This guide walks you through deploying the loan recommendation system to the cloud. We will deploy:
1. **PostgreSQL Database** on **Neon.tech** (or Render/Railway).
2. **FastAPI Backend** on **Render** (or Railway).
3. **Next.js Frontend** on **Vercel** (or Render).

---

## Step 1: Deploy the PostgreSQL Database

The application needs a PostgreSQL database. **Neon** is recommended for a fast, serverless database.

1. Sign up/log in to [Neon](https://neon.tech/).
2. Create a new project named `loan-system`.
3. In your project dashboard, copy the **Connection string** (make sure it's the `Pooled connection` version for best performance).
   - It will look like: `postgresql://alex:password@ep-cool-snowflake-123456.us-east-2.aws.neon.tech/neondb?sslmode=require`
4. Keep this connection string ready; you will use it as `DATABASE_URL` in the backend deployment.

---

## Step 2: Deploy the FastAPI Backend on Render

You can deploy the FastAPI server to **Render** either natively as a Python Web Service or as a Docker container.

### Option A: Native Python Deployment (Recommended)
1. Sign up/log in to [Render](https://render.com/).
2. Click **New +** and select **Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Name**: `loan-backend`
   - **Environment/Runtime**: `Python`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free` (or custom tier)
5. Click **Advanced** to add **Environment Variables**:
   - `DATABASE_URL`: *Your Neon connection string (from Step 1)*
   - `SECRET_KEY`: *A secure random string (e.g. `d7be4a9a957b4200bf4954497e163b9f`)*
   - `GEMINI_API_KEY`: *Your Google Gemini API Key (Optional - if left blank, the app will generate mock recommendation reports for testing)*
6. Click **Create Web Service**.
7. Once deployed, note down the service URL (e.g. `https://loan-backend.onrender.com`). Your API root endpoint will be `https://loan-backend.onrender.com` and your frontend API URL will be `https://loan-backend.onrender.com/api`.

### Option B: Docker Deployment
If you prefer to deploy using the project's Docker configuration:
1. Click **New +** -> **Web Service** on Render and connect your repository.
2. Set settings:
   - **Name**: `loan-backend`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `backend/Dockerfile`
   - **Docker Build Context**: `backend`
3. Add the environment variables specified in Option A.
4. Click **Create Web Service**.

---

## Step 3: Deploy the Next.js Frontend on Vercel

Vercel is the native platform for Next.js, offering the easiest deployment experience and excellent performance.

1. Sign up/log in to [Vercel](https://vercel.com/).
2. Click **Add New** -> **Project**.
3. Import your GitHub repository.
4. In the configuration screen:
   - **Framework Preset**: `Next.js` (automatically detected)
   - **Root Directory**: Click `Edit` and select `frontend`.
5. Under **Environment Variables**, add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://<your-backend-render-url>.onrender.com/api` *(Make sure to append `/api` to the backend URL you copied in Step 2)*
6. Click **Deploy**.
7. In a few minutes, your frontend will be live at a Vercel subdomain (e.g. `https://loans-recom-system.vercel.app`).

---

## Step 4: Verification

1. Open your deployed frontend URL in a web browser.
2. Navigate to the `/register` page and create a new account.
3. Upon registration, log in.
4. Navigate to the intake profile page and enter dynamic financials (e.g., salary, monthly expenses, active EMIs) and submit a recommendation request.
5. Verify that the recommendation engine returns structured responses showing DTI calculations, eligible bank products (SBI, HDFC, ICICI, etc.), and AI-generated insights.
6. Check backend REST API docs by visiting: `https://<your-backend-render-url>.onrender.com/docs`.

---

## Production Security Notes

* **CORS Settings**: The FastAPI backend has CORS enabled with `allow_origins=["*"]`. In a production setting with real consumer data, you should restrict `allow_origins` in `backend/app/main.py` to only your frontend's Vercel domain name.
* **Secrets**: Never commit your `GEMINI_API_KEY` or production `DATABASE_URL` to GitHub. Always load them using the environment variables in your cloud provider's dashboard.
