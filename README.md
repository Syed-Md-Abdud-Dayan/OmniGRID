# OmniGRID

OmniGRID is a utility billing demo for managing electricity, water, and gas meters. Customers can create an account, track saved meters, recharge a meter through the SSLCOMMERZ sandbox, pay meter bills, request meter loans, and review transactions.

## Features

- Customer sign-up with an automatically assigned customer ID and password-based sign-in
- Customer details and password hashes stored in SQLite
- Separate saved meters, balances, and loans for each customer and utility category
- Meter recharge through SSLCOMMERZ sandbox checkout
- Meter bill payments deducted from the selected electricity meter balance; any shortfall is recorded as a loan
- Transaction history and balance/loan breakdowns
- React dashboard with utility category and meter selection

## Tech stack

- Python and Flask API
- SQLite database
- React, Vite, and Tailwind CSS

## Requirements

- Python 3.10 or newer
- Node.js 20.19+ or 22.12+ and npm (required by the installed Vite version)
- SSLCOMMERZ sandbox store credentials to test online checkout

## Run locally on Windows

### 1. Configure the backend

From the project folder, create and activate a Python virtual environment, then install Flask:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install Flask
```

Copy the environment template and edit `.env` with your SSLCOMMERZ sandbox details:

```powershell
Copy-Item .env.example .env
```

Set these values in `.env`:

```dotenv
SSLCOMMERZ_STORE_ID=your_sandbox_store_id
SSLCOMMERZ_STORE_PASSWORD=your_sandbox_store_password
SSLCOMMERZ_CALLBACK_BASE_URL=https://your-public-https-tunnel
FRONTEND_BASE_URL=http://localhost:5173
```

Use the HTTPS URL from your tunnel for `SSLCOMMERZ_CALLBACK_BASE_URL`; for example, when using ngrok, start a tunnel to port 5000 and put its `https://...` address here. Keep the store password private and do not commit `.env`.

Start the backend in the project folder:

```powershell
python backend.py
```

The Flask API runs at `http://localhost:5000`. It initializes `utility_billing.db` in the project folder on startup.

### 2. Start the frontend

Open a second terminal and run:

```powershell
cd frontend
npm ci
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. The Vite development server forwards `/api` requests to the Flask backend on port 5000.

### 3. Test payment callbacks

SSLCOMMERZ must reach the backend's callback routes over public HTTPS. Start your HTTPS tunnel to local port 5000 and make sure its URL matches `SSLCOMMERZ_CALLBACK_BASE_URL` in `.env`. Keep the Flask backend and tunnel running during checkout. Use sandbox credentials and sandbox payment details only.

## Useful commands

Run these from the `frontend` folder:

```powershell
npm run lint
npm run build
```

Check backend connectivity at `http://localhost:5000/api/status`.

## Project layout

```text
.
├── backend.py            # Flask API, sessions, payments, and application routes
├── db.py                 # SQLite connection and schema initialization
├── customer.py           # Customer model
├── meter.py              # Meter model
├── bill.py               # Utility bill calculation
├── loan.py               # Loan model
├── utility_billing.db    # Created automatically; local customer and transaction data
├── .env.example          # Environment variable template
└── frontend/             # React and Vite client
```

## Local data and secrets

`.env`, the SQLite database, Python virtual environments, `frontend/node_modules`, and the generated frontend build are excluded by `.gitignore`. The database contains customer and transaction data; keep it private and back it up separately if you need to preserve local records. Do not use this demo with real payment credentials or production customer data.
