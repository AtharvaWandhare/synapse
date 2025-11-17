"""
Migration script to create chat tables (conversations and messages)
Run this script to add the chat feature to the database
"""

from app import app, db
from models import Conversation, Message

def migrate():
    """Create the conversations and messages tables"""
    with app.app_context():
        print("Creating chat tables...")
        
        # Create tables
        db.create_all()
        
        print("✅ Chat tables created successfully!")
        print("   - conversations")
        print("   - messages")

if __name__ == '__main__':
    migrate()
