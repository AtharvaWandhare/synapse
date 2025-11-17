"""
Migration script to add new fields to ResumeAnalysis model
Run this file to update your database schema
"""
from app import app, db
from models import ResumeAnalysis
from sqlalchemy import text

with app.app_context():
    # Add new columns if they don't exist
    with db.engine.connect() as conn:
        # Check and add ats_score column
        try:
            conn.execute(text("ALTER TABLE resume_analyses ADD COLUMN ats_score INTEGER"))
            conn.commit()
            print("✓ Added ats_score column")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("• ats_score column already exists")
            else:
                print(f"Error adding ats_score: {e}")
        
        # Check and add target_job_role column
        try:
            conn.execute(text("ALTER TABLE resume_analyses ADD COLUMN target_job_role VARCHAR(200)"))
            conn.commit()
            print("✓ Added target_job_role column")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("• target_job_role column already exists")
            else:
                print(f"Error adding target_job_role: {e}")
        
        # Check and add enhancement_recommendations column
        try:
            conn.execute(text("ALTER TABLE resume_analyses ADD COLUMN enhancement_recommendations TEXT"))
            conn.commit()
            print("✓ Added enhancement_recommendations column")
        except Exception as e:
            if "duplicate column name" in str(e).lower() or "already exists" in str(e).lower():
                print("• enhancement_recommendations column already exists")
            else:
                print(f"Error adding enhancement_recommendations: {e}")
    
    print("\n✅ Migration completed successfully!")
