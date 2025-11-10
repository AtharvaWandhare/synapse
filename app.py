# app.py
import os
import json
from datetime import datetime
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, send_from_directory, abort
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
from werkzeug.utils import secure_filename

# Import database models
from models import db, User, Company, ResumeAnalysis, Job, Match, CareerRoadmap

# Import resume analyzer core logic
from core_logic.extractor import extract_text_from_pdf
from core_logic.analyzer import extract_resume_data
from core_logic.improver import get_resume_feedback, get_career_roadmap

# --- APP CONFIGURATION ---
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize extensions
db.init_app(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'
login_manager.login_message_category = 'info'

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


# --- CUSTOM JINJA FILTERS ---
@app.template_filter('load_json')
def load_json_filter(json_string):
    """Convert JSON string to Python dict"""
    try:
        if isinstance(json_string, str):
            return json.loads(json_string)
        return json_string
    except (json.JSONDecodeError, TypeError):
        return {}


# --- USER LOADER ---
@login_manager.user_loader
def load_user(user_id):
    """Load user by ID. Check both User and Company tables."""
    # Check if it's in session
    user_type = session.get('user_type')
    if user_type == 'company':
        return Company.query.get(int(user_id))
    else:
        return User.query.get(int(user_id))


# --- CUSTOM DECORATORS ---
def jobseeker_required(f):
    """Decorator to ensure user is a job seeker"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))
        if current_user.user_type != 'jobseeker':
            flash('This page is only accessible to job seekers.', 'danger')
            return redirect(url_for('company_dashboard'))
        return f(*args, **kwargs)
    return decorated_function


def company_required(f):
    """Decorator to ensure user is a company"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            flash('Please log in to access this page.', 'warning')
            return redirect(url_for('login'))
        if current_user.user_type != 'company':
            flash('This page is only accessible to companies.', 'danger')
            return redirect(url_for('discover'))
        return f(*args, **kwargs)
    return decorated_function


# --- AUTHENTICATION ROUTES ---

@app.route('/')
def index():
    """Landing page - show home page or redirect if logged in"""
    if current_user.is_authenticated:
        if current_user.user_type == 'company':
            return redirect(url_for('company_dashboard'))
        else:
            return redirect(url_for('discover'))
    return render_template('home.html')


@app.route('/login', methods=['GET', 'POST'])
def login():
    """Unified login for both job seekers and companies"""
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        # Check User table first
        user = User.query.filter_by(email=email).first()
        if user and bcrypt.check_password_hash(user.password_hash, password):
            login_user(user)
            session['user_type'] = 'jobseeker'
            flash(f'Welcome back, {user.full_name}!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('discover'))
        
        # Check Company table
        company = Company.query.filter_by(email=email).first()
        if company and bcrypt.check_password_hash(company.password_hash, password):
            login_user(company)
            session['user_type'] = 'company'
            flash(f'Welcome back, {company.company_name}!', 'success')
            next_page = request.args.get('next')
            return redirect(next_page) if next_page else redirect(url_for('company_dashboard'))
        
        flash('Invalid email or password. Please try again.', 'danger')
    
    return render_template('login.html')


@app.route('/register-jobseeker', methods=['GET', 'POST'])
def register_jobseeker():
    """Registration for job seekers"""
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        full_name = request.form.get('full_name')
        
        # Check if email already exists
        if User.query.filter_by(email=email).first() or Company.query.filter_by(email=email).first():
            flash('Email already registered. Please use a different email or log in.', 'danger')
            return redirect(url_for('register_jobseeker'))
        
        # Create new user
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_user = User(
            email=email,
            password_hash=hashed_password,
            full_name=full_name,
            user_type='jobseeker'
        )
        
        db.session.add(new_user)
        db.session.commit()
        
        flash('Account created successfully! Please log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register_jobseeker.html')


@app.route('/register-company', methods=['GET', 'POST'])
def register_company():
    """Registration for companies"""
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        company_name = request.form.get('company_name')
        description = request.form.get('description', '')
        website = request.form.get('website', '')
        
        # Check if email already exists
        if User.query.filter_by(email=email).first() or Company.query.filter_by(email=email).first():
            flash('Email already registered. Please use a different email or log in.', 'danger')
            return redirect(url_for('register_company'))
        
        # Create new company
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        new_company = Company(
            email=email,
            password_hash=hashed_password,
            company_name=company_name,
            description=description,
            website=website,
            user_type='company'
        )
        
        db.session.add(new_company)
        db.session.commit()
        
        flash('Company account created successfully! Please log in.', 'success')
        return redirect(url_for('login'))
    
    return render_template('register_company.html')


@app.route('/logout')
@login_required
def logout():
    """Logout for both user types"""
    session.pop('user_type', None)
    logout_user()
    flash('You have been logged out successfully.', 'info')
    return redirect(url_for('login'))


# --- JOB SEEKER ROUTES ---

@app.route('/discover')
@jobseeker_required
def discover():
    """Main job discovery page with Tinder-style swiping"""
    return render_template('discover.html')


@app.route('/profile', methods=['GET', 'POST'])
@jobseeker_required
def profile():
    """Job seeker profile with resume upload and analysis"""
    if request.method == 'POST':
        # Handle resume file upload
        if 'resume_file' in request.files:
            file = request.files['resume_file']
            if file and file.filename != '' and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                full_filename = f"{current_user.id}_{filename}"
                filepath = os.path.join(app.config['UPLOAD_FOLDER'], full_filename)
                file.save(filepath)
                
                try:
                    # Extract text from the PDF
                    raw_text = extract_text_from_pdf(filepath)
                    
                    if not raw_text:
                        flash('Could not extract text from the PDF. Please try a different file.', 'error')
                        return redirect(url_for('profile'))
                    
                    # Analyze the resume (extract structured data)
                    analysis_result = extract_resume_data(raw_text)
                    
                    if not analysis_result:
                        flash('Could not analyze the resume. Please ensure your GOOGLE_API_KEY is set in .env', 'error')
                        return redirect(url_for('profile'))
                    
                    # Get improvement suggestions (optional - requires job profile)
                    # For now, we'll skip this and just store the extracted data
                    # suggestions = get_resume_feedback(analysis_result, "Software Engineer")
                    
                    # Get or create resume analysis record
                    resume_analysis = ResumeAnalysis.query.filter_by(user_id=current_user.id).first()
                    if not resume_analysis:
                        resume_analysis = ResumeAnalysis(user_id=current_user.id)
                    
                    # Update analysis data
                    resume_analysis.raw_text = raw_text
                    resume_analysis.filename = full_filename  # Store full filename with user_id prefix
                    resume_analysis.extracted_json = json.dumps(analysis_result)
                    
                    # Auto-generate profile summary from extracted data
                    skills = analysis_result.get('skills', [])
                    work_exp = analysis_result.get('work_experience', [])
                    personal = analysis_result.get('personal_details', {})
                    
                    profile_summary = ""
                    if personal:
                        profile_summary += f"{personal.get('name', 'Professional')}\n"
                    if skills:
                        skill_list = skills if isinstance(skills, list) else [skills]
                        profile_summary += f"Skills: {', '.join(skill_list[:8])}\n"
                    if work_exp:
                        exp_count = len(work_exp) if isinstance(work_exp, list) else 1
                        profile_summary += f"Experience: {exp_count} position(s)\n"
                    
                    resume_analysis.profile_summary_text = profile_summary.strip()
                    
                    # Calculate a comprehensive resume score (0-100)
                    score = 0
                    
                    # Extract all relevant data from analysis_result
                    education = analysis_result.get('education', [])
                    certifications = analysis_result.get('certifications', [])
                    projects = analysis_result.get('projects', [])
                    
                    # Skills (max 30 points)
                    skill_count = len(skills) if isinstance(skills, list) else (1 if skills else 0)
                    score += min(30, skill_count * 3)  # 3 points per skill, max 10 skills
                    
                    # Work Experience (max 25 points)
                    exp_count = len(work_exp) if isinstance(work_exp, list) else (1 if work_exp else 0)
                    score += min(25, exp_count * 8)  # 8 points per experience, max ~3 experiences
                    
                    # Education (max 20 points)
                    edu_count = len(education) if isinstance(education, list) else (1 if education else 0)
                    score += min(20, edu_count * 10)  # 10 points per education, max 2 degrees
                    
                    # Certifications (max 15 points)
                    cert_count = len(certifications) if isinstance(certifications, list) else (1 if certifications else 0)
                    score += min(15, cert_count * 5)  # 5 points per cert, max 3 certs
                    
                    # Projects (max 10 points)
                    project_count = len(projects) if isinstance(projects, list) else (1 if projects else 0)
                    score += min(10, project_count * 5)  # 5 points per project, max 2 projects
                    
                    resume_analysis.analysis_score = min(100, score)
                    
                    db.session.add(resume_analysis)
                    db.session.commit()
                    
                    flash('Resume uploaded and analyzed successfully!', 'success')
                except Exception as e:
                    flash(f'Error analyzing resume: {str(e)}', 'danger')
            else:
                flash('Invalid file format. Please upload a PDF, DOC, DOCX, or TXT file.', 'warning')
        
        # Handle profile summary update
        elif 'profile_summary' in request.form:
            resume_analysis = ResumeAnalysis.query.filter_by(user_id=current_user.id).first()
            if resume_analysis:
                resume_analysis.profile_summary_text = request.form['profile_summary']
                db.session.commit()
                flash('Profile summary updated!', 'success')
            else:
                flash('Please upload a resume first.', 'warning')
        
        # Handle additional profile fields update
        elif 'update_profile' in request.form:
            current_user.career_objective = request.form.get('career_objective', '')
            current_user.extracurriculars = request.form.get('extracurriculars', '')
            current_user.accomplishments = request.form.get('accomplishments', '')
            current_user.phone = request.form.get('phone', '')
            current_user.location = request.form.get('location', '')
            current_user.portfolio_url = request.form.get('portfolio_url', '')
            current_user.linkedin_url = request.form.get('linkedin_url', '')
            current_user.github_url = request.form.get('github_url', '')
            
            # Handle projects (JSON)
            projects_data = []
            project_count = int(request.form.get('project_count', 0))
            for i in range(project_count):
                project = {
                    'title': request.form.get(f'project_title_{i}', ''),
                    'description': request.form.get(f'project_desc_{i}', ''),
                    'link': request.form.get(f'project_link_{i}', '')
                }
                if project['title']:
                    projects_data.append(project)
            current_user.projects = json.dumps(projects_data) if projects_data else None
            
            # Handle training/courses (JSON)
            courses_data = []
            course_count = int(request.form.get('course_count', 0))
            for i in range(course_count):
                course = {
                    'name': request.form.get(f'course_name_{i}', ''),
                    'issuer': request.form.get(f'course_issuer_{i}', ''),
                    'date': request.form.get(f'course_date_{i}', '')
                }
                if course['name']:
                    courses_data.append(course)
            current_user.training_courses = json.dumps(courses_data) if courses_data else None
            
            # Handle work samples (JSON)
            samples_data = []
            sample_count = int(request.form.get('sample_count', 0))
            for i in range(sample_count):
                sample = {
                    'title': request.form.get(f'sample_title_{i}', ''),
                    'link': request.form.get(f'sample_link_{i}', '')
                }
                if sample['title'] and sample['link']:
                    samples_data.append(sample)
            current_user.work_samples = json.dumps(samples_data) if samples_data else None
            
            db.session.commit()
            flash('Profile updated successfully!', 'success')
        
        return redirect(url_for('profile'))
    
    # GET request: Load user's profile data
    analysis = ResumeAnalysis.query.filter_by(user_id=current_user.id).first()
    return render_template('profile.html', analysis=analysis)


@app.route('/download-resume/<filename>')
@login_required
def download_resume(filename):
    """Download a resume file"""
    # Security: Only allow downloading your own resume or if you're a company viewing a candidate
    if current_user.user_type == 'jobseeker':
        # Job seekers can only download their own resume
        analysis = ResumeAnalysis.query.filter_by(user_id=current_user.id).first()
        if not analysis or analysis.filename != filename:
            abort(403)
    elif current_user.user_type == 'company':
        # Companies can download resumes of candidates who applied to their jobs
        # Extract user_id from filename (format: {user_id}_{original_filename})
        try:
            user_id = int(filename.split('_')[0])
            # Check if this user applied to any of the company's jobs
            job_ids = [job.id for job in current_user.jobs]
            match = Match.query.filter(
                Match.user_id == user_id,
                Match.job_id.in_(job_ids),
                Match.is_match == True
            ).first()
            if not match:
                abort(403)
        except (ValueError, IndexError):
            abort(404)
    
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)


@app.route('/matches')
@jobseeker_required
def matches():
    """Show all jobs based on filter: all (liked), skipped, or hidden"""
    # Get filter parameter (default: 'all' = liked jobs)
    filter_type = request.args.get('filter', 'all')
    
    if filter_type == 'skipped':
        # Show skipped/disliked jobs
        matches_query = Match.query.filter_by(
            user_id=current_user.id, 
            is_match=False
        ).all()
        
        jobs_list = []
        for match in matches_query:
            jobs_list.append({
                'match': match,
                'job': match.job,
                'status': match.application_status
            })
        
    elif filter_type == 'hidden':
        # Show hidden jobs
        matches_query = Match.query.filter_by(
            user_id=current_user.id,
            is_match=True,
            is_hidden_by_user=True
        ).all()
        
        jobs_list = []
        for match in matches_query:
            jobs_list.append({
                'match': match,
                'job': match.job,
                'status': match.application_status
            })
            
    else:  # filter_type == 'all' or anything else
        # Show liked jobs (not hidden) - default
        matches_query = Match.query.filter_by(
            user_id=current_user.id, 
            is_match=True,
            is_hidden_by_user=False
        ).all()
        
        jobs_list = []
        for match in matches_query:
            jobs_list.append({
                'match': match,
                'job': match.job,
                'status': match.application_status
            })
    
    return render_template('matches.html', matches_with_jobs=jobs_list, current_filter=filter_type)



# --- COMPANY ROUTES ---

@app.route('/company/dashboard')
@company_required
def company_dashboard():
    """Company dashboard with stats"""
    total_jobs = Job.query.filter_by(company_id=current_user.id).count()
    
    # Count total applicants (users who liked any of this company's jobs)
    job_ids = [job.id for job in current_user.jobs]
    total_applicants = Match.query.filter(
        Match.job_id.in_(job_ids),
        Match.is_match == True
    ).count() if job_ids else 0
    
    # Get recent matches
    recent_matches = Match.query.filter(
        Match.job_id.in_(job_ids),
        Match.is_match == True
    ).order_by(Match.created_at.desc()).limit(5).all() if job_ids else []
    
    return render_template('company/dashboard.html',
                         total_jobs=total_jobs,
                         total_applicants=total_applicants,
                         recent_matches=recent_matches)


@app.route('/company/post-job', methods=['GET', 'POST'])
@company_required
def post_job():
    """Post a new job"""
    if request.method == 'POST':
        title = request.form.get('title')
        location = request.form.get('location')
        description = request.form.get('description')
        requirements = request.form.get('requirements', '')
        salary_range = request.form.get('salary_range', '')
        job_type = request.form.get('job_type', 'Full-time')
        apply_url = request.form.get('apply_url', '')
        
        new_job = Job(
            company_id=current_user.id,
            title=title,
            location=location,
            description_text=description,
            requirements=requirements,
            salary_range=salary_range,
            job_type=job_type,
            apply_url=apply_url
        )
        
        db.session.add(new_job)
        db.session.commit()
        
        flash(f'Job "{title}" posted successfully!', 'success')
        return redirect(url_for('my_jobs'))
    
    return render_template('company/post_job.html')


@app.route('/company/my-jobs')
@company_required
def my_jobs():
    """List all jobs posted by this company"""
    jobs = Job.query.filter_by(company_id=current_user.id).order_by(Job.created_at.desc()).all()
    return render_template('company/my_jobs.html', jobs=jobs)


@app.route('/company/applicants')
@company_required
def applicants():
    """Show all users who liked this company's jobs (exclude rejected)"""
    # Get all job IDs for this company
    job_ids = [job.id for job in current_user.jobs]
    
    # Get all matches (likes) for these jobs, excluding rejected applicants
    if job_ids:
        matches = Match.query.filter(
            Match.job_id.in_(job_ids),
            Match.is_match == True,
            Match.application_status != 'rejected'  # NEW: Exclude rejected applicants
        ).order_by(Match.created_at.desc()).all()
    else:
        matches = []
    
    # Organize by user with their profile
    applicants_data = []
    for match in matches:
        user = match.user
        resume = ResumeAnalysis.query.filter_by(user_id=user.id).first()
        applicants_data.append({
            'match': match,  # NEW: Include match object for status
            'user': user,
            'job': match.job,
            'resume': resume,
            'matched_at': match.created_at,
            'status': match.application_status  # NEW: Include status
        })
    
    return render_template('company/applicants.html', applicants=applicants_data)


@app.route('/company/candidate/<int:user_id>')
@company_required
def candidate_profile(user_id):
    """View full profile of a candidate"""
    user = User.query.get_or_404(user_id)
    analysis = ResumeAnalysis.query.filter_by(user_id=user.id).first()
    
    # Get the match/application for context
    job_ids = [job.id for job in current_user.jobs]
    match = Match.query.filter(
        Match.user_id == user_id,
        Match.job_id.in_(job_ids),
        Match.is_match == True
    ).first()
    
    return render_template('company/candidate_profile.html', 
                         user=user, 
                         analysis=analysis,
                         match=match)


# --- API ENDPOINTS ---

@app.route('/api/get-next-job', methods=['GET'])
@jobseeker_required
def get_next_job():
    """Get the next unswiped job for the user"""
    # Get list of job IDs user has already swiped on
    swiped_job_ids = [match.job_id for match in current_user.matches]
    
    # Find one active job that isn't in the swiped list and applications are open
    next_job = Job.query.filter(
        Job.id.notin_(swiped_job_ids),
        Job.is_active == True,
        Job.applications_closed == False  # NEW: Only show jobs with open applications
    ).first()
    
    if next_job:
        return jsonify({
            'jobId': next_job.id,
            'title': next_job.title,
            'company': next_job.company.company_name,
            'location': next_job.location,
            'description': next_job.description_text,
            'jobType': next_job.job_type,
            'salaryRange': next_job.salary_range,
            'applyUrl': next_job.apply_url
        })
    else:
        return jsonify({'error': 'No more jobs available'}), 404

@app.route('/api/swipe', methods=['POST'])
@jobseeker_required
def swipe():
    """Record a user's swipe on a job"""
    data = request.get_json()
    job_id = data.get('jobId')
    is_like = data.get('isLike')
    
    if not job_id:
        return jsonify({'error': 'Missing jobId'}), 400
    
    # Check if match already exists
    existing_match = Match.query.filter_by(user_id=current_user.id, job_id=job_id).first()
    
    if not existing_match:
        new_match = Match(
            user_id=current_user.id,
            job_id=job_id,
            is_match=is_like
        )
        db.session.add(new_match)
        db.session.commit()
        return jsonify({'status': 'success', 'action': 'created'})
    else:
        return jsonify({'status': 'success', 'action': 'already_exists'})


@app.route('/api/company/delete-job/<int:job_id>', methods=['DELETE'])
@company_required
def delete_job(job_id):
    """Delete a job posting"""
    job = Job.query.get_or_404(job_id)
    
    # Verify this company owns the job
    if job.company_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(job)
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Job deleted successfully'})


@app.route('/api/company/update-job/<int:job_id>', methods=['PUT'])
@company_required
def update_job(job_id):
    """Update a job posting"""
    job = Job.query.get_or_404(job_id)
    
    # Verify this company owns the job
    if job.company_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    # Update fields if provided
    if 'title' in data:
        job.title = data['title']
    if 'location' in data:
        job.location = data['location']
    if 'description' in data:
        job.description_text = data['description']
    if 'requirements' in data:
        job.requirements = data['requirements']
    if 'salary_range' in data:
        job.salary_range = data['salary_range']
    if 'job_type' in data:
        job.job_type = data['job_type']
    if 'is_active' in data:
        job.is_active = data['is_active']
    
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Job updated successfully'})


# --- NEW API ENDPOINTS FOR ENHANCED FEATURES ---

@app.route('/api/company/update-application-status', methods=['PUT'])
@company_required
def update_application_status():
    """Company can accept or reject an application"""
    data = request.get_json()
    match_id = data.get('match_id')
    new_status = data.get('status')  # 'accepted' or 'rejected'
    
    if not match_id:
        return jsonify({'error': 'Match ID required'}), 400
    
    match = Match.query.get_or_404(match_id)
    job = Job.query.get_or_404(match.job_id)
    
    # Verify this company owns the job
    if job.company_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if new_status not in ['pending', 'accepted', 'rejected']:
        return jsonify({'error': 'Invalid status'}), 400
    
    match.application_status = new_status
    db.session.commit()
    
    return jsonify({
        'status': 'success', 
        'message': f'Application {new_status}',
        'new_status': new_status
    })


@app.route('/api/company/close-applications', methods=['PUT'])
@company_required
def close_applications():
    """Company can close applications for a job"""
    data = request.get_json()
    job_id = data.get('job_id')
    should_close = data.get('close', True)
    
    if not job_id:
        return jsonify({'error': 'Job ID required'}), 400
    
    job = Job.query.get_or_404(job_id)
    
    # Verify this company owns the job
    if job.company_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    job.applications_closed = should_close
    db.session.commit()
    
    status_text = 'closed' if job.applications_closed else 'reopened'
    return jsonify({
        'status': 'success',
        'message': f'Applications {status_text}',
        'applications_closed': job.applications_closed
    })


@app.route('/api/hide-match/<int:match_id>', methods=['PUT'])
@login_required
def hide_match(match_id):
    """Job seeker can hide a matched job"""
    match = Match.query.get_or_404(match_id)
    
    # Verify this user owns the match
    if match.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    match.is_hidden_by_user = True
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Job hidden from matches'})


@app.route('/api/unhide-match/<int:match_id>', methods=['PUT'])
@login_required
def unhide_match(match_id):
    """Job seeker can unhide a hidden job"""
    match = Match.query.get_or_404(match_id)
    
    # Verify this user owns the match
    if match.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    match.is_hidden_by_user = False
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Job restored to matches'})


@app.route('/api/reapply/<int:job_id>', methods=['POST'])
@login_required
def reapply_to_job(job_id):
    """Change a dislike to a like (reapply to skipped job)"""
    match = Match.query.filter_by(user_id=current_user.id, job_id=job_id).first()
    
    if not match:
        return jsonify({'error': 'Match not found'}), 404
    
    # Change dislike to like
    match.is_match = True
    match.application_status = 'pending'
    match.is_hidden_by_user = False
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Application submitted successfully'})


@app.route('/api/get-resume-feedback', methods=['POST'])
@jobseeker_required
def api_get_resume_feedback():
    """Get AI-powered resume feedback for improvement"""
    data = request.get_json()
    target_job = data.get('target_job', 'Software Engineer')
    
    # Get user's resume analysis
    analysis = ResumeAnalysis.query.filter_by(user_id=current_user.id).first()
    if not analysis or not analysis.extracted_json:
        return jsonify({'error': 'Please upload a resume first'}), 404
    
    try:
        extracted_data = json.loads(analysis.extracted_json)
        feedback = get_resume_feedback(extracted_data, target_job)
        
        if feedback:
            return jsonify({'status': 'success', 'feedback': feedback}), 200
        else:
            return jsonify({'error': 'Failed to generate feedback'}), 500
    except Exception as e:
        print(f"Error generating feedback: {e}")
        return jsonify({'error': 'An error occurred while generating feedback'}), 500


@app.route('/career-roadmap')
@jobseeker_required
def career_roadmap():
    """View career roadmap page"""
    # Get user's latest roadmap
    roadmap = CareerRoadmap.query.filter_by(user_id=current_user.id).order_by(CareerRoadmap.updated_at.desc()).first()
    
    # Parse roadmap JSON if exists
    roadmap_data = None
    if roadmap:
        try:
            roadmap_data = json.loads(roadmap.roadmap_json)
        except:
            roadmap_data = None
    
    return render_template('career_roadmap.html', roadmap=roadmap, roadmap_data=roadmap_data)


@app.route('/api/generate-career-roadmap', methods=['POST'])
@jobseeker_required
def api_generate_career_roadmap():
    """Generate and save a personalized career roadmap"""
    data = request.get_json()
    target_job = data.get('target_job', 'Software Engineer')
    
    # Get user's resume analysis
    analysis = ResumeAnalysis.query.filter_by(user_id=current_user.id).first()
    if not analysis or not analysis.extracted_json:
        return jsonify({'error': 'Please upload a resume first'}), 404
    
    try:
        extracted_data = json.loads(analysis.extracted_json)
        print(f"Generating roadmap for target job: {target_job}")
        print(f"Current skills: {extracted_data.get('skills', [])}")
        
        roadmap = get_career_roadmap(extracted_data, target_job)
        
        if roadmap:
            print(f"Roadmap generated successfully with {len(roadmap)} phases")
            
            # Save or update roadmap in database
            existing_roadmap = CareerRoadmap.query.filter_by(user_id=current_user.id).first()
            
            if existing_roadmap:
                # Update existing roadmap
                existing_roadmap.target_job = target_job
                existing_roadmap.roadmap_json = json.dumps(roadmap)
                existing_roadmap.updated_at = datetime.utcnow()
            else:
                # Create new roadmap
                new_roadmap = CareerRoadmap(
                    user_id=current_user.id,
                    target_job=target_job,
                    roadmap_json=json.dumps(roadmap)
                )
                db.session.add(new_roadmap)
            
            db.session.commit()
            
            return jsonify({'status': 'success', 'roadmap': roadmap}), 200
        else:
            print("Roadmap generation returned None")
            return jsonify({'error': 'Failed to generate roadmap'}), 500
    except Exception as e:
        print(f"Error generating roadmap: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# --- MAIN EXECUTION ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")
    app.run(debug=True, port=5000)
