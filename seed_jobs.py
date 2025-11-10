# seed_jobs.py - Database Seeding Script
"""
Run this script to populate the database with sample companies and jobs.
Usage: python seed_jobs.py
"""

from app import app, db, bcrypt
from models import User, Company, Job, ResumeAnalysis, Match
from datetime import datetime

# Sample Companies
sample_companies = [
    {
        'email': 'hr@techcorp.com',
        'password': 'company123',
        'company_name': 'Tech Corp India',
        'description': 'Leading technology company specializing in software development and cloud solutions.',
        'website': 'https://techcorp.example.com'
    },
    {
        'email': 'careers@innovate.com',
        'password': 'company123',
        'company_name': 'Innovate Solutions',
        'description': 'A fast-growing startup focused on AI and machine learning solutions.',
        'website': 'https://innovate.example.com'
    },
    {
        'email': 'jobs@datainsights.com',
        'password': 'company123',
        'company_name': 'DataInsights Analytics',
        'description': 'Data analytics firm helping businesses make data-driven decisions.',
        'website': 'https://datainsights.example.com'
    }
]

# Sample Jobs (will be linked to companies after creation)
sample_jobs = [
    {
        'company_index': 0,  # Tech Corp
        'title': 'Full Stack Developer',
        'location': 'Pune, Maharashtra',
        'job_type': 'Full-time',
        'salary_range': '₹8L-₹12L per year',
        'description_text': '''We are looking for a talented Full Stack Developer to join our team. 
        
You will work on building scalable web applications using modern technologies. The ideal candidate should have experience with Python/Flask or Node.js for backend, and React or Vue.js for frontend.

Responsibilities:
- Develop and maintain web applications
- Write clean, maintainable code
- Collaborate with cross-functional teams
- Participate in code reviews

Requirements:
- 2+ years of experience in web development
- Strong knowledge of Python, JavaScript
- Experience with databases (SQL, MongoDB)
- Good problem-solving skills''',
        'requirements': 'Python, JavaScript, Flask, React, SQL, 2+ years experience',
        'apply_url': 'https://techcorp.example.com/careers/fullstack'
    },
    {
        'company_index': 0,  # Tech Corp
        'title': 'Software Engineer Intern',
        'location': 'Pune, Maharashtra',
        'job_type': 'Internship',
        'salary_range': '₹25k-₹30k per month',
        'description_text': '''Great opportunity for students and recent graduates to kick-start their career in software development!

As an intern, you will:
- Work on real-world projects
- Learn from experienced developers
- Gain hands-on experience with modern tech stack
- Potential for full-time conversion

What we're looking for:
- Currently pursuing or recently completed CS/IT degree
- Basic knowledge of programming (Python/Java/JavaScript)
- Eager to learn and grow
- Good communication skills''',
        'requirements': 'CS/IT student or graduate, Basic programming knowledge',
        'apply_url': 'https://techcorp.example.com/careers/intern'
    },
    {
        'company_index': 1,  # Innovate Solutions
        'title': 'Machine Learning Engineer',
        'location': 'Bangalore, Karnataka',
        'job_type': 'Full-time',
        'salary_range': '₹15L-₹25L per year',
        'description_text': '''Join our AI team to build cutting-edge machine learning solutions!

We're seeking an experienced ML Engineer to develop and deploy ML models that solve real business problems.

Key Responsibilities:
- Design and implement ML models
- Optimize model performance
- Deploy models to production
- Stay updated with latest ML research

Ideal Candidate:
- Strong background in ML/DL
- Experience with TensorFlow/PyTorch
- Python expertise
- Understanding of MLOps practices''',
        'requirements': 'ML/DL expertise, Python, TensorFlow/PyTorch, 3+ years experience',
        'apply_url': 'https://innovate.example.com/careers/ml-engineer'
    },
    {
        'company_index': 1,  # Innovate Solutions
        'title': 'Frontend Developer',
        'location': 'Remote',
        'job_type': 'Remote',
        'salary_range': '₹10L-₹18L per year',
        'description_text': '''Work from anywhere! We're looking for a skilled Frontend Developer to create beautiful, responsive user interfaces.

What you'll do:
- Build modern web applications
- Implement pixel-perfect designs
- Optimize for performance
- Collaborate with designers and backend team

Requirements:
- 3+ years frontend experience
- Expert in React.js
- Strong CSS/HTML skills
- Experience with state management (Redux/Context API)
- Understanding of web performance optimization''',
        'requirements': 'React.js, JavaScript, HTML/CSS, 3+ years experience',
        'apply_url': 'https://innovate.example.com/careers/frontend'
    },
    {
        'company_index': 2,  # DataInsights
        'title': 'Data Analyst',
        'location': 'Mumbai, Maharashtra',
        'job_type': 'Full-time',
        'salary_range': '₹6L-₹10L per year',
        'description_text': '''Be part of a team that transforms data into actionable insights!

As a Data Analyst, you will:
- Analyze large datasets
- Create insightful reports and dashboards
- Work with stakeholders to understand requirements
- Present findings to management

Skills needed:
- SQL expertise
- Python for data analysis (Pandas, NumPy)
- Data visualization (Tableau/Power BI)
- Statistical analysis
- Strong communication skills''',
        'requirements': 'SQL, Python, Pandas, Tableau/Power BI, 2+ years experience',
        'apply_url': 'https://datainsights.example.com/careers/analyst'
    },
    {
        'company_index': 2,  # DataInsights
        'title': 'Data Science Intern',
        'location': 'Mumbai, Maharashtra',
        'job_type': 'Internship',
        'salary_range': '₹20k-₹25k per month',
        'description_text': '''Learn data science by doing! Perfect for students eager to enter the field.

What you'll learn:
- Data cleaning and preprocessing
- Exploratory data analysis
- Building predictive models
- Creating visualizations
- Working with real business data

Requirements:
- Currently pursuing degree in relevant field
- Basic Python knowledge
- Understanding of statistics
- Familiarity with ML concepts (preferred)
- Analytical mindset''',
        'requirements': 'Python basics, Statistics knowledge, Student in relevant field',
        'apply_url': 'https://datainsights.example.com/careers/intern'
    },
    {
        'company_index': 0,  # Tech Corp
        'title': 'DevOps Engineer',
        'location': 'Pune, Maharashtra',
        'job_type': 'Full-time',
        'salary_range': '₹12L-₹20L per year',
        'description_text': '''Help us build and maintain robust infrastructure!

Responsibilities:
- Manage cloud infrastructure (AWS/Azure)
- Implement CI/CD pipelines
- Monitor system performance
- Automate deployment processes
- Ensure security best practices

Must have:
- Experience with Docker, Kubernetes
- Knowledge of cloud platforms (AWS/Azure)
- Scripting skills (Python/Bash)
- Understanding of networking and security
- Problem-solving mindset''',
        'requirements': 'DevOps, Docker, Kubernetes, AWS/Azure, CI/CD, 3+ years experience',
        'apply_url': 'https://techcorp.example.com/careers/devops'
    },
    {
        'company_index': 1,  # Innovate Solutions
        'title': 'Product Manager',
        'location': 'Bangalore, Karnataka',
        'job_type': 'Full-time',
        'salary_range': '₹18L-₹30L per year',
        'description_text': '''Lead product development for our AI-powered solutions!

As a Product Manager, you will:
- Define product vision and strategy
- Work with engineering, design, and sales teams
- Gather and prioritize requirements
- Make data-driven decisions
- Launch new features and products

Ideal candidate:
- 4+ years in product management
- Technical background (preferred)
- Strong analytical skills
- Excellent communication
- Experience with AI/ML products (plus)''',
        'requirements': 'Product Management, Technical background, Analytics, 4+ years experience',
        'apply_url': 'https://innovate.example.com/careers/pm'
    }
]

# Sample Job Seekers
sample_users = [
    {
        'email': 'john.doe@example.com',
        'password': 'user123',
        'full_name': 'John Doe'
    },
    {
        'email': 'jane.smith@example.com',
        'password': 'user123',
        'full_name': 'Jane Smith'
    }
]


def seed_database():
    """Populate database with sample data"""
    with app.app_context():
        print("🌱 Starting database seeding...")
        
        # Clear existing data (optional - comment out if you want to keep existing data)
        print("Clearing existing data...")
        Match.query.delete()
        Job.query.delete()
        ResumeAnalysis.query.delete()
        Company.query.delete()
        User.query.delete()
        db.session.commit()
        print("✓ Cleared existing data")
        
        # Create companies
        print("\n📊 Creating companies...")
        companies = []
        for company_data in sample_companies:
            hashed_password = bcrypt.generate_password_hash(company_data['password']).decode('utf-8')
            company = Company(
                email=company_data['email'],
                password_hash=hashed_password,
                company_name=company_data['company_name'],
                description=company_data['description'],
                website=company_data['website'],
                user_type='company'
            )
            db.session.add(company)
            companies.append(company)
            print(f"  + {company_data['company_name']}")
        
        db.session.commit()
        print(f"✓ Created {len(companies)} companies")
        
        # Create jobs
        print("\n💼 Creating jobs...")
        for job_data in sample_jobs:
            company = companies[job_data['company_index']]
            job = Job(
                company_id=company.id,
                title=job_data['title'],
                location=job_data['location'],
                job_type=job_data['job_type'],
                salary_range=job_data.get('salary_range'),
                description_text=job_data['description_text'],
                requirements=job_data.get('requirements'),
                apply_url=job_data.get('apply_url'),
                is_active=True
            )
            db.session.add(job)
            print(f"  + {job_data['title']} at {company.company_name}")
        
        db.session.commit()
        print(f"✓ Created {len(sample_jobs)} jobs")
        
        # Create sample users
        print("\n👥 Creating sample job seekers...")
        for user_data in sample_users:
            hashed_password = bcrypt.generate_password_hash(user_data['password']).decode('utf-8')
            user = User(
                email=user_data['email'],
                password_hash=hashed_password,
                full_name=user_data['full_name'],
                user_type='jobseeker'
            )
            db.session.add(user)
            print(f"  + {user_data['full_name']} ({user_data['email']})")
        
        db.session.commit()
        print(f"✓ Created {len(sample_users)} job seekers")
        
        print("\n" + "="*60)
        print("✨ Database seeded successfully!")
        print("="*60)
        print("\n📝 Login Credentials:")
        print("\nCompanies:")
        for company_data in sample_companies:
            print(f"  Email: {company_data['email']}")
            print(f"  Password: {company_data['password']}")
            print()
        
        print("Job Seekers:")
        for user_data in sample_users:
            print(f"  Email: {user_data['email']}")
            print(f"  Password: {user_data['password']}")
            print()
        
        print("="*60)


if __name__ == '__main__':
    seed_database()
