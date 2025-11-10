# models.py
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """Job Seeker Model"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    full_name = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # User type identifier
    user_type = db.Column(db.String(20), default='jobseeker')
    
    # Additional profile fields
    career_objective = db.Column(db.Text)
    projects = db.Column(db.Text)  # JSON string storing array of projects
    extracurriculars = db.Column(db.Text)
    training_courses = db.Column(db.Text)  # JSON string storing array of courses
    portfolio_url = db.Column(db.String(500))
    work_samples = db.Column(db.Text)  # JSON string storing array of links
    accomplishments = db.Column(db.Text)
    phone = db.Column(db.String(20))
    location = db.Column(db.String(200))
    linkedin_url = db.Column(db.String(500))
    github_url = db.Column(db.String(500))
    
    # Relationship to the user's resume analysis (one-to-one)
    resume = db.relationship('ResumeAnalysis', backref='user', uselist=False, cascade='all, delete-orphan')
    
    # Relationship to the user's matches (one-to-many)
    matches = db.relationship('Match', backref='user', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<User {self.email}>'


class Company(UserMixin, db.Model):
    """Employer/Company Model"""
    __tablename__ = 'companies'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    company_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    website = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # User type identifier
    user_type = db.Column(db.String(20), default='company')
    
    # Relationship to jobs posted by this company (one-to-many)
    jobs = db.relationship('Job', backref='company', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Company {self.company_name}>'


class ResumeAnalysis(db.Model):
    """Stores resume analysis results for job seekers"""
    __tablename__ = 'resume_analyses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Original resume data
    raw_text = db.Column(db.Text)
    filename = db.Column(db.String(200))
    
    # Extracted information (stored as JSON string)
    extracted_json = db.Column(db.Text)  # Skills, experience, education, etc.
    
    # Analysis results
    analysis_score = db.Column(db.Integer)  # Score out of 100
    improvement_suggestions = db.Column(db.Text)  # Line-separated suggestions
    
    # Profile summary for matching (can be auto-generated or manually edited)
    profile_summary_text = db.Column(db.Text)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<ResumeAnalysis for User {self.user_id}>'


class Job(db.Model):
    """Job postings by companies"""
    __tablename__ = 'jobs'
    
    id = db.Column(db.Integer, primary_key=True)
    company_id = db.Column(db.Integer, db.ForeignKey('companies.id'), nullable=False)
    
    # Job details
    title = db.Column(db.String(200), nullable=False)
    location = db.Column(db.String(100))
    description_text = db.Column(db.Text, nullable=False)
    requirements = db.Column(db.Text)  # Optional: specific requirements
    salary_range = db.Column(db.String(100))  # Optional: e.g., "₹5L-₹8L"
    job_type = db.Column(db.String(50))  # Full-time, Part-time, Internship, etc.
    apply_url = db.Column(db.String(500))
    
    # Metadata
    is_active = db.Column(db.Boolean, default=True)
    applications_closed = db.Column(db.Boolean, default=False)  # NEW: Track if applications are closed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to matches (one-to-many)
    matches = db.relationship('Match', backref='job', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Job {self.title} at {self.company.company_name}>'


class Match(db.Model):
    """Records user swipes on jobs (like/dislike)"""
    __tablename__ = 'matches'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    job_id = db.Column(db.Integer, db.ForeignKey('jobs.id'), nullable=False)
    
    # True for 'like', False for 'dislike'
    is_match = db.Column(db.Boolean, default=False, nullable=False)
    
    # NEW: Application status from company's perspective
    application_status = db.Column(db.String(20), default='pending')  # pending, accepted, rejected
    
    # NEW: Job seeker can hide matched jobs they no longer want to see
    is_hidden_by_user = db.Column(db.Boolean, default=False)
    
    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Unique constraint: a user can only swipe once per job
    __table_args__ = (db.UniqueConstraint('user_id', 'job_id', name='unique_user_job_match'),)
    
    def __repr__(self):
        return f'<Match User:{self.user_id} Job:{self.job_id} Like:{self.is_match} Status:{self.application_status}>'


class CareerRoadmap(db.Model):
    """Stores generated career roadmaps for job seekers"""
    __tablename__ = 'career_roadmaps'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    
    # Target job/career goal
    target_job = db.Column(db.String(200), nullable=False)
    
    # Roadmap data (stored as JSON array of phases)
    roadmap_json = db.Column(db.Text, nullable=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationship to user
    user = db.relationship('User', backref=db.backref('roadmaps', lazy=True, cascade='all, delete-orphan'))
    
    def __repr__(self):
        return f'<CareerRoadmap User:{self.user_id} Target:{self.target_job}>'
