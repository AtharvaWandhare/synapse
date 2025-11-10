"""
Migration script to add additional profile fields to users table
Run this script to update the database schema
"""
from app import app, db
from models import User

def migrate():
    with app.app_context():
        # Add new columns to users table
        with db.engine.connect() as conn:
            # Check if columns exist before adding
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN career_objective TEXT"))
                print("✓ Added career_objective column")
            except Exception as e:
                print(f"career_objective column might already exist: {e}")
            
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN projects TEXT"))
                print("✓ Added projects column")
            except Exception as e:
                print(f"projects column might already exist: {e}")
            
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN extracurriculars TEXT"))
                print("✓ Added extracurriculars column")
            except Exception as e:
                print(f"extracurriculars column might already exist: {e}")
            
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN training_courses TEXT"))
                print("✓ Added training_courses column")
            except Exception as e:
                print(f"training_courses column might already exist: {e}")
            
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN portfolio_url VARCHAR(500)"))
                print("✓ Added portfolio_url column")
            except Exception as e:
                print(f"portfolio_url column might already exist: {e}")
            
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN work_samples TEXT"))
                print("✓ Added work_samples column")
            except Exception as e:
                print(f"work_samples column might already exist: {e}")
            
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN accomplishments TEXT"))
                print("✓ Added accomplishments column")
            except Exception as e:
                print(f"accomplishments column might already exist: {e}")
            
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN phone VARCHAR(20)"))
                print("✓ Added phone column")
            except Exception as e:
                print(f"phone column might already exist: {e}")
            
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN location VARCHAR(200)"))
                print("✓ Added location column")
            except Exception as e:
                print(f"location column might already exist: {e}")
            
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN linkedin_url VARCHAR(500)"))
                print("✓ Added linkedin_url column")
            except Exception as e:
                print(f"linkedin_url column might already exist: {e}")
            
            try:
                conn.execute(db.text("ALTER TABLE users ADD COLUMN github_url VARCHAR(500)"))
                print("✓ Added github_url column")
            except Exception as e:
                print(f"github_url column might already exist: {e}")
            
            conn.commit()
        
        print("\n✅ Migration completed successfully!")

if __name__ == '__main__':
    migrate()
