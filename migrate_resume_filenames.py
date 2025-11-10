"""
Migration script to fix resume filenames in the database.
Updates filenames to include user_id prefix if they don't already have it.
"""
from app import app, db
from models import ResumeAnalysis

def migrate_resume_filenames():
    """Update resume filenames to include user_id prefix"""
    with app.app_context():
        analyses = ResumeAnalysis.query.all()
        
        updated_count = 0
        for analysis in analyses:
            if analysis.filename:
                # Check if filename already has user_id prefix
                if not analysis.filename.startswith(f"{analysis.user_id}_"):
                    # Add user_id prefix
                    old_filename = analysis.filename
                    new_filename = f"{analysis.user_id}_{analysis.filename}"
                    analysis.filename = new_filename
                    updated_count += 1
                    print(f"Updated: {old_filename} -> {new_filename}")
        
        if updated_count > 0:
            db.session.commit()
            print(f"\n✅ Updated {updated_count} resume filename(s) successfully!")
        else:
            print("\n✅ No resumes needed updating. All filenames are already correct!")

if __name__ == '__main__':
    migrate_resume_filenames()
