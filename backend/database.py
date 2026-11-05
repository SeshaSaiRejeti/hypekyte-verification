import json
import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).resolve().parent / "hypekyte.db"


def get_connection():
    return sqlite3.connect(DATABASE_PATH, timeout=10)


def create_table():
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_name TEXT NOT NULL,
                address TEXT NOT NULL,
                phone TEXT,
                status TEXT,
                confidence REAL,
                source TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        existing_columns = {
            row[1] for row in cursor.execute(
                "PRAGMA table_info(verifications)"
            ).fetchall()
        }
        new_columns = {
            "business_category": "TEXT",
            "gstin": "TEXT",
            "email": "TEXT",
            "result_json": "TEXT",
        }
        for column, data_type in new_columns.items():
            if column not in existing_columns:
                cursor.execute(
                    f"ALTER TABLE verifications ADD COLUMN {column} {data_type}"
                )
        conn.commit()
    finally:
        conn.close()


def save_verification(
    business_name,
    address,
    phone,
    result,
    business_category="",
    gstin="",
    email="",
):
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO verifications
            (business_name, business_category, address, phone, gstin, email,
             status, confidence, source, result_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            business_name,
            business_category,
            address,
            phone,
            gstin,
            email,
            result["status"],
            result["confidence"],
            result["source"],
            json.dumps(result),
        ))
        verification_id = cursor.lastrowid
        conn.commit()
        return verification_id
    finally:
        conn.close()


def get_all_verifications():
    conn = get_connection()
    try:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(
            "SELECT * FROM verifications ORDER BY id DESC"
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_verification_by_id(verification_id):
    conn = get_connection()
    try:
        conn.row_factory = sqlite3.Row
        row = conn.execute(
            "SELECT * FROM verifications WHERE id = ?",
            (verification_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()
