"""
Migration script to add latex_resumes table
"""
import sqlite3
import os

# Path to database
DB_PATH = os.path.join(os.path.dirname(__file__), 'instance', 'database.db')

def get_table_columns(cursor, table_name):
    """Get list of column names for a table"""
    cursor.execute(f"PRAGMA table_info({table_name})")
    return [row[1] for row in cursor.fetchall()]

def migrate():
    """Add latex_resumes table if it doesn't exist"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        # Check if latex_resumes table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='latex_resumes'")
        table_exists = cursor.fetchone() is not None
        
        if table_exists:
            print("✓ latex_resumes table already exists")
            columns = get_table_columns(cursor, 'latex_resumes')
            print(f"Current columns: {columns}")
        else:
            print("Creating latex_resumes table...")
            cursor.execute('''
                CREATE TABLE latex_resumes (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    latex_code TEXT NOT NULL,
                    compiled_pdf_url VARCHAR(500),
                    template_name VARCHAR(50) DEFAULT 'default',
                    is_active BOOLEAN DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            ''')
            conn.commit()
            print("✓ latex_resumes table created successfully!")
            
            # Verify table creation
            columns = get_table_columns(cursor, 'latex_resumes')
            print(f"\nTable schema:")
            for col in columns:
                print(f"  - {col}")
        
        print("\nMigration complete!")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate()
