# OmniGRID

OmniGRID is a utility billing demo for electricity, water, and gas. Customers can create accounts, save meters, recharge meters through the SSLCOMMERZ sandbox, request loans, pay electricity bills, and view their balances and transaction history.

> **Project status:** Student/demo project. Payments use the SSLCOMMERZ sandbox. Electricity bill payments are supported; water and gas bill payments are not yet available.

## Features

- Customer registration with an automatically assigned customer ID
- Password-based sign-in; passwords are stored as hashes
- Customer and meter data stored in SQLite
- Electricity, water, and gas meter records associated with each customer
- Meter balances, loans, and transaction history
- SSLCOMMERZ sandbox checkout for meter recharges
- Electricity bills calculated at **BDT 5.50 per unit**
- Bill costs deducted from the selected meter balance; any unpaid amount is recorded as a loan

## Technology

- **Backend:** Python and Flask
- **Database:** SQLite
- **Frontend:** React, Vite, and Tailwind CSS
- **Payment testing:** SSLCOMMERZ sandbox

## Requirements

- Python 3.10 or newer
- Node.js 20.19+ or 22.12+ and npm
- SSLCOMMERZ sandbox Store ID and Store Password to test checkout
- A public HTTPS tunnel to receive payment callbacks during local testing

## Run locally on Windows

The backend and frontend run in **two separate PowerShell terminals**. Keep both terminals open while using OmniGRID.

### Terminal 1: prepare the database and start the backend

Open PowerShell in the project folder—the folder containing `backend.py` and `db.py`. If your terminal starts somewhere else, change to the project folder first. For example:

```powershell
cd "C:\path\to\Utility Billing"
```

Replace the example path with the folder where you saved the project.

Create a Python virtual environment, activate it, and install Flask:

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install Flask
```

Create your local environment file from the example:

```powershell
Copy-Item .env.example .env
```

Open `.env` and enter your SSLCOMMERZ sandbox details:

```dotenv
SSLCOMMERZ_STORE_ID=your_sandbox_store_id
SSLCOMMERZ_STORE_PASSWORD=your_sandbox_store_password
SSLCOMMERZ_CALLBACK_BASE_URL=https://your-public-https-tunnel
FRONTEND_BASE_URL=http://localhost:5173
```

Do not add quotation marks around the values. Keep your Store Password private, and never commit `.env` to GitHub.

Initialize the database:

```powershell
python db.py
```

This creates `utility_billing.db` and prepares its tables. The backend also initializes the database automatically when it starts.

Start the Flask backend and leave it running:

```powershell
python backend.py
```

The API runs at `http://localhost:5000`.

### Terminal 2: install and start the frontend

Open a second PowerShell terminal in the project folder, then move into the frontend folder:

```powershell
cd frontend
npm ci
npm run dev
```

Open the address Vite prints, usually `http://localhost:5173`. The Vite development server forwards API requests to the Flask backend on port `5000`.

### Optional: enable SSLCOMMERZ sandbox callbacks

To test a recharge, SSLCOMMERZ must be able to reach your backend over public HTTPS. In a third terminal, start your tunnel to port `5000`. For example:

```powershell
ngrok http 5000
```

Copy the HTTPS URL shown by ngrok into `.env` as `SSLCOMMERZ_CALLBACK_BASE_URL`, then restart the backend. If the tunnel URL changes, update `.env` and restart the backend again.

Use sandbox credentials and the test payment details supplied by SSLCOMMERZ. Keep the backend, frontend, and tunnel running during checkout. Sandbox recharge amounts must be between **BDT 10 and BDT 500,000**.

## Customer and meter behavior

- Sign-up asks for a name, age, mobile number, and password.
- The backend assigns a customer ID after registration. Use that ID and the password to sign in.
- Meter records and balances are kept separately for each customer and utility category.
- Recharges and loans can be associated with electricity, water, or gas meters.
- Bill payments currently support electricity meters only.
- A loan adds funds to the selected meter and increases its outstanding loan.
- Meter suggestions are scoped to the signed-in customer.
- Customer ID suggestions may be saved in the browser; they do not replace the password requirement.

## API overview

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/status` | Check the backend status and API version |
| `POST` | `/api/signup` | Register a customer |
| `POST` | `/api/login` | Sign in with a customer ID and password |
| `POST` | `/api/logout` | Sign out |
| `GET` | `/api/me` | Get the currently signed-in customer |
| `GET` | `/api/customer/<customer_id>` | Get customer details |
| `GET` | `/api/customer/<customer_id>/meters?category=electricity` | Get saved meters in a category |
| `GET` | `/api/customer/<customer_id>/transactions` | Get transaction history |
| `POST` | `/api/customer/<customer_id>/recharge` | Start a sandbox recharge checkout |
| `POST` | `/api/customer/<customer_id>/loan` | Add a loan to a meter |
| `POST` | `/api/customer/<customer_id>/bill` | Process an electricity meter bill |

SSLCOMMERZ uses these callback routes:

- `/api/payments/success`
- `/api/payments/fail`
- `/api/payments/cancel`
- `/api/payments/ipn`

Customer-specific routes require an authenticated session.

## Database

The SQLite database file is named `utility_billing.db` and is created in the project folder.

Main tables:

- `customers` — customer IDs, names, password hashes, ages, and mobile numbers
- `customer_meters` — each customer’s meters, utility categories, balances, and loans
- `transactions` — recharge, loan, and bill activity
- `payment_attempts` — SSLCOMMERZ checkout attempts and their statuses

The database contains local customer and transaction records. Back it up separately if you need to preserve it.

## Useful commands

Run these from the `frontend` folder:

```powershell
npm run lint
npm run build
```

Check whether the backend is responding at:

```text
http://localhost:5000/api/status
```

## Project structure

```text
.
├── backend.py             # Flask API, sessions, billing, loans, and payments
├── db.py                  # SQLite connection and database initialization
├── bill.py                # Electricity bill calculation
├── customer.py            # Customer model
├── loan.py                # Loan model
├── meter.py               # Meter model
├── .env.example           # Environment variable template
├── README.md
└── frontend/
    ├── package.json
    ├── vite.config.js     # Proxies API requests to Flask
    └── src/
        ├── App.jsx
        ├── App.css
        └── index.css
```

## Secrets and local files

The root `.gitignore` excludes `.env`, the SQLite database, Python virtual environments, frontend dependencies, and the generated frontend build. Keep these exclusions in place.

Use sandbox credentials and test data only. OmniGRID is a learning/demo project and has not been configured for production payments or real customer data.
