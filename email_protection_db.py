import sqlite3
import os
import re
import json
from datetime import datetime

DB_FILE = os.environ.get("DB_PATH") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "phishshift.db")

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
DOMAIN_REGEX = re.compile(r"^@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # 1. Connection table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inbox_connection (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                provider TEXT NOT NULL,
                status TEXT NOT NULL,
                email TEXT NOT NULL,
                is_demo INTEGER NOT NULL DEFAULT 1,
                last_synced TEXT
            )
        """)
        
        # 2. Senders table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS senders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL COLLATE NOCASE,
                list_type TEXT NOT NULL CHECK(list_type IN ('trusted', 'blocked')),
                note TEXT,
                created_at TEXT NOT NULL
            )
        """)
        
        # 3. Inbox messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS inbox_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender TEXT NOT NULL,
                recipient TEXT NOT NULL,
                subject TEXT NOT NULL,
                snippet TEXT NOT NULL,
                body TEXT NOT NULL,
                received_at TEXT NOT NULL,
                scan_status TEXT NOT NULL DEFAULT 'pending',
                verdict TEXT,
                severity_level TEXT,
                model_score REAL,
                warning_signs TEXT,
                status TEXT NOT NULL DEFAULT 'inbox',
                created_at TEXT NOT NULL
            )
        """)
        
        # 4. Threat alerts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS threat_alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                message_id INTEGER UNIQUE NOT NULL,
                sender TEXT NOT NULL,
                subject TEXT NOT NULL,
                severity_level TEXT NOT NULL,
                detected_at TEXT NOT NULL,
                is_read INTEGER NOT NULL DEFAULT 0,
                is_dismissed INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (message_id) REFERENCES inbox_messages (id)
            )
        """)
        
        # Seed initial connection if absent
        cursor.execute("SELECT COUNT(*) FROM inbox_connection WHERE id = 1")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO inbox_connection (id, provider, status, email, is_demo, last_synced)
                VALUES (1, 'demo', 'connected', 'user.protect@phishshift-demo.com', 1, ?)
            """, (datetime.utcnow().isoformat(),))
            
        # Seed initial senders if absent
        cursor.execute("SELECT COUNT(*) FROM senders")
        if cursor.fetchone()[0] == 0:
            initial_senders = [
                ('notifications@google.com', 'trusted', 'Official security notifications from Google'),
                ('security@apple.com', 'trusted', 'Apple ID and account alerts'),
                ('alerts@hdfcbank.net', 'trusted', 'Verified transactional alerts'),
                ('urgent-action@kyc-bank-verify.top', 'blocked', 'Known credential harvester domain'),
                ('winner-claim@lottery-bonus.xyz', 'blocked', 'Repeated fake lottery spam')
            ]
            now_iso = datetime.utcnow().isoformat()
            cursor.executemany("""
                INSERT INTO senders (email, list_type, note, created_at)
                VALUES (?, ?, ?, ?)
            """, [(s[0], s[1], s[2], now_iso) for s in initial_senders])
            
        # Seed initial demo messages if absent
        cursor.execute("SELECT COUNT(*) FROM inbox_messages")
        if cursor.fetchone()[0] == 0:
            seed_initial_messages(cursor)
            
        conn.commit()

def seed_initial_messages(cursor):
    sample_emails = [
        {
            "sender": "account-security@sbi-kyc-update.xyz",
            "recipient": "user.protect@phishshift-demo.com",
            "subject": "URGENT: Your account at State Bank has been suspended! Verify KYC immediately",
            "snippet": "Your account has been restricted due to non-compliance with KYC regulations. Please verify your details...",
            "body": "URGENT NOTIFICATION: Your online banking account at State Bank has been suspended due to overdue KYC verification. To restore access immediately and prevent permanent deactivation, click here: http://sbi-kyc-update.xyz/verify-pan and submit your ATM PIN and password within 24 hours.",
            "received_at": "12 minutes ago",
            "scan_status": "pending",
            "status": "inbox"
        },
        {
            "sender": "payroll@workplace-portal.io",
            "recipient": "user.protect@phishshift-demo.com",
            "subject": "Action Required: Update your bank account details for upcoming salary deposit",
            "snippet": "We encountered an issue processing your direct deposit. Please re-enter your banking credentials...",
            "body": "Hello, we encountered a payment failure for your monthly direct deposit. You must verify and confirm your net banking login and routing details immediately at http://192.168.1.105/portal/login to receive your payout on time.",
            "received_at": "45 minutes ago",
            "scan_status": "pending",
            "status": "inbox"
        },
        {
            "sender": "orders@amazon.in",
            "recipient": "user.protect@phishshift-demo.com",
            "subject": "Shipped: Your order #402-8827391 has been dispatched",
            "snippet": "Great news! Your package is on its way with Amazon Logistics. Track your delivery anytime...",
            "body": "Hi there, your order with Amazon has been dispatched. Track your delivery package using your Amazon app or visit https://www.amazon.in/your-orders for the latest updates. Thank you for shopping with us.",
            "received_at": "2 hours ago",
            "scan_status": "pending",
            "status": "inbox"
        },
        {
            "sender": "security-alert@microsoft-support.co",
            "recipient": "user.protect@phishshift-demo.com",
            "subject": "Password Expiry Notice: Your work email access will expire in 2 hours",
            "snippet": "Your password is set to expire today. Keep your current password by clicking the verification link...",
            "body": "Microsoft Support Alert: Your account password will expire today. Keep your existing password by confirming your login details immediately at http://microsoft-support.co.win/keep-password before disconnection.",
            "received_at": "3 hours ago",
            "scan_status": "pending",
            "status": "inbox"
        },
        {
            "sender": "team@linear.app",
            "recipient": "user.protect@phishshift-demo.com",
            "subject": "Engineering Sprint #42: Weekly summary & roadmap discussion",
            "snippet": "Here is the summary of closed issues and upcoming release goals for the mobile team...",
            "body": "Hi Team, Sprint #42 is now wrapped up. We closed 24 tickets including latency optimizations and dark mode fixes. View the full sprint board on Linear or catch up during Monday standup.",
            "received_at": "5 hours ago",
            "scan_status": "pending",
            "status": "inbox"
        }
    ]
    
    now_iso = datetime.utcnow().isoformat()
    for email in sample_emails:
        cursor.execute("""
            INSERT INTO inbox_messages (sender, recipient, subject, snippet, body, received_at, scan_status, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            email["sender"], email["recipient"], email["subject"],
            email["snippet"], email["body"], email["received_at"],
            email["scan_status"], email["status"], now_iso
        ))

def get_connection_info():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT provider, status, email, is_demo, last_synced FROM inbox_connection WHERE id = 1")
        row = cursor.fetchone()
        if not row:
            return {"provider": "demo", "status": "disconnected", "email": "", "is_demo": 1, "last_synced": None}
        return dict(row)

def update_connection_info(provider, status, email, is_demo):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE inbox_connection
            SET provider = ?, status = ?, email = ?, is_demo = ?, last_synced = ?
            WHERE id = 1
        """, (provider, status, email, 1 if is_demo else 0, datetime.utcnow().isoformat()))
        conn.commit()
    return get_connection_info()

def get_senders(list_type=None):
    with get_db() as conn:
        cursor = conn.cursor()
        if list_type:
            cursor.execute("SELECT id, email, list_type, note, created_at FROM senders WHERE list_type = ? ORDER BY id DESC", (list_type,))
        else:
            cursor.execute("SELECT id, email, list_type, note, created_at FROM senders ORDER BY id DESC")
        return [dict(row) for row in cursor.fetchall()]

def add_sender(email, list_type, note=""):
    clean_email = email.strip().lower()
    if not clean_email:
        raise ValueError("Email address or domain cannot be empty.")
        
    is_valid_email = bool(EMAIL_REGEX.match(clean_email))
    is_valid_domain = bool(DOMAIN_REGEX.match(clean_email))
    if not (is_valid_email or is_valid_domain):
        raise ValueError("Please enter a valid email address (e.g., name@example.com) or domain rule (e.g., @company.com).")
        
    if list_type not in ('trusted', 'blocked'):
        raise ValueError("List type must be either 'trusted' or 'blocked'.")
        
    now_iso = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        # Check if already exists in either list
        cursor.execute("SELECT id, list_type FROM senders WHERE email = ?", (clean_email,))
        existing = cursor.fetchone()
        if existing:
            if existing["list_type"] == list_type:
                raise ValueError(f"'{clean_email}' is already in your {list_type} list.")
            else:
                # Move to the other list
                cursor.execute("UPDATE senders SET list_type = ?, note = ?, created_at = ? WHERE id = ?",
                               (list_type, note, now_iso, existing["id"]))
                conn.commit()
                return {"id": existing["id"], "email": clean_email, "list_type": list_type, "note": note, "created_at": now_iso, "moved": True}
        
        cursor.execute("""
            INSERT INTO senders (email, list_type, note, created_at)
            VALUES (?, ?, ?, ?)
        """, (clean_email, list_type, note, now_iso))
        conn.commit()
        return {"id": cursor.lastrowid, "email": clean_email, "list_type": list_type, "note": note, "created_at": now_iso}

def delete_sender(sender_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM senders WHERE id = ?", (sender_id,))
        deleted = cursor.rowcount > 0
        conn.commit()
        return deleted

def check_sender_rule(sender_email):
    """Checks if sender matches trusted or blocked list. Supports domain matching (e.g. @company.com)."""
    clean_sender = sender_email.strip().lower()
    domain = "@" + clean_sender.split("@")[-1] if "@" in clean_sender else ""
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT list_type FROM senders WHERE email = ? OR email = ?", (clean_sender, domain))
        row = cursor.fetchone()
        if row:
            return row["list_type"]
    return None

def get_inbox_messages(status_filter=None):
    with get_db() as conn:
        cursor = conn.cursor()
        if status_filter:
            cursor.execute("SELECT * FROM inbox_messages WHERE status = ? ORDER BY id ASC", (status_filter,))
        else:
            cursor.execute("SELECT * FROM inbox_messages ORDER BY id ASC")
        rows = [dict(row) for row in cursor.fetchall()]
        for r in rows:
            if r["warning_signs"]:
                try:
                    r["warning_signs"] = json.loads(r["warning_signs"])
                except Exception:
                    r["warning_signs"] = []
            else:
                r["warning_signs"] = []
        return rows

def get_message_by_id(message_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM inbox_messages WHERE id = ?", (message_id,))
        row = cursor.fetchone()
        if not row:
            return None
        res = dict(row)
        if res["warning_signs"]:
            try:
                res["warning_signs"] = json.loads(res["warning_signs"])
            except Exception:
                res["warning_signs"] = []
        else:
            res["warning_signs"] = []
        return res

def save_scan_result(message_id, verdict, severity_level, model_score, warning_signs, new_status):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE inbox_messages
            SET scan_status = 'scanned',
                verdict = ?,
                severity_level = ?,
                model_score = ?,
                warning_signs = ?,
                status = ?
            WHERE id = ?
        """, (
            verdict,
            severity_level,
            model_score,
            json.dumps(warning_signs),
            new_status,
            message_id
        ))
        
        # If suspicious or phishing, create a threat alert if none exists
        if verdict in ('likely_scam', 'not_sure') or new_status in ('in_review', 'blocked'):
            cursor.execute("SELECT sender, subject FROM inbox_messages WHERE id = ?", (message_id,))
            msg_info = cursor.fetchone()
            if msg_info:
                cursor.execute("""
                    INSERT OR IGNORE INTO threat_alerts (message_id, sender, subject, severity_level, detected_at, is_read, is_dismissed)
                    VALUES (?, ?, ?, ?, ?, 0, 0)
                """, (
                    message_id,
                    msg_info["sender"],
                    msg_info["subject"],
                    severity_level,
                    datetime.utcnow().isoformat()
                ))
                
        conn.commit()

def update_message_status(message_id, new_status):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE inbox_messages SET status = ? WHERE id = ?", (new_status, message_id))
        updated = cursor.rowcount > 0
        conn.commit()
        return updated

def get_threat_alerts(include_dismissed=False):
    with get_db() as conn:
        cursor = conn.cursor()
        query = "SELECT * FROM threat_alerts"
        if not include_dismissed:
            query += " WHERE is_dismissed = 0"
        query += " ORDER BY id DESC"
        cursor.execute(query)
        return [dict(row) for row in cursor.fetchall()]

def mark_alert_read(alert_id, is_read=1):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE threat_alerts SET is_read = ? WHERE id = ?", (1 if is_read else 0, alert_id))
        conn.commit()

def dismiss_alert(alert_id):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("UPDATE threat_alerts SET is_dismissed = 1 WHERE id = ?", (alert_id,))
        conn.commit()

def reset_demo_inbox():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM threat_alerts")
        cursor.execute("DELETE FROM inbox_messages")
        seed_initial_messages(cursor)
        conn.commit()
