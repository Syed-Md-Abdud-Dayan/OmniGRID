import sqlite3
from pathlib import Path

DB_NAME = Path(__file__).resolve().with_name("utility_billing.db")


def get_connection():
    connection = sqlite3.connect(str(DB_NAME))
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    connection = get_connection()
    cursor = connection.cursor()
    existing = cursor.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'customers'"
    ).fetchone()

    customer_schema = """
        CREATE TABLE {table_name} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            balance REAL NOT NULL DEFAULT 0,
            loan REAL NOT NULL DEFAULT 0,
            password_hash TEXT,
            age INTEGER,
            mobile_number TEXT
        )
    """

    if not existing:
        cursor.execute(customer_schema.format(table_name="customers"))
    else:
        old_columns = {
            row[1] for row in cursor.execute("PRAGMA table_info(customers)").fetchall()
        }
        if "meter_number" in old_columns:
            cursor.execute(customer_schema.format(table_name="customers_new"))
            available = {
                name: name if name in old_columns else default
                for name, default in {
                    "id": "NULL",
                    "customer_id": "NULL",
                    "name": "NULL",
                    "balance": "0",
                    "loan": "0",
                    "password_hash": "NULL",
                    "age": "NULL",
                    "mobile_number": "NULL",
                }.items()
            }
            cursor.execute(
                """INSERT INTO customers_new
                   (id, customer_id, name, balance, loan, password_hash, age, mobile_number)
                   SELECT {id}, {customer_id}, {name}, {balance}, {loan},
                          {password_hash}, {age}, {mobile_number}
                   FROM customers""".format(**available)
            )
            cursor.execute("DROP TABLE customers")
            cursor.execute("ALTER TABLE customers_new RENAME TO customers")
        else:
            for column, definition in (
                ("password_hash", "TEXT"),
                ("age", "INTEGER"),
                ("mobile_number", "TEXT"),
            ):
                if column not in old_columns:
                    cursor.execute(f"ALTER TABLE customers ADD COLUMN {column} {definition}")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id TEXT NOT NULL,
            type TEXT NOT NULL,
            description TEXT NOT NULL,
            amount REAL NOT NULL,
            positive INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    transaction_columns = {
        row[1] for row in cursor.execute("PRAGMA table_info(transactions)").fetchall()
    }
    if "category" not in transaction_columns:
        cursor.execute("ALTER TABLE transactions ADD COLUMN category TEXT")
    if "meter_number" not in transaction_columns:
        cursor.execute("ALTER TABLE transactions ADD COLUMN meter_number TEXT")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS customer_meters (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('electricity', 'water', 'gas')),
            meter_number TEXT NOT NULL,
            balance REAL NOT NULL DEFAULT 0,
            loan REAL NOT NULL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(customer_id, category, meter_number)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS payment_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tran_id TEXT NOT NULL UNIQUE,
            customer_id TEXT NOT NULL,
            category TEXT NOT NULL CHECK(category IN ('electricity', 'water', 'gas')),
            meter_number TEXT NOT NULL,
            amount REAL NOT NULL,
            email TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK(status IN ('pending', 'success', 'failed', 'cancelled')),
            validation_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    connection.commit()
    connection.close()


if __name__ == "__main__":
    init_db()
    print("Database initialized successfully.")
