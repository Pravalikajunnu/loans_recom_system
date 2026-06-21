# AI-Powered Loan Recommendation Agent

A production-ready AI-Powered Loan Recommendation Assistant built to analyze customer profiles, compute Debt-to-Income (DTI) and loan affordability metrics, and query a bank product catalog to recommend the best loan options. Powered by a FastAPI backend, PostgreSQL relational database, Next.js frontend client with Tailwind CSS styling, and Gemini API structured recommendations.

---

## Features

1. **Customer Intake Module**: Consolidates age, employment type, monthly expenses, existing liabilities (EMIs), credit scores, and loan requests.
2. **Eligibility Analysis Engine**: Computes Debt-to-Income (DTI) and monthly disposable surpluses to assign creditworthiness statuses.
3. **Relational Database Catalog**: Realistic loan product lists seeded on startup from multiple lenders (Chase, Wells Fargo, Bank of America, Capital One, Citibank, PNC Bank).
4. **Loan Matching & Ranking Engine**: Filters products against customer metrics and ranks them by cost-effectiveness.
5. **AI Recommendation Agent**: Sends profile criteria and matches to the Gemini API to get structured JSON feedback containing picks, pros/cons, risk assessments, and credit-building suggestions.
6. **Explainability Dashboard**: Renders badges, tables, charts (using Recharts), and AI advice text.
7. **System Auditing**: Log and query administrative audit trails.

---

## Tech Stack

* **Frontend**: Next.js (App Router), TypeScript, Tailwind CSS, Recharts, Lucide Icons, Axios.
* **Backend**: FastAPI (Python), SQLAlchemy ORM, SQLite/PostgreSQL, Pydantic validations, Python-Jose (JWT auth).
* **AI Engine**: Gemini API (`google-generativeai` SDK).
* **Orchestration**: Docker, Docker Compose.

---

## Local Development Setup

### Prerequisite
* Python 3.10+
* Node.js 18+
* (Optional) PostgreSQL database

### Step 1: Run the Backend API Server
1. Navigate into the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create a `.env` file (copied from `.env` template):
   ```env
   DATABASE_URL=sqlite:///./loans_dev.db
   SECRET_KEY=super-secret-development-key-please-change-in-production-12345
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *Note: If `GEMINI_API_KEY` is left blank, the backend automatically generates high-fidelity mock recommendation reports so you can test all features offline.*
5. Run the server:
   ```bash
   uvicorn app.main:app --reload
   ```
   *Note: The server automatically initializes tables and seeds the database with loan products on first boot.*
6. Access Swagger API Documentation:
   Navigate to `http://localhost:8000/docs` in your browser.

---

### Step 2: Run the Frontend Client
1. Open a new terminal and navigate to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Launch the development server:
   ```bash
   npm run dev
   ```
4. Open the app:
   Navigate to `http://localhost:3000` in your browser.

---

## Setup with Docker Compose

Running via Docker Compose automatically provisions a PostgreSQL database, runs backend seeding, and serves the client.

1. Ensure Docker and Docker Compose are installed on your machine.
2. In the workspace root directory, start the services:
   ```bash
   docker-compose up --build
   ```
3. (Optional) Run with your Gemini Key:
   ```bash
   # On Windows (PowerShell):
   $env:GEMINI_API_KEY="AIzaSy..."
   docker-compose up --build
   
   # On Linux/macOS:
   GEMINI_API_KEY="AIzaSy..." docker-compose up --build
   ```
4. Access endpoints:
   - Next.js Client: `http://localhost:3000`
   - FastAPI REST API Docs: `http://localhost:8000/docs`
   - PostgreSQL Port: `5432`

---

## Running Automated Tests

We use `pytest` with an in-memory SQLite database to run isolated unit tests for the credit eligibility and bank matching services.

1. Navigate to the backend folder:
   ```bash
   cd backend
   ```
2. Run tests:
   ```bash
   .\venv\Scripts\python -m pytest
   ```
