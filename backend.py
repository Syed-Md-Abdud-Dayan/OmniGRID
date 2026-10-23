import math
import os
import re
import secrets
import json
import urllib.error
import urllib.parse
import urllib.request
import uuid
from decimal import Decimal, InvalidOperation
from pathlib import Path

from flask import Flask, jsonify, redirect, request, session
from werkzeug.security import check_password_hash, generate_password_hash

from bill import Bill, RATE_PER_UNIT
from customer import Customer
from db import get_connection, init_db
from loan import Loan


def load_local_env():
    """Load simple KEY=value entries from the project-local .env file."""
    env_path = Path(__file__).resolve().with_name(".env")
    if not env_path.is_file():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"").strip("'")
        if key:
            os.environ.setdefault(key, value)


load_local_env()

app = Flask(__name__)
app.secret_key = os.environ.get("UTILITY_BILLING_SECRET_KEY") or secrets.token_hex(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_NAME="utility_billing_session",
)


def load_customer(customer_id):
    connection = get_connection()
    row = connection.execute(
        "SELECT * FROM customers WHERE customer_id = ?", (str(customer_id),)
    ).fetchone()
    connection.close()
    if row is None:
        return None

    loan = Loan()
    loan.loan_amt = float(row["loan"])
    customer = Customer(
        name=row["name"],
        cust_id=row["customer_id"],
        meter_num=0,
        initial_bal=float(row["balance"]),
    )
    customer.meter.loan = loan
    return customer


def customer_data(customer):
    connection = get_connection()
    details = connection.execute(
        "SELECT age, mobile_number FROM customers WHERE customer_id = ?",
        (customer.cust_id,),
    ).fetchone()
    meter_rows = connection.execute(
        "SELECT category, meter_number, balance, loan FROM customer_meters WHERE customer_id = ? ORDER BY category, id",
        (customer.cust_id,),
    ).fetchall()
    totals = connection.execute(
        """SELECT COALESCE(SUM(balance), 0) AS balance, COALESCE(SUM(loan), 0) AS loan
           FROM customer_meters WHERE customer_id = ?""",
        (customer.cust_id,),
    ).fetchone()
    connection.close()
    return {
        "name": customer.name,
        "customer_id": customer.cust_id,
        "registered_meters": [
            {
                "category": row["category"],
                "meter_number": row["meter_number"],
                "balance": float(row["balance"]),
                "loan": float(row["loan"]),
            }
            for row in meter_rows
        ],
        "meter_count": len(meter_rows),
        "balance": customer.meter.get_balance() + float(totals["balance"]),
        "loan": customer.meter.loan.get_loan_amount() + float(totals["loan"]),
        "age": details["age"] if details else None,
        "mobile_number": details["mobile_number"] if details else None,
    }


def authenticated_customer(account_id):
    customer_id = session.get("customer_id")
    if not customer_id:
        return None, (jsonify({"success": False, "message": "Please sign in."}), 401)
    if str(account_id).upper() != customer_id:
        return None, (jsonify({"success": False, "message": "Account is not available to this session."}), 403)

    customer = load_customer(customer_id)
    if customer is None:
        session.clear()
        return None, (jsonify({"success": False, "message": "Account not found."}), 401)
    return customer, None


def save_customer(customer):
    connection = get_connection()
    connection.execute(
        "UPDATE customers SET balance = ?, loan = ? WHERE customer_id = ?",
        (
            customer.meter.get_balance(),
            customer.meter.loan.get_loan_amount(),
            customer.cust_id,
        ),
    )
    connection.commit()
    connection.close()


SERVICE_CATEGORIES = {"electricity", "water", "gas"}


def load_service_customer(owner, category, meter_number, create=False):
    if category not in SERVICE_CATEGORIES:
        return None
    if not re.fullmatch(r"[0-9]{4,32}", meter_number):
        return None

    connection = get_connection()
    row = connection.execute(
        """SELECT id, balance, loan FROM customer_meters
           WHERE customer_id = ? AND category = ? AND meter_number = ?""",
        (owner.cust_id, category, meter_number),
    ).fetchone()
    if row is None and create:
        connection.execute(
            """INSERT INTO customer_meters (customer_id, category, meter_number)
               VALUES (?, ?, ?)""",
            (owner.cust_id, category, meter_number),
        )
        connection.commit()
        row = connection.execute(
            """SELECT id, balance, loan FROM customer_meters
               WHERE customer_id = ? AND category = ? AND meter_number = ?""",
            (owner.cust_id, category, meter_number),
        ).fetchone()
    connection.close()
    if row is None:
        return None

    service_customer = Customer(
        name=owner.name,
        cust_id=owner.cust_id,
        meter_num=int(meter_number),
        initial_bal=float(row["balance"]),
    )
    service_customer.meter.loan.loan_amt = float(row["loan"])
    service_customer.service_meter_id = row["id"]
    return service_customer


def save_service_customer(customer):
    connection = get_connection()
    connection.execute(
        "UPDATE customer_meters SET balance = ?, loan = ? WHERE id = ?",
        (
            customer.meter.get_balance(),
            customer.meter.loan.get_loan_amount(),
            customer.service_meter_id,
        ),
    )
    connection.commit()
    connection.close()


def validate_service_details(data):
    category = str(data.get("category") or "").strip().lower()
    meter_number = re.sub(r"\s+", "", str(data.get("meter_number") or ""))
    if category not in SERVICE_CATEGORIES:
        return None, None, (jsonify({"success": False, "message": "Choose electricity, water, or gas."}), 400)
    if not re.fullmatch(r"[0-9]{4,32}", meter_number):
        return None, None, (jsonify({"success": False, "message": "Enter a valid meter number (4–32 digits)."}), 400)
    return category, meter_number, None


def add_transaction(customer, transaction_type, description, amount, positive):
    connection = get_connection()
    connection.execute(
        """INSERT INTO transactions
           (customer_id, type, description, amount, positive)
           VALUES (?, ?, ?, ?, ?)""",
        (
            customer.cust_id,
            transaction_type,
            description,
            float(amount),
            int(positive),
        ),
    )
    connection.commit()
    connection.close()


def customer_id_prefix(name):
    words = re.findall(r"[A-Za-z]+", name.upper())
    if len(words) >= 2:
        return words[0][0] + words[-1][0]
    letters = "".join(words)
    return (letters[:2] if len(letters) >= 2 else (letters + "X")[:2]) or "CU"


def generate_customer_id(name, connection):
    prefix = customer_id_prefix(name)
    connection.execute("BEGIN IMMEDIATE")
    used_numbers = []
    for row in connection.execute(
        "SELECT customer_id FROM customers WHERE customer_id LIKE ?", (prefix + "%",)
    ).fetchall():
        match = re.fullmatch(re.escape(prefix) + r"([0-9]{7})", row["customer_id"])
        if match:
            used_numbers.append(int(match.group(1)))
    number = max(used_numbers, default=0) + 1
    if number > 9_999_999:
        raise RuntimeError("Customer ID sequence is full for these initials.")
    return f"{prefix}{number:07d}"


@app.route("/api/status", methods=["GET"])
def status():
    return jsonify({"success": True, "api_version": 5, "message": "OmniGRID API v5 is running!"})


@app.route("/api/signup", methods=["POST"])
def signup():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name") or "").strip()
    mobile_number = re.sub(r"[\s()-]", "", str(data.get("mobile_number") or ""))
    password = data.get("password")

    if len(name) < 2 or len(name) > 80:
        return jsonify({"success": False, "message": "Enter a name between 2 and 80 characters."}), 400
    try:
        age = int(data.get("age"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Enter a valid age."}), 400
    if age < 18 or age > 120:
        return jsonify({"success": False, "message": "Age must be between 18 and 120."}), 400
    if not re.fullmatch(r"\+?[0-9]{7,15}", mobile_number):
        return jsonify({"success": False, "message": "Enter a valid mobile number."}), 400
    if not isinstance(password, str) or len(password) < 8 or len(password) > 128:
        return jsonify({"success": False, "message": "Password must be 8–128 characters."}), 400

    connection = get_connection()
    customer_id = generate_customer_id(name, connection)

    connection.execute(
        """INSERT INTO customers
           (customer_id, name, balance, loan, password_hash, age, mobile_number)
           VALUES (?, ?, 0, 0, ?, ?, ?)""",
        (customer_id, name, generate_password_hash(password), age, mobile_number),
    )
    connection.commit()
    connection.close()
    session.clear()
    customer = load_customer(customer_id)
    return jsonify({"success": True, "customer": customer_data(customer)}), 201

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    customer_id = str(data.get("customer_id") or "").strip().upper()
    password = data.get("password")

    if not customer_id or not isinstance(password, str) or not password:
        return jsonify({"success": False, "message": "Enter your customer ID and password."}), 400

    connection = get_connection()
    row = connection.execute(
        "SELECT customer_id, password_hash FROM customers WHERE customer_id = ?",
        (customer_id,),
    ).fetchone()
    connection.close()

    if row is None or not row["password_hash"] or not check_password_hash(row["password_hash"], password):
        return jsonify({"success": False, "message": "Customer ID or password is incorrect."}), 401

    session.clear()
    session["customer_id"] = row["customer_id"]
    customer = load_customer(row["customer_id"])
    return jsonify({"success": True, "customer": customer_data(customer)})


@app.route("/api/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"success": True})


@app.route("/api/me", methods=["GET"])
def current_account():
    customer_id = session.get("customer_id")
    if not customer_id:
        return jsonify({"success": False, "message": "Please sign in."}), 401
    customer = load_customer(customer_id)
    if customer is None:
        session.clear()
        return jsonify({"success": False, "message": "Account not found."}), 401
    return jsonify({"success": True, "customer": customer_data(customer)})

@app.route("/api/customer/<account_id>", methods=["GET"])
def get_customer(account_id):
    customer, error = authenticated_customer(account_id)
    if error:
        return error
    return jsonify({"success": True, "customer": customer_data(customer)})


@app.route("/api/customer/<account_id>/meters", methods=["GET"])
def get_saved_meters(account_id):
    customer, error = authenticated_customer(account_id)
    if error:
        return error
    category = str(request.args.get("category") or "").strip().lower()
    if category not in SERVICE_CATEGORIES:
        return jsonify({"success": False, "message": "Choose electricity, water, or gas."}), 400
    connection = get_connection()
    rows = connection.execute(
        """SELECT meter_number FROM customer_meters
           WHERE customer_id = ? AND category = ? ORDER BY created_at DESC, id DESC""",
        (customer.cust_id, category),
    ).fetchall()
    connection.close()
    return jsonify({"success": True, "meter_numbers": [row["meter_number"] for row in rows]})


@app.route("/api/customer/<account_id>/transactions", methods=["GET"])
def get_transactions(account_id):
    customer, error = authenticated_customer(account_id)
    if error:
        return error

    connection = get_connection()
    rows = connection.execute(
        """SELECT id, type, description, amount, positive, created_at
           FROM transactions WHERE customer_id = ? ORDER BY id DESC""",
        (customer.cust_id,),
    ).fetchall()
    connection.close()
    return jsonify({
        "success": True,
        "transactions": [
            {
                "id": row["id"],
                "type": row["type"],
                "description": row["description"],
                "date": row["created_at"],
                "amount": ("+" if row["positive"] else "-") + "\u09f3" + f'{row["amount"]:.2f}',
                "positive": bool(row["positive"]),
            }
            for row in rows
        ],
    })


def read_amount(data, label):
    if not data or "amount" not in data:
        return None, (jsonify({"success": False, "message": f"{label} amount is required."}), 400)
    try:
        amount = float(data["amount"])
    except (ValueError, TypeError):
        return None, (jsonify({"success": False, "message": f"Invalid {label.lower()} amount."}), 400)
    if not math.isfinite(amount) or amount <= 0:
        return None, (jsonify({"success": False, "message": f"{label} amount must be positive."}), 400)
    return amount, None


def sslcommerz_credentials():
    store_id = os.environ.get("SSLCOMMERZ_STORE_ID", "").strip()
    store_password = os.environ.get("SSLCOMMERZ_STORE_PASSWORD", "").strip()
    callback_base = os.environ.get("SSLCOMMERZ_CALLBACK_BASE_URL", "").strip().rstrip("/")
    if not store_id or not store_password:
        return None, (jsonify({"success": False, "message": "SSLCOMMERZ sandbox credentials are missing from .env."}), 503)
    if not callback_base.startswith("https://"):
        return None, (jsonify({"success": False, "message": "Set SSLCOMMERZ_CALLBACK_BASE_URL in .env to your public HTTPS backend URL before starting a payment."}), 503)
    return {"store_id": store_id, "store_password": store_password, "callback_base": callback_base}, None


def sslcommerz_post_session(payload):
    encoded = urllib.parse.urlencode(payload).encode("utf-8")
    request_object = urllib.request.Request(
        "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(request_object, timeout=25) as response:
        return json.loads(response.read().decode("utf-8"))


def sslcommerz_validate(val_id, credentials):
    query = urllib.parse.urlencode({
        "val_id": val_id,
        "store_id": credentials["store_id"],
        "store_passwd": credentials["store_password"],
        "format": "json",
    })
    url = "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?" + query
    with urllib.request.urlopen(url, timeout=25) as response:
        return json.loads(response.read().decode("utf-8"))


def credit_verified_recharge(tran_id, validation):
    connection = get_connection()
    try:
        connection.execute("BEGIN IMMEDIATE")
        attempt = connection.execute(
            "SELECT * FROM payment_attempts WHERE tran_id = ?", (tran_id,)
        ).fetchone()
        if attempt is None:
            connection.rollback()
            return False, "Payment reference was not found."
        if attempt["status"] == "success":
            connection.commit()
            return True, "Payment was already applied."

        validation_status = str(validation.get("status", "")).upper()
        validation_tran_id = str(validation.get("tran_id", ""))
        validation_currency = str(validation.get("currency", validation.get("currency_type", ""))).upper()
        try:
            paid_amount = Decimal(str(validation.get("amount", "0"))).quantize(Decimal("0.01"))
            expected_amount = Decimal(str(attempt["amount"])).quantize(Decimal("0.01"))
        except (InvalidOperation, TypeError):
            connection.rollback()
            return False, "Payment amount could not be verified."
        if (validation_status not in {"VALID", "VALIDATED"}
                or validation_tran_id != tran_id
                or validation_currency != "BDT"
                or paid_amount != expected_amount):
            connection.rollback()
            return False, "SSLCOMMERZ could not verify this payment."

        meter = connection.execute(
            """SELECT id, balance, loan FROM customer_meters
               WHERE customer_id = ? AND category = ? AND meter_number = ?""",
            (attempt["customer_id"], attempt["category"], attempt["meter_number"]),
        ).fetchone()
        if meter is None:
            connection.execute(
                """INSERT INTO customer_meters (customer_id, category, meter_number)
                   VALUES (?, ?, ?)""",
                (attempt["customer_id"], attempt["category"], attempt["meter_number"]),
            )
            meter = connection.execute(
                """SELECT id, balance, loan FROM customer_meters
                   WHERE customer_id = ? AND category = ? AND meter_number = ?""",
                (attempt["customer_id"], attempt["category"], attempt["meter_number"]),
            ).fetchone()

        amount = float(expected_amount)
        old_loan = float(meter["loan"])
        repaid = min(old_loan, amount)
        new_loan = old_loan - repaid
        new_balance = float(meter["balance"]) + amount - repaid
        connection.execute(
            "UPDATE customer_meters SET balance = ?, loan = ? WHERE id = ?",
            (new_balance, new_loan, meter["id"]),
        )
        context = f"{attempt['category'].title()} meter {attempt['meter_number']}: "
        connection.execute(
            """INSERT INTO transactions
               (customer_id, type, description, amount, positive, category, meter_number)
               VALUES (?, 'Meter Recharge', ?, ?, 1, ?, ?)""",
            (attempt["customer_id"], context + f"Recharge of BDT {amount:.2f}", amount,
             attempt["category"], attempt["meter_number"]),
        )
        if repaid > 0:
            connection.execute(
                """INSERT INTO transactions
                   (customer_id, type, description, amount, positive, category, meter_number)
                   VALUES (?, 'Loan Repayment', ?, ?, 0, ?, ?)""",
                (attempt["customer_id"], context + f"BDT {repaid:.2f} deducted from recharge",
                 repaid, attempt["category"], attempt["meter_number"]),
            )
        connection.execute(
            "UPDATE payment_attempts SET status = 'success', validation_id = ? WHERE tran_id = ?",
            (str(validation.get("val_id", "")), tran_id),
        )
        connection.commit()
        return True, "Payment verified and meter recharged."
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def handle_payment_callback(callback_kind):
    values = request.values
    tran_id = str(values.get("tran_id") or "").strip()
    if callback_kind in {"failed", "cancelled"}:
        if tran_id:
            connection = get_connection()
            connection.execute(
                """UPDATE payment_attempts SET status = ?
                   WHERE tran_id = ? AND status = 'pending'""",
                (callback_kind, tran_id),
            )
            connection.commit()
            connection.close()
        if callback_kind == "ipn":
            return "OK", 200
        frontend = os.environ.get("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
        return redirect(frontend + "?payment=" + callback_kind)

    val_id = str(values.get("val_id") or "").strip()
    if not tran_id or not val_id:
        if callback_kind == "ipn":
            return "Missing payment reference", 400
        frontend = os.environ.get("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
        return redirect(frontend + "?payment=failed")
    credentials, error = sslcommerz_credentials()
    if error:
        return ("Payment verification is temporarily unavailable", 503) if callback_kind == "ipn" else redirect(
            os.environ.get("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/") + "?payment=failed"
        )
    try:
        validation = sslcommerz_validate(val_id, credentials)
        credited, message = credit_verified_recharge(tran_id, validation)
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError):
        app.logger.exception("SSLCOMMERZ payment validation failed")
        return ("Could not validate payment", 503) if callback_kind == "ipn" else redirect(
            os.environ.get("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/") + "?payment=failed"
        )
    if callback_kind == "ipn":
        return ("OK", 200) if credited else (message, 400)
    frontend = os.environ.get("FRONTEND_BASE_URL", "http://localhost:5173").rstrip("/")
    return redirect(frontend + ("?payment=success" if credited else "?payment=failed"))


@app.route("/api/payments/success", methods=["GET", "POST"])
def payment_success():
    return handle_payment_callback("success")


@app.route("/api/payments/fail", methods=["GET", "POST"])
def payment_failed():
    return handle_payment_callback("failed")


@app.route("/api/payments/cancel", methods=["GET", "POST"])
def payment_cancelled():
    return handle_payment_callback("cancelled")


@app.route("/api/payments/ipn", methods=["GET", "POST"])
def payment_ipn():
    return handle_payment_callback("ipn")


@app.route("/api/customer/<account_id>/recharge", methods=["POST"])
def recharge_meter(account_id):
    owner, error = authenticated_customer(account_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    amount, error = read_amount(data, "Recharge")
    if error:
        return error
    if amount < 10 or amount > 500000:
        return jsonify({"success": False, "message": "SSLCOMMERZ sandbox recharge amounts must be between BDT 10 and BDT 500,000."}), 400
    category, service_meter_number, error = validate_service_details(data)
    if error:
        return error
    email = str(data.get("email") or "").strip()
    if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return jsonify({"success": False, "message": "Enter a valid email address for the payment."}), 400
    credentials, error = sslcommerz_credentials()
    if error:
        return error

    tran_id = "OG" + uuid.uuid4().hex[:24].upper()
    connection = get_connection()
    connection.execute(
        """INSERT INTO payment_attempts
           (tran_id, customer_id, category, meter_number, amount, email)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (tran_id, owner.cust_id, category, service_meter_number, amount, email),
    )
    connection.commit()
    connection.close()

    callback_base = credentials["callback_base"]
    customer_record = get_connection()
    customer_details = customer_record.execute(
        "SELECT mobile_number FROM customers WHERE customer_id = ?", (owner.cust_id,)
    ).fetchone()
    customer_record.close()
    customer_phone = re.sub(r"\D", "", str(customer_details["mobile_number"] if customer_details else ""))
    payload = {
        "store_id": credentials["store_id"],
        "store_passwd": credentials["store_password"],
        "total_amount": f"{amount:.2f}",
        "currency": "BDT",
        "tran_id": tran_id,
        "success_url": callback_base + "/api/payments/success",
        "fail_url": callback_base + "/api/payments/fail",
        "cancel_url": callback_base + "/api/payments/cancel",
        "ipn_url": callback_base + "/api/payments/ipn",
        "cus_name": owner.name,
        "cus_email": email,
        "cus_add1": "Dhaka",
        "cus_city": "Dhaka",
        "cus_country": "Bangladesh",
        "cus_phone": customer_phone,
        "shipping_method": "NO",
        "product_name": category.title() + " Meter Recharge",
        "product_category": "Utility service",
        "product_profile": "non-physical-goods",
        "num_of_item": 1,
    }
    gateway_error = None
    try:
        gateway_response = sslcommerz_post_session(payload)
    except (urllib.error.URLError, TimeoutError, ValueError, json.JSONDecodeError) as error:
        app.logger.exception("Could not create SSLCOMMERZ checkout session")
        gateway_response = {}
        gateway_error = error
    gateway_url = gateway_response.get("GatewayPageURL")
    if str(gateway_response.get("status", "")).upper() != "SUCCESS" or not gateway_url:
        connection = get_connection()
        connection.execute(
            "UPDATE payment_attempts SET status = 'failed' WHERE tran_id = ? AND status = 'pending'",
            (tran_id,),
        )
        connection.commit()
        connection.close()
        if gateway_error:
            message = "Could not reach the SSLCOMMERZ sandbox. Check the backend terminal for the connection error."
        else:
            reason = str(
                gateway_response.get("failedreason")
                or gateway_response.get("failed_reason")
                or gateway_response.get("message")
                or ""
            )
            for secret in (credentials["store_id"], credentials["store_password"]):
                if secret:
                    reason = reason.replace(secret, "[hidden]")
            reason = re.sub(r"\s+", " ", reason).strip()[:200]
            status = str(gateway_response.get("status") or "unknown").strip()[:40]
            if reason:
                message = f"SSLCOMMERZ rejected checkout: {reason}"
            else:
                message = f"SSLCOMMERZ checkout was rejected (status: {status}). Check the sandbox credentials and required checkout fields."
            app.logger.warning("SSLCOMMERZ checkout rejected: status=%s reason=%s", status, reason)
        return jsonify({"success": False, "message": message}), 502

    return jsonify({"success": True, "redirect_url": gateway_url, "tran_id": tran_id})
@app.route("/api/customer/<account_id>/loan", methods=["POST"])
def take_loan(account_id):
    owner, error = authenticated_customer(account_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    amount, error = read_amount(data, "Loan")
    if error:
        return error
    category, service_meter_number, error = validate_service_details(data)
    if error:
        return error
    customer = load_service_customer(owner, category, service_meter_number, create=True)
    customer.meter.loan.take_loan(amount)
    customer.meter.bal += amount
    save_service_customer(customer)
    add_transaction(
        customer,
        "Loan Taken",
        f"{category.title()} meter {service_meter_number}: Emergency loan of BDT {amount:.2f}",
        amount,
        True,
    )
    return jsonify({
        "success": True,
        "message": f"Loan successful: BDT {amount:.2f} added to {category} meter {service_meter_number}.",
        "customer": customer_data(owner),
        "service_meter": {"category": category, "meter_number": service_meter_number,
                          "balance": customer.meter.get_balance(),
                          "loan": customer.meter.loan.get_loan_amount()},
    })

@app.route("/api/customer/<account_id>/bill", methods=["POST"])
def process_bill(account_id):
    owner, error = authenticated_customer(account_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    if "units" not in data:
        return jsonify({"success": False, "message": "Units consumed are required."}), 400
    try:
        units = float(data["units"])
    except (ValueError, TypeError):
        return jsonify({"success": False, "message": "Invalid units value."}), 400
    if not math.isfinite(units) or units <= 0:
        return jsonify({"success": False, "message": "Units consumed must be positive."}), 400

    category, meter_number, error = validate_service_details(data)
    if error:
        return error
    if category != "electricity":
        return jsonify({"success": False, "message": "Meter bills are currently available for electricity meters."}), 400

    meter_customer = load_service_customer(owner, category, meter_number, create=False)
    if meter_customer is None:
        return jsonify({"success": False, "message": "That electricity meter is not saved to your account. Select a saved meter."}), 404

    bill_amount = units * RATE_PER_UNIT
    balance_before = meter_customer.meter.get_balance()
    loan_before = meter_customer.meter.loan.get_loan_amount()
    bill_detail = Bill(units, meter_customer.meter).process_bill()
    balance_after = meter_customer.meter.get_balance()
    loan_after = meter_customer.meter.loan.get_loan_amount()
    loan_added = max(0.0, loan_after - loan_before)
    save_service_customer(meter_customer)

    meter_context = f"Electricity meter {meter_number}: "
    add_transaction(
        meter_customer,
        "Electricity Bill",
        meter_context + f"{units:.2f} units | Bill BDT {bill_amount:.2f}",
        bill_amount,
        False,
    )
    if loan_added > 0:
        add_transaction(
            meter_customer,
            "Loan Added",
            meter_context + f"BDT {loan_added:.2f} added because balance was insufficient",
            loan_added,
            True,
        )

    return jsonify({
        "success": True,
        "message": meter_context + bill_detail,
        "units": units,
        "rate_per_unit": RATE_PER_UNIT,
        "bill_amount": bill_amount,
        "balance_before": balance_before,
        "balance_after": balance_after,
        "loan_before": loan_before,
        "loan_after": loan_after,
        "loan_added": loan_added,
        "customer": customer_data(owner),
    })


init_db()

if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG") == "1", port=5000)

