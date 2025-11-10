"""
Migration script to add the career_roadmaps table
Run this script to create the new table for storing career roadmaps
"""
from app import app, db
from models import CareerRoadmap

def migrate():
    with app.app_context():
        print("Creating career_roadmaps table...")
        
        # Create the new table
        db.create_all()
        
        print("✓ Successfully created career_roadmaps table!")
        print("\nYou can now use the Career Roadmap feature!")

if __name__ == '__main__':
    migrate()
