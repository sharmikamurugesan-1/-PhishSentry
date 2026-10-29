import sqlite3
import os
import re
import json
from datetime import datetime, timezone
import google_mail_service

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
                provider TEXT NOT NULL DEFAULT 'none',
                status TEXT NOT NULL DEFAULT 'disconnected',
                email TEXT NOT NULL DEFAULT '',
                access_token TEXT,
                refresh_token TEXT,
                token_expiry TEXT,
                is_demo INTEGER NOT NULL DEFAULT 0,
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
                provider_message_id TEXT UNIQUE,
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
                is_demo INTEGER NOT NULL DEFAULT 0,
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
                is_demo INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (message_id) REFERENCES inbox_messages (id)
            )
        """)

        # Add columns if migrating from previous schema
        try:
            cursor.execute("ALTER TABLE inbox_connection ADD COLUMN access_token TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE inbox_connection ADD COLUMN refresh_token TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE inbox_connection ADD COLUMN token_expiry TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE inbox_messages ADD COLUMN provider_message_id TEXT")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE inbox_messages ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0")
        except Exception:
            pass
        try:
            cursor.execute("ALTER TABLE threat_alerts ADD COLUMN is_demo INTEGER NOT NULL DEFAULT 0")
        except Exception:
            pass

        # Seed initial connection if absent - DEFAULT IS DISCONNECTED (No fake connection)
        cursor.execute("SELECT COUNT(*) FROM inbox_connection WHERE id = 1")
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                INSERT INTO inbox_connection (id, provider, status, email, is_demo, last_synced)
                VALUES (1, 'none', 'disconnected', '', 0, NULL)
            """)
        else:
            # If migrating from old demo-first default, reset to disconnected
            cursor.execute("SELECT email, is_demo FROM inbox_connection WHERE id = 1")
            existing_conn = cursor.fetchone()
            if existing_conn and existing_conn["email"] == "user.protect@phishshift-demo.com":
                cursor.execute("""
                    UPDATE inbox_connection 
                    SET provider = 'none', status = 'disconnected', email = '', is_demo = 0, last_synced = NULL
                    WHERE id = 1
                """)
            
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
            now_iso = datetime.now(timezone.utc).isoformat()
            cursor.executemany("""
                INSERT INTO senders (email, list_type, note, created_at)
                VALUES (?, ?, ?, ?)
            """, [(s[0], s[1], s[2], now_iso) for s in initial_senders])
            
        conn.commit()

def seed_demo_messages(cursor):
    """Seeds sample demo messages only when user explicitly toggles Demo Sandbox mode."""
    sample_emails = [
        {
            "provider_message_id": "demo_msg_001",
            "sender": "account-security@sbi-kyc-update.xyz",
            "recipient": "demo-sandbox@phishshift.com",
            "subject": "URGENT: Your account at State Bank has been suspended! Verify KYC immediately",
            "snippet": "Your account has been restricted due to non-compliance with KYC regulations. Please verify your details...",
            "body": "URGENT NOTIFICATION: Your online banking account at State Bank has been suspended due to overdue KYC verification. To restore access immediately and prevent permanent deactivation, click here: http://sbi-kyc-update.xyz/verify-pan and submit your ATM PIN and password within 24 hours.",
            "received_at": "12 minutes ago",
            "scan_status": "pending",
            "status": "inbox"
        },
        {
            "provider_message_id": "demo_msg_002",
            "sender": "payroll@workplace-portal.io",
            "recipient": "demo-sandbox@phishshift.com",
            "subject": "Action Required: Update your bank account details for upcoming salary deposit",
            "snippet": "We encountered an issue processing your direct deposit. Please re-enter your banking credentials...",
            "body": "Hello, we encountered a payment failure for your monthly direct deposit. You must verify and confirm your net banking login and routing details immediately at http://192.168.1.105/portal/login to receive your payout on time.",
            "received_at": "45 minutes ago",
            "scan_status": "pending",
            "status": "inbox"
        },
        {
            "provider_message_id": "demo_msg_003",
            "sender": "orders@amazon.in",
            "recipient": "demo-sandbox@phishshift.com",
            "subject": "Shipped: Your order #402-8827391 has been dispatched",
            "snippet": "Great news! Your package is on its way with Amazon Logistics. Track your delivery anytime...",
            "body": "Hi there, your order with Amazon has been dispatched. Track your delivery package using your Amazon app or visit https://www.amazon.in/your-orders for the latest updates. Thank you for shopping with us.",
            "received_at": "2 hours ago",
            "scan_status": "pending",
            "status": "inbox"
        },
        {
            "provider_message_id": "demo_msg_004",
            "sender": "security-alert@microsoft-support.co",
            "recipient": "demo-sandbox@phishshift.com",
            "subject": "Password Expiry Notice: Your work email access will expire in 2 hours",
            "snippet": "Your password is set to expire today. Keep your current password by clicking the verification link...",
            "body": "Microsoft Support Alert: Your account password will expire today. Keep your existing password by confirming your login details immediately at http://microsoft-support.co.win/keep-password before disconnection.",
            "received_at": "3 hours ago",
            "scan_status": "pending",
            "status": "inbox"
        },
        {
            "provider_message_id": "demo_msg_005",
            "sender": "team@linear.app",
            "recipient": "demo-sandbox@phishshift.com",
            "subject": "Engineering Sprint #42: Weekly summary & roadmap discussion",
            "snippet": "Here is the summary of closed issues and upcoming release goals for the mobile team...",
            "body": "Hi Team, Sprint #42 is now wrapped up. We closed 24 tickets including latency optimizations and dark mode fixes. View the full sprint board on Linear or catch up during Monday standup.",
            "received_at": "5 hours ago",
            "scan_status": "pending",
            "status": "inbox"
        }
    ]
    
    now_iso = datetime.now(timezone.utc).isoformat()
    for email in sample_emails:
        cursor.execute("""
            INSERT OR IGNORE INTO inbox_messages (
                provider_message_id, sender, recipient, subject, snippet, body, 
                received_at, scan_status, status, is_demo, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
        """, (
            email["provider_message_id"], email["sender"], email["recipient"], 
            email["subject"], email["snippet"], email["body"], email["received_at"],
            email["scan_status"], email["status"], now_iso
        ))

def get_connection_info():
    """Returns safe connection status for frontend display (tokens are NEVER exposed)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT provider, status, email, is_demo, last_synced 
            FROM inbox_connection 
            WHERE id = 1
        """)
        row = cursor.fetchone()
        
        has_oauth = google_mail_service.is_google_oauth_configured()
        client_id = google_mail_service.get_google_client_id()
        
        if not row:
            return {
                "provider": "none",
                "status": "disconnected",
                "email": "",
                "is_demo": 0,
                "last_synced": None,
                "has_oauth_configured": has_oauth,
                "google_client_id": client_id
            }
            
        data = dict(row)
        data["has_oauth_configured"] = has_oauth
        data["google_client_id"] = client_id
        return data

def get_stored_tokens():
    """Backend internal only: retrieves stored OAuth tokens."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT provider, access_token, refresh_token, token_expiry, email, is_demo 
            FROM inbox_connection 
            WHERE id = 1
        """)
        row = cursor.fetchone()
        return dict(row) if row else None

def set_real_account_connected(provider, email, access_token, refresh_token, expires_in=3600):
    """Saves verified OAuth authorization from Google/Microsoft."""
    now_utc = datetime.now(timezone.utc)
    now_iso = now_utc.isoformat()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE inbox_connection
            SET provider = ?,
                status = 'connected',
                email = ?,
                access_token = ?,
                refresh_token = COALESCE(?, refresh_token),
                token_expiry = ?,
                is_demo = 0,
                last_synced = ?
            WHERE id = 1
        """, (provider, email, access_token, refresh_token, now_iso, now_iso))
        
        # Clear any prior demo messages so user only sees their real mailbox
        cursor.execute("DELETE FROM inbox_messages WHERE is_demo = 1")
        cursor.execute("DELETE FROM threat_alerts WHERE is_demo = 1")
        conn.commit()
    return get_connection_info()

def update_access_token(access_token, expires_in=3600):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE inbox_connection
            SET access_token = ?
            WHERE id = 1
        """, (access_token,))
        conn.commit()

def disconnect_inbox():
    """Revokes and disconnects active account."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE inbox_connection
            SET provider = 'none',
                status = 'disconnected',
                email = '',
                access_token = NULL,
                refresh_token = NULL,
                token_expiry = NULL,
                is_demo = 0,
                last_synced = NULL
            WHERE id = 1
        """)
        # Remove emails and alerts from disconnected account
        cursor.execute("DELETE FROM inbox_messages")
        cursor.execute("DELETE FROM threat_alerts")
        conn.commit()
    return get_connection_info()

def enable_demo_mode():
    """Activates Demo Mode explicitly for sandbox testing."""
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE inbox_connection
            SET provider = 'demo',
                status = 'connected',
                email = 'demo-sandbox@phishshift.com',
                access_token = NULL,
                refresh_token = NULL,
                token_expiry = NULL,
                is_demo = 1,
                last_synced = ?
            WHERE id = 1
        """, (now_iso,))
        
        # Seed demo messages if none exist
        cursor.execute("SELECT COUNT(*) FROM inbox_messages WHERE is_demo = 1")
        if cursor.fetchone()[0] == 0:
            seed_demo_messages(cursor)
            
        conn.commit()
    return get_connection_info()

def save_real_email_batch(emails):
    """
    Saves a batch of emails retrieved from Gmail API.
    Prevents duplicates by checking provider_message_id.
    """
    saved_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    
    with get_db() as conn:
        cursor = conn.cursor()
        for em in emails:
            msg_id = em["provider_message_id"]
            cursor.execute("SELECT id FROM inbox_messages WHERE provider_message_id = ?", (msg_id,))
            exists = cursor.fetchone()
            if not exists:
                cursor.execute("""
                    INSERT INTO inbox_messages (
                        provider_message_id, sender, recipient, subject, snippet, body, 
                        received_at, scan_status, status, is_demo, created_at
                    )
                    VALUES (?, ?, 'me', ?, ?, ?, ?, 'pending', 'inbox', 0, ?)
                """, (
                    msg_id,
                    em["sender"],
                    em["subject"],
                    em["snippet"],
                    em["body"],
                    em["date"],
                    now_iso
                ))
                saved_count += 1
        conn.commit()
    return saved_count

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
        
    now_iso = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, list_type FROM senders WHERE email = ?", (clean_email,))
        existing = cursor.fetchone()
        if existing:
            if existing["list_type"] == list_type:
                raise ValueError(f"'{clean_email}' is already in your {list_type} list.")
            else:
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
        # Find current connection mode
        cursor.execute("SELECT is_demo FROM inbox_connection WHERE id = 1")
        conn_row = cursor.fetchone()
        current_is_demo = conn_row["is_demo"] if conn_row else 0
        
        if status_filter and status_filter != 'all':
            cursor.execute("SELECT * FROM inbox_messages WHERE is_demo = ? AND status = ? ORDER BY id DESC", (current_is_demo, status_filter))
        else:
            cursor.execute("SELECT * FROM inbox_messages WHERE is_demo = ? ORDER BY id DESC", (current_is_demo,))
            
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

def save_scan_result(message_id, verdict, severity_level, model_score, warning_signs, new_status, is_demo=0):
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
            cursor.execute("SELECT sender, subject, is_demo FROM inbox_messages WHERE id = ?", (message_id,))
            msg_info = cursor.fetchone()
            if msg_info:
                cursor.execute("""
                    INSERT OR IGNORE INTO threat_alerts (message_id, sender, subject, severity_level, detected_at, is_read, is_dismissed, is_demo)
                    VALUES (?, ?, ?, ?, ?, 0, 0, ?)
                """, (
                    message_id,
                    msg_info["sender"],
                    msg_info["subject"],
                    severity_level,
                    datetime.now(timezone.utc).isoformat(),
                    msg_info["is_demo"]
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
        cursor.execute("SELECT is_demo FROM inbox_connection WHERE id = 1")
        conn_row = cursor.fetchone()
        current_is_demo = conn_row["is_demo"] if conn_row else 0

        query = "SELECT * FROM threat_alerts WHERE is_demo = ?"
        if not include_dismissed:
            query += " AND is_dismissed = 0"
        query += " ORDER BY id DESC"
        cursor.execute(query, (current_is_demo,))
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
        cursor.execute("DELETE FROM threat_alerts WHERE is_demo = 1")
        cursor.execute("DELETE FROM inbox_messages WHERE is_demo = 1")
        seed_demo_messages(cursor)
        conn.commit()
