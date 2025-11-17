"""
Check and migrate Match table for missing columns
"""
import sqlite3
import os

# Get database path
db_path = os.path.join('instance', 'database.db')

if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

# Connect to database
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    # Check Match table columns
    cursor.execute("PRAGMA table_info(matches)")
    columns = [column[1] for column in cursor.fetchall()]
    
    print("Current Match table columns:", columns)
    
    # Add application_status if missing
    if 'application_status' not in columns:
        print("Adding application_status column to matches table...")
        cursor.execute("ALTER TABLE matches ADD COLUMN application_status VARCHAR(20) DEFAULT 'pending'")
        conn.commit()
        print("✓ application_status column added!")
    
    # Add is_hidden_by_user if missing
    if 'is_hidden_by_user' not in columns:
        print("Adding is_hidden_by_user column to matches table...")
        cursor.execute("ALTER TABLE matches ADD COLUMN is_hidden_by_user BOOLEAN DEFAULT 0")
        conn.commit()
        print("✓ is_hidden_by_user column added!")
    
    # Add updated_at if missing
    if 'updated_at' not in columns:
        print("Adding updated_at column to matches table...")
        cursor.execute("ALTER TABLE matches ADD COLUMN updated_at DATETIME")
        # Update existing rows to have current timestamp
        cursor.execute("UPDATE matches SET updated_at = created_at WHERE updated_at IS NULL")
        conn.commit()
        print("✓ updated_at column added!")

    # Add match_score if missing
    if 'match_score' not in columns:
        print("Adding match_score column to matches table...")
        cursor.execute("ALTER TABLE matches ADD COLUMN match_score INTEGER")
        conn.commit()
        print("✓ match_score column added!")
    
    # Verify
    cursor.execute("PRAGMA table_info(matches)")
    columns = cursor.fetchall()
    print("\nFinal matches table schema:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
        
except Exception as e:
    print(f"✗ Error: {e}")
    conn.rollback()
finally:
    conn.close()

print("\nMatch table migration complete!")
