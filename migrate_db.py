"""
Migration script to add applications_closed column to jobs table
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
    # Check if column exists
    cursor.execute("PRAGMA table_info(jobs)")
    columns = [column[1] for column in cursor.fetchall()]
    
    if 'applications_closed' not in columns:
        print("Adding applications_closed column to jobs table...")
        cursor.execute("ALTER TABLE jobs ADD COLUMN applications_closed BOOLEAN DEFAULT 0")
        conn.commit()
        print("✓ Column added successfully!")
    else:
        print("✓ Column applications_closed already exists")
    
    # Verify
    cursor.execute("PRAGMA table_info(jobs)")
    columns = cursor.fetchall()
    print("\nCurrent jobs table schema:")
    for col in columns:
        print(f"  - {col[1]} ({col[2]})")
        
except Exception as e:
    print(f"✗ Error: {e}")
    conn.rollback()
finally:
    conn.close()

print("\nMigration complete!")
