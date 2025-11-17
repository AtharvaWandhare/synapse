# app.py
import os
import json
from datetime import datetime
from functools import wraps
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session, send_from_directory, abort
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from flask_bcrypt import Bcrypt
from werkzeug.utils import secure_filename
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import jwt
import re
from functools import wraps as _wraps
from flask import g
from datetime import timedelta

# Import database models
from models import db, User, Company, ResumeAnalysis, Job, Match, CareerRoadmap, LatexResume, Conversation, Message

# Import resume analyzer core logic
from core_logic.extractor import extract_text_from_pdf
from core_logic.analyzer import extract_resume_data
from core_logic.improver import get_resume_feedback, get_career_roadmap
from core_logic.ats_scorer import calculate_ats_score, get_profile_enhancement
from core_logic.matcher import calculate_match_score

# Import LaTeX template
from latex_template import DEFAULT_TEMPLATE

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
socketio = SocketIO(
    app, 
    cors_allowed_origins="*",
    async_mode='threading',
    logger=True,
    engineio_logger=True,
    ping_timeout=10,
    ping_interval=5
)

# Enable CORS for quick frontend integration (allow credentials)
CORS(app, supports_credentials=True)

# JWT configuration (quick & dirty)
JWT_SECRET = os.environ.get('JWT_SECRET', app.config.get('SECRET_KEY') or 'dev-jwt-secret')
JWT_ALGORITHM = 'HS256'
JWT_EXP_DELTA_SECONDS = int(os.environ.get('JWT_EXP', 60*60*24))  # default 24 hours

def create_jwt_token(user_id, user_type):
    payload = {
        'user_id': user_id,
        'user_type': user_type,
        'exp': datetime.utcnow() + timedelta(seconds=JWT_EXP_DELTA_SECONDS)
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token

def decode_jwt_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception as e:
        return None

def jwt_required(fn):
    @_wraps(fn)
    def wrapper(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if auth.startswith('Bearer '):
            token = auth.split(' ', 1)[1]
            payload = decode_jwt_token(token)
            if payload:
                user_id = payload.get('user_id')
                user_type = payload.get('user_type')
                user = None
                try:
                    if user_type == 'company':
                        user = Company.query.get(user_id)
                    else:
                        user = User.query.get(user_id)
                except:
                    user = None
                if user:
                    # expose commonly used user info to request context
                    g.jwt_user = user
                    g.user_id = user.id
                    g.user_type = user.user_type
                    return fn(*args, **kwargs)
        return jsonify({'error': 'Unauthorized'}), 401
    return wrapper

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


@app.route('/api/login', methods=['POST'])
def api_login():
    """Deprecated cookie-based login endpoint.

    This endpoint is deprecated for API clients. Use `/api/jwt-login` to obtain
    a Bearer token and authenticate API requests via the `Authorization` header.
    Kept for backwards compatibility but will return HTTP 410.
    """
    return jsonify({
        'error': 'deprecated',
        'message': 'Use /api/jwt-login to obtain a JWT token. This endpoint is deprecated.'
    }), 410


@app.route('/api/jwt-login', methods=['POST'])
def api_jwt_login():
    """Issue a JWT token for valid credentials."""
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    if not email or not password:
        return jsonify({'error': 'Missing credentials'}), 400

    user = User.query.filter_by(email=email).first()
    if user and bcrypt.check_password_hash(user.password_hash, password):
        token = create_jwt_token(user.id, user.user_type)
        return jsonify({'status': 'success', 'token': token, 'user_id': user.id, 'user_type': user.user_type}), 200

    company = Company.query.filter_by(email=email).first()
    if company and bcrypt.check_password_hash(company.password_hash, password):
        token = create_jwt_token(company.id, company.user_type)
        return jsonify({'status': 'success', 'token': token, 'user_id': company.id, 'user_type': company.user_type}), 200

    return jsonify({'error': 'Invalid email or password'}), 401


@app.route('/api/register/jobseeker', methods=['POST'])
def api_register_jobseeker():
    """Register a new job seeker via API."""
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    name = data.get('name')
    
    if not email or not password or not name:
        return jsonify({'error': 'Missing required fields: email, password, name'}), 400
    
    # Check if email already exists
    if User.query.filter_by(email=email).first() or Company.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
    
    # Create new user
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(
        email=email,
        password_hash=hashed_password,
        full_name=name,
        user_type='jobseeker'
    )
    
    db.session.add(new_user)
    db.session.commit()
    
    # Auto-login: create JWT token
    token = create_jwt_token(new_user.id, new_user.user_type)
    
    return jsonify({
        'status': 'success',
        'message': 'Account created successfully',
        'token': token,
        'user_id': new_user.id,
        'user_type': new_user.user_type
    }), 201


@app.route('/api/register/company', methods=['POST'])
def api_register_company():
    """Register a new company via API."""
    data = request.get_json() or {}
    email = data.get('email')
    password = data.get('password')
    company_name = data.get('company_name')
    website = data.get('website', '')
    description = data.get('description', '')
    
    if not email or not password or not company_name:
        return jsonify({'error': 'Missing required fields: email, password, company_name'}), 400
    
    # Check if email already exists
    if User.query.filter_by(email=email).first() or Company.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409
    
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
    
    # Auto-login: create JWT token
    token = create_jwt_token(new_company.id, new_company.user_type)
    
    return jsonify({
        'status': 'success',
        'message': 'Company account created successfully',
        'token': token,
        'user_id': new_company.id,
        'user_type': new_company.user_type
    }), 201


@app.route('/api/logout', methods=['POST'])
def api_logout():
    """Deprecated cookie-based logout endpoint.

    For API clients using JWTs, simply discard the token client-side. This
    endpoint will return HTTP 410 to indicate deprecation.
    """
    # Best-effort clear server session for any callers still using cookies
    try:
        session.pop('user_type', None)
        logout_user()
    except Exception:
        pass
    return jsonify({
        'error': 'deprecated',
        'message': 'Use token discard on client. This endpoint is deprecated.'
    }), 410


@app.route('/api/profile', methods=['GET'])
@jwt_required
def api_get_profile():
    """Return current user's profile as JSON (JWT-only)."""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Get resume analysis if exists
    resume_analysis = ResumeAnalysis.query.filter_by(user_id=user.id).first()
    resume_data = None
    if resume_analysis:
        resume_data = {
            'filename': resume_analysis.filename,
            'ats_score': resume_analysis.ats_score,
            'target_job_role': resume_analysis.target_job_role,
            'has_enhancement': bool(resume_analysis.enhancement_recommendations),
            'updated_at': resume_analysis.updated_at.isoformat() if resume_analysis.updated_at else None
        }
    
    profile = {
        'id': user.id,
        'email': user.email,
        'full_name': user.full_name,
        'career_objective': user.career_objective,
        'projects': json.loads(user.projects) if user.projects else [],
        'training_courses': json.loads(user.training_courses) if user.training_courses else [],
        'portfolio_url': user.portfolio_url,
        'work_samples': json.loads(user.work_samples) if user.work_samples else [],
        'accomplishments': user.accomplishments,
        'phone': user.phone,
        'location': user.location,
        'linkedin_url': user.linkedin_url,
        'github_url': user.github_url,
        'resume': resume_data
    }
    return jsonify({'status': 'success', 'profile': profile}), 200


@app.route('/api/profile', methods=['POST'])
@jwt_required
def api_update_profile():
    """Quick JSON profile update (partial fields) - JWT-only."""
    data = request.get_json() or {}
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    # Update a few allowed fields quickly
    for field in ['full_name', 'career_objective', 'portfolio_url', 'accomplishments', 'phone', 'location', 'linkedin_url', 'github_url']:
        if field in data:
            setattr(user, field, data.get(field))

    # For simple lists accept arrays
    if 'projects' in data:
        user.projects = json.dumps(data.get('projects') or [])
    if 'training_courses' in data:
        user.training_courses = json.dumps(data.get('training_courses') or [])
    if 'work_samples' in data:
        user.work_samples = json.dumps(data.get('work_samples') or [])

    db.session.commit()
    return jsonify({'status': 'success'}), 200


@app.route('/api/upload-resume', methods=['POST'])
@jwt_required
def api_upload_resume():
    """Accept multipart/form-data resume upload and return JSON with analysis result (JWT-only)."""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    if 'resume_file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['resume_file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file'}), 400

    filename = secure_filename(file.filename)
    full_filename = f"{user.id}_{filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], full_filename)
    file.save(filepath)

    try:
        raw_text = extract_text_from_pdf(filepath)
        if not raw_text:
            return jsonify({'error': 'Could not extract text from file'}), 500
        analysis_result = extract_resume_data(raw_text)
        if not analysis_result:
            return jsonify({'error': 'Could not analyze resume'}), 500

        # Calculate ATS score
        ats_result = calculate_ats_score(analysis_result)
        ats_score = ats_result.get('ats_score', 0) if ats_result else 0
        target_job_role = ats_result.get('target_job_role', 'Not specified') if ats_result else 'Not specified'

        resume_analysis = ResumeAnalysis.query.filter_by(user_id=user.id).first()
        if not resume_analysis:
            resume_analysis = ResumeAnalysis(user_id=user.id)

        resume_analysis.raw_text = raw_text
        resume_analysis.filename = full_filename
        resume_analysis.extracted_json = json.dumps(analysis_result)
        resume_analysis.ats_score = ats_score
        resume_analysis.target_job_role = target_job_role
        db.session.add(resume_analysis)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'analysis': analysis_result,
            'ats_score': ats_score,
            'target_job_role': target_job_role,
            'ats_breakdown': ats_result.get('breakdown') if ats_result else None,
            'ats_recommendations': ats_result.get('recommendations') if ats_result else []
        }), 200
    except Exception as e:
        print(f"Error analyzing resume (API): {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/jwt/profile', methods=['GET'])
@jwt_required
def api_jwt_get_profile():
    """Return profile for JWT-authenticated user (strict JWT)."""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    profile = {
        'id': user.id,
        'email': user.email,
        'full_name': user.full_name,
        'career_objective': user.career_objective,
        'projects': json.loads(user.projects) if user.projects else [],
        'training_courses': json.loads(user.training_courses) if user.training_courses else [],
        'portfolio_url': user.portfolio_url,
        'work_samples': json.loads(user.work_samples) if user.work_samples else [],
        'accomplishments': user.accomplishments,
        'phone': user.phone,
        'location': user.location,
        'linkedin_url': user.linkedin_url,
        'github_url': user.github_url
    }
    return jsonify({'status': 'success', 'profile': profile}), 200


@app.route('/api/jwt/upload-resume', methods=['POST'])
@jwt_required
def api_jwt_upload_resume():
    """JWT-only resume upload endpoint accepting multipart/form-data"""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    if 'resume_file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    file = request.files['resume_file']
    if file.filename == '' or not allowed_file(file.filename):
        return jsonify({'error': 'Invalid file'}), 400

    filename = secure_filename(file.filename)
    full_filename = f"{user.id}_{filename}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], full_filename)
    file.save(filepath)

    try:
        raw_text = extract_text_from_pdf(filepath)
        if not raw_text:
            return jsonify({'error': 'Could not extract text from file'}), 500
        analysis_result = extract_resume_data(raw_text)
        if not analysis_result:
            return jsonify({'error': 'Could not analyze resume'}), 500

        # Calculate ATS score
        ats_result = calculate_ats_score(analysis_result)
        ats_score = ats_result.get('ats_score', 0) if ats_result else 0
        target_job_role = ats_result.get('target_job_role', 'Not specified') if ats_result else 'Not specified'

        # Calculate profile summary
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
        
        # Calculate comprehensive resume score (0-100)
        score = 0
        education = analysis_result.get('education', [])
        certifications = analysis_result.get('certifications', [])
        projects = analysis_result.get('projects', [])
        
        # Skills (max 30 points)
        skill_count = len(skills) if isinstance(skills, list) else (1 if skills else 0)
        score += min(30, skill_count * 3)
        
        # Work Experience (max 25 points)
        exp_count = len(work_exp) if isinstance(work_exp, list) else (1 if work_exp else 0)
        score += min(25, exp_count * 8)
        
        # Education (max 20 points)
        edu_count = len(education) if isinstance(education, list) else (1 if education else 0)
        score += min(20, edu_count * 10)
        
        # Certifications (max 15 points)
        cert_count = len(certifications) if isinstance(certifications, list) else (1 if certifications else 0)
        score += min(15, cert_count * 5)
        
        # Projects (max 10 points)
        project_count = len(projects) if isinstance(projects, list) else (1 if projects else 0)
        score += min(10, project_count * 5)
        
        analysis_score = min(100, score)

        resume_analysis = ResumeAnalysis.query.filter_by(user_id=user.id).first()
        if not resume_analysis:
            resume_analysis = ResumeAnalysis(user_id=user.id)

        resume_analysis.raw_text = raw_text
        resume_analysis.filename = full_filename
        resume_analysis.extracted_json = json.dumps(analysis_result)
        resume_analysis.ats_score = ats_score
        resume_analysis.target_job_role = target_job_role
        resume_analysis.profile_summary_text = profile_summary.strip()
        resume_analysis.analysis_score = analysis_score
        db.session.add(resume_analysis)
        db.session.commit()

        return jsonify({
            'status': 'success',
            'analysis': analysis_result,
            'ats_score': ats_score,
            'analysis_score': analysis_score,
            'target_job_role': target_job_role,
            'profile_summary': profile_summary.strip(),
            'ats_breakdown': ats_result.get('breakdown') if ats_result else None,
            'ats_recommendations': ats_result.get('recommendations') if ats_result else []
        }), 200
    except Exception as e:
        print(f"Error analyzing resume (JWT API): {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/jwt/generate-career-roadmap', methods=['POST'])
@jwt_required
def api_jwt_generate_career_roadmap():
    """JWT-only roadmap generation endpoint. Saves roadmap to DB."""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json() or {}
    target_job = data.get('target_job', 'Software Engineer')

    analysis = ResumeAnalysis.query.filter_by(user_id=user.id).first()
    if not analysis or not analysis.extracted_json:
        return jsonify({'error': 'Please upload a resume first'}), 404

    try:
        extracted_data = json.loads(analysis.extracted_json)
        roadmap = get_career_roadmap(extracted_data, target_job)
        if not roadmap:
            return jsonify({'error': 'Failed to generate roadmap'}), 500

        # Don't update existing roadmap, create new one to keep history
        new_rm = CareerRoadmap(user_id=user.id, target_job=target_job, roadmap_json=json.dumps(roadmap))
        db.session.add(new_rm)
        db.session.commit()

        return jsonify({'status': 'success', 'roadmap': roadmap, 'roadmap_id': new_rm.id}), 200
    except Exception as e:
        print(f"Error generating roadmap (JWT API): {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/roadmaps', methods=['GET'])
@jwt_required
def api_get_roadmaps():
    """Get all roadmaps for the current user"""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    roadmaps = CareerRoadmap.query.filter_by(user_id=user.id).order_by(CareerRoadmap.created_at.desc()).all()
    roadmaps_list = [{
        'id': rm.id,
        'target_job': rm.target_job,
        'created_at': rm.created_at.isoformat(),
        'roadmap': json.loads(rm.roadmap_json)
    } for rm in roadmaps]
    
    return jsonify({'status': 'success', 'roadmaps': roadmaps_list}), 200


@app.route('/api/roadmap/<int:roadmap_id>', methods=['DELETE'])
@jwt_required
def api_delete_roadmap(roadmap_id):
    """Delete a specific roadmap"""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    roadmap = CareerRoadmap.query.filter_by(id=roadmap_id, user_id=user.id).first()
    if not roadmap:
        return jsonify({'error': 'Roadmap not found'}), 404
    
    db.session.delete(roadmap)
    db.session.commit()
    return jsonify({'status': 'success'}), 200


@app.route('/api/roadmap/<int:roadmap_id>', methods=['GET'])
@jwt_required
def api_get_roadmap(roadmap_id):
    """Return a single roadmap by id for current user (JWT-only)"""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    rm = CareerRoadmap.query.filter_by(id=roadmap_id, user_id=user.id).first()
    if not rm:
        return jsonify({'error': 'Roadmap not found'}), 404

    roadmap = {
        'id': rm.id,
        'target_job': rm.target_job,
        'created_at': rm.created_at.isoformat(),
        'roadmap': json.loads(rm.roadmap_json)
    }
    return jsonify({'status': 'success', 'roadmap': roadmap}), 200


@app.route('/api/profile-enhancement', methods=['POST'])
@jwt_required
def api_profile_enhancement():
    """Generate profile enhancement recommendations"""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    analysis = ResumeAnalysis.query.filter_by(user_id=user.id).first()
    if not analysis or not analysis.extracted_json:
        return jsonify({'error': 'Please upload a resume first'}), 404
    
    try:
        extracted_data = json.loads(analysis.extracted_json)
        enhancement = get_profile_enhancement(extracted_data, analysis.raw_text or '')
        
        if not enhancement:
            return jsonify({'error': 'Failed to generate enhancement recommendations'}), 500
        
        # Save to database
        analysis.enhancement_recommendations = json.dumps(enhancement)
        db.session.commit()
        
        return jsonify({'status': 'success', 'enhancement': enhancement}), 200
    except Exception as e:
        print(f"Error generating enhancement: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/resume-analysis', methods=['GET'])
@jwt_required
def api_get_resume_analysis():
    """Get current resume analysis including ATS score"""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    analysis = ResumeAnalysis.query.filter_by(user_id=user.id).first()
    if not analysis:
        return jsonify({'status': 'success', 'analysis': None}), 200
    
    return jsonify({
        'status': 'success',
        'analysis': {
            'filename': analysis.filename,
            'ats_score': analysis.ats_score,
            'target_job_role': analysis.target_job_role,
            'extracted_data': json.loads(analysis.extracted_json) if analysis.extracted_json else None,
            'enhancement_recommendations': json.loads(analysis.enhancement_recommendations) if analysis.enhancement_recommendations else None,
            'created_at': analysis.created_at.isoformat(),
            'updated_at': analysis.updated_at.isoformat()
        }
    }), 200


def _get_request_user():
    """Helper: prefer JWT user (g.jwt_user) else Flask-Login current_user if authenticated."""
    try:
        if hasattr(g, 'jwt_user') and g.jwt_user:
            return g.jwt_user
    except:
        pass
    try:
        if current_user and current_user.is_authenticated:
            return current_user
    except:
        pass
    return None


@app.route('/api/jobs', methods=['GET'])
def api_get_jobs():
    """Return list of active jobs as JSON. No auth required to view jobs."""
    jobs = Job.query.filter_by(is_active=True).all()
    jobs_list = []
    for j in jobs:
        jobs_list.append({
            'id': j.id,
            'title': j.title,
            'location': j.location,
            'salary_range': j.salary_range,
            'job_type': j.job_type,
            'company': j.company.company_name
        })
    return jsonify({'status': 'success', 'jobs': jobs_list}), 200


@app.route('/api/matches', methods=['GET'])
@jwt_required
def api_get_matches():
    """Return current user's matches (JWT-only)"""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401

    matches = Match.query.filter_by(user_id=user.id).all()
    out = []
    # Get user's resume data for AI-enhanced matching
    resume_analysis = ResumeAnalysis.query.filter_by(user_id=user.id).first()
    resume_data = {}
    if resume_analysis and resume_analysis.extracted_json:
        try:
            resume_data = json.loads(resume_analysis.extracted_json)
        except Exception:
            resume_data = {}

    for m in matches:
        job = m.job
        # Calculate AI-enhanced match score using TF-IDF and cosine similarity
        # Prefer stored match_score; if missing, compute and persist it for future use
        match_score = m.match_score
        if match_score is None and resume_data:
            try:
                match_score = calculate_match_score(
                    resume_data=resume_data,
                    job_description=job.description_text or '',
                    job_requirements=job.requirements or ''
                )
                # Persist the computed score on the match
                m.match_score = int(match_score) if match_score is not None else None
                db.session.add(m)
                db.session.commit()
            except Exception as e:
                print(f"Error calculating match score: {e}")
                match_score = None

        out.append({
            'id': m.id,
            'job_id': m.job_id,
            'job_title': job.title,
            'company_name': job.company.company_name if job.company else 'Unknown Company',
            'location': job.location,
            'salary_range': job.salary_range,
            'job_type': job.job_type,
            'description': job.description_text,
            'requirements': job.requirements,
            'apply_url': job.apply_url,
            'match_score': match_score,
            'is_match': m.is_match,
            'application_status': m.application_status,
            'is_hidden_by_user': m.is_hidden_by_user
        })
    return jsonify({'status': 'success', 'matches': out}), 200


@app.route('/api/match', methods=['POST'])
@jwt_required
def api_post_match():
    """Create or update a match for current user. JSON: { job_id: int, is_match: true/false } (JWT-only)"""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    data = request.get_json() or {}
    job_id = data.get('job_id')
    is_match_flag = data.get('is_match', True)
    if not job_id:
        return jsonify({'error': 'Missing job_id'}), 400

    # Ensure job exists
    job = Job.query.get(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404

    match = Match.query.filter_by(user_id=user.id, job_id=job_id).first()
    if not match:
        match = Match(user_id=user.id, job_id=job_id, is_match=bool(is_match_flag))
        db.session.add(match)
    else:
        match.is_match = bool(is_match_flag)
    db.session.commit()
    return jsonify({'status': 'success', 'match_id': match.id}), 200



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


@app.route('/api/download-resume/<filename>', methods=['GET'])
@jwt_required
def api_download_resume(filename):
    """Download a resume file (JWT auth version)"""
    user = _get_request_user()
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Security: Only allow downloading your own resume or if you're a company viewing a candidate
    if user.user_type == 'jobseeker':
        # Job seekers can only download their own resume
        analysis = ResumeAnalysis.query.filter_by(user_id=user.id).first()
        if not analysis or analysis.filename != filename:
            return jsonify({'error': 'Forbidden'}), 403
    elif user.user_type == 'company':
        # Companies can download resumes of candidates who applied to their jobs
        # Extract user_id from filename (format: {user_id}_{original_filename})
        try:
            user_id = int(filename.split('_')[0])
            # Check if this user applied to any of the company's jobs
            job_ids = [job.id for job in user.jobs]
            match = Match.query.filter(
                Match.user_id == user_id,
                Match.job_id.in_(job_ids),
                Match.is_match == True
            ).first()
            if not match:
                return jsonify({'error': 'Forbidden - candidate not found'}), 403
        except (ValueError, IndexError):
            return jsonify({'error': 'Invalid filename'}), 404
    else:
        return jsonify({'error': 'Forbidden'}), 403
    
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


### JSON API equivalents for company actions (accept JWT or session)


@app.route('/api/company/dashboard', methods=['GET'])
@jwt_required
def api_company_dashboard():
    """Return simple dashboard stats for the authenticated company."""
    user = _get_request_user()
    if not user or user.user_type != 'company':
        return jsonify({'error': 'Unauthorized'}), 401

    total_jobs = Job.query.filter_by(company_id=user.id).count()
    job_ids = [job.id for job in user.jobs]
    total_applicants = Match.query.filter(
        Match.job_id.in_(job_ids),
        Match.is_match == True
    ).count() if job_ids else 0

    recent_matches = Match.query.filter(
        Match.job_id.in_(job_ids),
        Match.is_match == True
    ).order_by(Match.created_at.desc()).limit(5).all() if job_ids else []

    recent = []
    for m in recent_matches:
        recent.append({
            'match_id': m.id,
            'user_id': m.user_id,
            'job_id': m.job_id,
            'job_title': m.job.title,
            'created_at': m.created_at.isoformat(),
        })

    return jsonify({'status': 'success', 'total_jobs': total_jobs, 'total_applicants': total_applicants, 'recent_matches': recent}), 200


@app.route('/api/company/post-job', methods=['POST'])
@jwt_required
def api_company_post_job():
    """Create a new job via JSON payload. Quick and dirty."""
    user = _get_request_user()
    if not user or user.user_type != 'company':
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    title = data.get('title')
    location = data.get('location')
    description = data.get('description')
    requirements = data.get('requirements', '')
    salary_range = data.get('salary_range', '')
    job_type = data.get('job_type', 'Full-time')
    apply_url = data.get('apply_url', '')

    if not title or not description:
        return jsonify({'error': 'Missing title or description'}), 400

    new_job = Job(
        company_id=user.id,
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
    return jsonify({'status': 'success', 'job_id': new_job.id}), 201


@app.route('/api/company/my-jobs', methods=['GET'])
@jwt_required
def api_company_my_jobs():
    user = _get_request_user()
    if not user or user.user_type != 'company':
        return jsonify({'error': 'Unauthorized'}), 401

    jobs = Job.query.filter_by(company_id=user.id).order_by(Job.created_at.desc()).all()
    out = []
    for j in jobs:
        out.append({
            'id': j.id,
            'title': j.title,
            'location': j.location,
            'salary_range': j.salary_range,
            'job_type': j.job_type,
            'created_at': j.created_at.isoformat(),
            'applications_closed': j.applications_closed
        })
    return jsonify({'status': 'success', 'jobs': out}), 200


@app.route('/api/company/applicants', methods=['GET'])
@jwt_required
def api_company_applicants():
    user = _get_request_user()
    if not user or user.user_type != 'company':
        return jsonify({'error': 'Unauthorized'}), 401

    # Optional filter by specific job_id
    job_id_param = request.args.get('job_id', type=int)
    
    job_ids = [job.id for job in user.jobs]
    
    # If job_id specified, filter to just that job
    if job_id_param:
        if job_id_param not in job_ids:
            return jsonify({'error': 'Unauthorized - job not found'}), 403
        job_ids = [job_id_param]
    
    if job_ids:
        matches = Match.query.filter(
            Match.job_id.in_(job_ids),
            Match.is_match == True,
            Match.application_status != 'rejected'
        ).order_by(Match.created_at.desc()).all()
    else:
        matches = []

    applicants = []
    for match in matches:
        user_obj = match.user
        resume = ResumeAnalysis.query.filter_by(user_id=user_obj.id).first()
        
        # Prepare resume data with all needed fields
        resume_data = None
        if resume and resume.extracted_json:
            try:
                parsed_json = json.loads(resume.extracted_json)
                resume_data = {
                    'analysis_score': resume.analysis_score,
                    'profile_summary_text': resume.profile_summary_text,
                    **parsed_json  # Includes skills, education, work_experience, etc.
                }
            except:
                resume_data = None
        
        # Ensure match_score exists (compute & persist for older matches)
        match_score = match.match_score
        if match_score is None and resume and resume.extracted_json:
            try:
                resume_json = json.loads(resume.extracted_json)
                job_obj = Job.query.get(match.job_id)
                if job_obj:
                    new_score = calculate_match_score(resume_json, job_obj.description_text or '', job_obj.requirements or '')
                    match_score = int(new_score) if new_score is not None else None
                    match.match_score = match_score
                    db.session.add(match)
                    db.session.commit()
            except Exception as e:
                print(f"Error computing backfill match score for applicant list: {e}")

        applicants.append({
            'match_id': match.id,
            'user_id': user_obj.id,
            'full_name': user_obj.full_name,
            'email': user_obj.email,
            'job_id': match.job_id,
            'job_title': match.job.title,
            'status': match.application_status,
            'matched_at': match.created_at.isoformat(),
            'resume': resume_data,
            'match_score': match_score
        })

    return jsonify({'status': 'success', 'applicants': applicants}), 200


@app.route('/api/company/candidate/<int:user_id>', methods=['GET'])
@jwt_required
def api_company_candidate_profile(user_id):
    user = _get_request_user()
    if not user or user.user_type != 'company':
        return jsonify({'error': 'Unauthorized'}), 401

    candidate = User.query.get_or_404(user_id)
    analysis = ResumeAnalysis.query.filter_by(user_id=candidate.id).first()
    job_ids = [job.id for job in user.jobs]
    match = Match.query.filter(
        Match.user_id == user_id,
        Match.job_id.in_(job_ids),
        Match.is_match == True
    ).first()

    # Prepare analysis data
    analysis_data = None
    if analysis and analysis.extracted_json:
        try:
            parsed = json.loads(analysis.extracted_json)
            analysis_data = {
                'filename': analysis.filename,
                'analysis_score': analysis.analysis_score,
                'ats_score': analysis.ats_score,
                'target_job_role': analysis.target_job_role,
                'profile_summary_text': analysis.profile_summary_text,
                'extracted_json': parsed
            }
        except:
            analysis_data = None
    
    # We intentionally do not compute a 'match_score' here; the profile should not expose the score.

    return jsonify({
        'status': 'success',
        'user': {
            'id': candidate.id,
            'full_name': candidate.full_name,
            'email': candidate.email,
            'location': candidate.location,
            'phone': candidate.phone,
            'linkedin_url': candidate.linkedin_url,
            'github_url': candidate.github_url,
            'portfolio_url': candidate.portfolio_url,
            'career_objective': candidate.career_objective,
            'projects': candidate.projects,
            'training_courses': candidate.training_courses,
            'work_samples': candidate.work_samples
        },
        'analysis': analysis_data,
        'match': {
            'id': match.id,
            'job_id': match.job_id,
            'application_status': match.application_status
        } if match else None
    }), 200


# --- API ENDPOINTS ---

@app.route('/api/get-next-job', methods=['GET'])
@jwt_required
def get_next_job():
    """Get the next unswiped job for the user (JWT-only)"""
    user = getattr(g, 'jwt_user', None)
    if not user or user.user_type != 'jobseeker':
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Get list of job IDs user has already swiped on
    swiped_job_ids = [match.job_id for match in user.matches]
    
    # Find one active job that isn't in the swiped list and applications are open
    next_job = Job.query.filter(
        Job.id.notin_(swiped_job_ids),
        Job.is_active == True,
        Job.applications_closed == False
    ).first()
    
    if next_job:
        # Calculate AI-enhanced match score
        match_score = None
        try:
            resume_analysis = ResumeAnalysis.query.filter_by(user_id=user.id).first()
            if resume_analysis and resume_analysis.extracted_json:
                resume_data = json.loads(resume_analysis.extracted_json)
                match_score = calculate_match_score(
                    resume_data=resume_data,
                    job_description=next_job.description_text or '',
                    job_requirements=next_job.requirements or ''
                )
        except Exception as e:
            print(f"Error calculating match score: {e}")
            match_score = None
        
        return jsonify({
            'jobId': next_job.id,
            'title': next_job.title,
            'company': next_job.company.company_name,
            'location': next_job.location,
            'description': next_job.description_text,
            'jobType': next_job.job_type,
            'salaryRange': next_job.salary_range,
            'applyUrl': next_job.apply_url,
            'matchScore': match_score
        })
    else:
        return jsonify({'error': 'No more jobs available'}), 404

@app.route('/api/swipe', methods=['POST'])
@jwt_required
def swipe():
    """Record a user's swipe on a job (JWT-only)"""
    user = getattr(g, 'jwt_user', None)
    if not user or user.user_type != 'jobseeker':
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    job_id = data.get('jobId')
    is_like = data.get('isLike')
    
    if not job_id:
        return jsonify({'error': 'Missing jobId'}), 400
    
    # Check if match already exists
    existing_match = Match.query.filter_by(user_id=user.id, job_id=job_id).first()
    
    if not existing_match:
        new_match = Match(
            user_id=user.id,
            job_id=job_id,
            is_match=is_like
        )
        # Compute and persist match_score at creation time if possible
        try:
            resume_analysis = ResumeAnalysis.query.filter_by(user_id=user.id).first()
            if resume_analysis and resume_analysis.extracted_json:
                resume_data = json.loads(resume_analysis.extracted_json)
                job_obj = Job.query.get(job_id)
                if job_obj:
                    computed_score = calculate_match_score(
                        resume_data=resume_data,
                        job_description=job_obj.description_text or '',
                        job_requirements=job_obj.requirements or ''
                    )
                    new_match.match_score = int(computed_score) if computed_score is not None else None
        except Exception as e:
            print(f"Error computing match score on swipe creation: {e}")

        db.session.add(new_match)
        db.session.commit()
        return jsonify({'status': 'success', 'action': 'created', 'match_score': new_match.match_score}), 200
    else:
        return jsonify({'status': 'success', 'action': 'already_exists'})


@app.route('/api/company/delete-job/<int:job_id>', methods=['DELETE'])
@jwt_required
def delete_job(job_id):
    """Delete a job posting"""
    user = _get_request_user()
    if not user or user.user_type != 'company':
        return jsonify({'error': 'Unauthorized'}), 401
    
    job = Job.query.get_or_404(job_id)
    
    # Verify this company owns the job
    if job.company_id != user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    db.session.delete(job)
    db.session.commit()
    
    return jsonify({'status': 'success', 'message': 'Job deleted successfully'})


@app.route('/api/company/update-job/<int:job_id>', methods=['PUT'])
@jwt_required
def update_job(job_id):
    """Update a job posting"""
    user = _get_request_user()
    if not user or user.user_type != 'company':
        return jsonify({'error': 'Unauthorized'}), 401
    
    job = Job.query.get_or_404(job_id)
    
    # Verify this company owns the job
    if job.company_id != user.id:
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


@app.route('/api/company/recompute-match-score', methods=['POST'])
@jwt_required
def api_company_recompute_match_score():
    """Recompute and persist match_score for a single match (company-only)"""
    user = _get_request_user()
    if not user or user.user_type != 'company':
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    match_id = data.get('match_id')
    if not match_id:
        return jsonify({'error': 'Missing match_id'}), 400

    match = Match.query.get(match_id)
    if not match:
        return jsonify({'error': 'Match not found'}), 404

    # Verify the company owns the job related to this match
    if match.job and match.job.company_id != user.id:
        return jsonify({'error': 'Unauthorized to modify this match'}), 403

    try:
        resume = ResumeAnalysis.query.filter_by(user_id=match.user_id).first()
        if not resume or not resume.extracted_json:
            return jsonify({'error': 'No resume available for this user'}), 404

        resume_data = json.loads(resume.extracted_json)
        job_obj = Job.query.get(match.job_id)
        if not job_obj:
            return jsonify({'error': 'Job not found'}), 404

        new_score = calculate_match_score(resume_data=resume_data, job_description=job_obj.description_text or '', job_requirements=job_obj.requirements or '')
        match.match_score = int(new_score) if new_score is not None else None
        db.session.add(match)
        db.session.commit()

        return jsonify({'status': 'success', 'match_id': match_id, 'match_score': match.match_score}), 200
    except Exception as e:
        print(f"Error recomputing match score: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/company/recompute-job-match-scores', methods=['POST'])
@jwt_required
def api_company_recompute_job_match_scores():
    """Bulk recompute match_scores for a company job; returns count of updated matches"""
    user = _get_request_user()
    if not user or user.user_type != 'company':
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json() or {}
    job_id = data.get('job_id')
    if not job_id:
        return jsonify({'error': 'Missing job_id'}), 400

    job = Job.query.get(job_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    if job.company_id != user.id:
        return jsonify({'error': 'Unauthorized - job not owned by company'}), 403

    matches = Match.query.filter_by(job_id=job_id).all()
    updated = 0
    for m in matches:
        try:
            resume = ResumeAnalysis.query.filter_by(user_id=m.user_id).first()
            if resume and resume.extracted_json:
                resume_data = json.loads(resume.extracted_json)
                rescore = calculate_match_score(resume_data=resume_data, job_description=job.description_text or '', job_requirements=job.requirements or '')
                m.match_score = int(rescore) if rescore is not None else None
                db.session.add(m)
                updated += 1
        except Exception as e:
            print(f"Error recomputing for match {m.id}: {e}")
    db.session.commit()
    return jsonify({'status': 'success', 'job_id': job_id, 'updated': updated}), 200


# --- NEW API ENDPOINTS FOR ENHANCED FEATURES ---

@app.route('/api/company/update-application-status', methods=['PUT'])
@jwt_required
def update_application_status():
    """Company can accept or reject an application"""
    user = _get_request_user()
    if not user or user.user_type != 'company':
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    match_id = data.get('match_id')
    new_status = data.get('status')  # 'accepted' or 'rejected'
    
    if not match_id:
        return jsonify({'error': 'Match ID required'}), 400
    
    match = Match.query.get_or_404(match_id)
    job = Job.query.get_or_404(match.job_id)
    
    # Verify this company owns the job
    if job.company_id != user.id:
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
@jwt_required
def close_applications():
    """Company can close applications for a job"""
    user = _get_request_user()
    if not user or user.user_type != 'company':
        return jsonify({'error': 'Unauthorized'}), 401
    
    data = request.get_json()
    job_id = data.get('job_id')
    should_close = data.get('close', True)
    
    if not job_id:
        return jsonify({'error': 'Job ID required'}), 400
    
    job = Job.query.get_or_404(job_id)
    
    # Verify this company owns the job
    if job.company_id != user.id:
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


@app.route('/api/jwt/hide-match/<int:match_id>', methods=['PUT'])
@jwt_required
def jwt_hide_match(match_id):
    """JWT-compatible endpoint for hiding a match"""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    match = Match.query.get_or_404(match_id)
    if match.user_id != user.id:
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


@app.route('/api/jwt/unhide-match/<int:match_id>', methods=['PUT'])
@jwt_required
def jwt_unhide_match(match_id):
    """JWT-compatible endpoint for unhiding a match"""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    match = Match.query.get_or_404(match_id)
    if match.user_id != user.id:
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


@app.route('/api/jwt/reapply/<int:job_id>', methods=['POST'])
@jwt_required
def jwt_reapply_to_job(job_id):
    """JWT-compatible endpoint for re-applying to a skipped job"""
    user = getattr(g, 'jwt_user', None)
    if not user:
        return jsonify({'error': 'Unauthorized'}), 401
    match = Match.query.filter_by(user_id=user.id, job_id=job_id).first()
    if not match:
        return jsonify({'error': 'Match not found'}), 404
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


# ============================================
# LATEX RESUME BUILDER ENDPOINTS
# ============================================

@app.route('/api/latex-resumes', methods=['GET'])
@jwt_required
def get_latex_resumes():
    """Get all LaTeX resumes for the current user"""
    user = _get_request_user()
    
    resumes = LatexResume.query.filter_by(user_id=user.id).order_by(LatexResume.updated_at.desc()).all()
    
    return jsonify([{
        'id': resume.id,
        'title': resume.title,
        'template_name': resume.template_name,
        'is_active': resume.is_active,
        'created_at': resume.created_at.isoformat(),
        'updated_at': resume.updated_at.isoformat()
    } for resume in resumes])


@app.route('/api/latex-resumes/<int:resume_id>', methods=['GET'])
@jwt_required
def get_latex_resume(resume_id):
    """Get a specific LaTeX resume"""
    user = _get_request_user()
    
    resume = LatexResume.query.filter_by(id=resume_id, user_id=user.id).first()
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    return jsonify({
        'id': resume.id,
        'title': resume.title,
        'latex_code': resume.latex_code,
        'compiled_pdf_url': resume.compiled_pdf_url,
        'template_name': resume.template_name,
        'is_active': resume.is_active,
        'created_at': resume.created_at.isoformat(),
        'updated_at': resume.updated_at.isoformat()
    })


@app.route('/api/latex-resumes', methods=['POST'])
@jwt_required
def create_latex_resume():
    """Create a new LaTeX resume"""
    user = _get_request_user()
    data = request.get_json()
    
    title = data.get('title', 'Untitled Resume')
    template_name = data.get('template_name', 'default')
    
    # Use the default template
    latex_code = DEFAULT_TEMPLATE
    
    new_resume = LatexResume(
        user_id=user.id,
        title=title,
        latex_code=latex_code,
        template_name=template_name,
        is_active=False
    )
    
    db.session.add(new_resume)
    db.session.commit()
    
    return jsonify({
        'id': new_resume.id,
        'title': new_resume.title,
        'latex_code': new_resume.latex_code,
        'template_name': new_resume.template_name,
        'is_active': new_resume.is_active,
        'created_at': new_resume.created_at.isoformat(),
        'updated_at': new_resume.updated_at.isoformat()
    }), 201


@app.route('/api/latex-resumes/<int:resume_id>', methods=['PUT'])
@jwt_required
def update_latex_resume(resume_id):
    """Update a LaTeX resume"""
    user = _get_request_user()
    data = request.get_json()
    
    resume = LatexResume.query.filter_by(id=resume_id, user_id=user.id).first()
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    # Update fields if provided
    if 'title' in data:
        resume.title = data['title']
    if 'latex_code' in data:
        resume.latex_code = data['latex_code']
    if 'compiled_pdf_url' in data:
        resume.compiled_pdf_url = data['compiled_pdf_url']
    
    resume.updated_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({
        'success': True,
        'id': resume.id,
        'title': resume.title,
        'updated_at': resume.updated_at.isoformat()
    })


@app.route('/api/latex-resumes/<int:resume_id>', methods=['DELETE'])
@jwt_required
def delete_latex_resume(resume_id):
    """Delete a LaTeX resume"""
    user = _get_request_user()
    
    resume = LatexResume.query.filter_by(id=resume_id, user_id=user.id).first()
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    db.session.delete(resume)
    db.session.commit()
    
    return jsonify({'success': True})


@app.route('/api/latex-resumes/<int:resume_id>/set-active', methods=['POST'])
@jwt_required
def set_active_latex_resume(resume_id):
    """Set a resume as the active one"""
    user = _get_request_user()
    
    resume = LatexResume.query.filter_by(id=resume_id, user_id=user.id).first()
    if not resume:
        return jsonify({'error': 'Resume not found'}), 404
    
    # Deactivate all other resumes
    LatexResume.query.filter_by(user_id=user.id).update({'is_active': False})
    
    # Activate this resume
    resume.is_active = True
    db.session.commit()
    
    return jsonify({'success': True})


# ==================== CHAT API ENDPOINTS ====================

@app.route('/api/chat/conversations', methods=['GET'])
@jwt_required
def get_conversations():
    """Get all conversations for the logged-in user"""
    user_id = g.user_id
    user_type = g.user_type
    
    if user_type == 'jobseeker':
        conversations = Conversation.query.filter_by(user_id=user_id).order_by(Conversation.last_message_at.desc()).all()
    elif user_type == 'company':
        conversations = Conversation.query.filter_by(company_id=user_id).order_by(Conversation.last_message_at.desc()).all()
    else:
        return jsonify({'error': 'Invalid user type'}), 400
    
    result = []
    for conv in conversations:
        # Get the match details
        match = Match.query.get(conv.match_id)
        job = Job.query.get(match.job_id) if match else None
        
        # Get last message
        last_message = Message.query.filter_by(conversation_id=conv.id).order_by(Message.created_at.desc()).first()
        
        # Get the other party's name
        if user_type == 'jobseeker':
            company = Company.query.get(conv.company_id)
            other_party_name = company.company_name if company else "Unknown Company"
        else:
            user = User.query.get(conv.user_id)
            other_party_name = user.full_name if user else "Unknown User"
        
        result.append({
            'id': conv.id,
            'match_id': conv.match_id,
            'job_title': job.title if job else "Unknown Job",
            'other_party_name': other_party_name,
            'last_message': last_message.content if last_message else None,
                'last_message_at': (last_message.created_at.isoformat() + 'Z') if last_message else conv.created_at.isoformat() + 'Z',
                'created_at': conv.created_at.isoformat() + 'Z'
        })
    
    return jsonify(result), 200


@app.route('/api/chat/conversations/<int:conversation_id>/messages', methods=['GET'])
@jwt_required
def get_messages(conversation_id):
    """Get all messages for a specific conversation"""
    user_id = g.user_id
    user_type = g.user_type
    
    # Verify the user has access to this conversation
    conversation = Conversation.query.get_or_404(conversation_id)
    
    if user_type == 'jobseeker' and conversation.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    elif user_type == 'company' and conversation.company_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Get messages with pagination
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)
    
    messages_query = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.created_at.asc())
    messages = messages_query.paginate(page=page, per_page=per_page, error_out=False)
    
    result = [{
        'id': msg.id,
        'sender_type': msg.sender_type,
        'sender_id': msg.sender_id,
        'content': msg.content,
        'created_at': msg.created_at.isoformat() + 'Z',
        'is_own_message': (msg.sender_type == user_type and msg.sender_id == user_id)
    } for msg in messages.items]
    
    return jsonify({
        'messages': result,
        'total': messages.total,
        'page': messages.page,
        'pages': messages.pages
    }), 200


@app.route('/api/chat/conversations', methods=['POST'])
@jwt_required
def create_conversation():
    """Create a new conversation for an accepted match"""
    user_id = g.user_id
    user_type = g.user_type
    
    data = request.get_json() or {}
    match_id = data.get('match_id')
    
    if not match_id:
        return jsonify({'error': 'Missing match_id'}), 400
    
    # Get the match
    match = Match.query.get(match_id)
    if not match:
        return jsonify({'error': 'Match not found'}), 404
    
    # Verify the match is accepted
    if match.application_status != 'accepted':
        return jsonify({'error': 'Can only chat with accepted applications'}), 403
    
    # Verify the user has access to this match
    job = Job.query.get(match.job_id)
    if user_type == 'jobseeker' and match.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    elif user_type == 'company' and job.company_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Check if conversation already exists
    existing = Conversation.query.filter_by(match_id=match_id).first()
    if existing:
        return jsonify({
            'id': existing.id,
            'match_id': existing.match_id,
            'created_at': existing.created_at.isoformat() + 'Z'
        }), 200
    
    # Create new conversation
    conversation = Conversation(
        match_id=match_id,
        company_id=job.company_id,
        user_id=match.user_id
    )
    
    db.session.add(conversation)
    db.session.commit()
    
    return jsonify({
        'id': conversation.id,
        'match_id': conversation.match_id,
        'created_at': conversation.created_at.isoformat() + 'Z'
    }), 201


# ==================== WEBSOCKET EVENTS ====================

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    print(f'Client connected: {request.sid}')


@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    print(f'Client disconnected: {request.sid}')


@socketio.on('join')
def handle_join(data):
    """Join a conversation room"""
    conversation_id = data.get('conversation_id')
    token = data.get('token')
    
    if not conversation_id or not token:
        emit('error', {'message': 'Missing conversation_id or token'})
        return
    
    # Verify JWT token using shared helper (keeps behavior consistent)
    payload = decode_jwt_token(token)
    if not payload:
        emit('error', {'message': 'Invalid token'})
        return
    user_id = payload.get('user_id')
    user_type = payload.get('user_type')
    
    # Verify access to conversation
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        emit('error', {'message': 'Conversation not found'})
        return
    
    if user_type == 'jobseeker' and conversation.user_id != user_id:
        emit('error', {'message': 'Unauthorized'})
        return
    elif user_type == 'company' and conversation.company_id != user_id:
        emit('error', {'message': 'Unauthorized'})
        return
    
    # Join the room
    room = f'conversation_{conversation_id}'
    join_room(room)
    print(f'User {user_id} ({user_type}) joined room {room}')
    emit('joined', {'conversation_id': conversation_id})


@socketio.on('leave')
def handle_leave(data):
    """Leave a conversation room"""
    conversation_id = data.get('conversation_id')
    
    if not conversation_id:
        return
    
    room = f'conversation_{conversation_id}'
    leave_room(room)
    print(f'Client {request.sid} left room {room}')


@socketio.on('send_message')
def handle_send_message(data):
    """Handle sending a new message"""
    conversation_id = data.get('conversation_id')
    content = data.get('content')
    token = data.get('token')
    
    if not conversation_id or not content or not token:
        emit('error', {'message': 'Missing required fields'})
        return
    
    # Verify JWT token using shared helper (keeps behavior consistent)
    payload = decode_jwt_token(token)
    if not payload:
        emit('error', {'message': 'Invalid token'})
        return
    user_id = payload.get('user_id')
    user_type = payload.get('user_type')
    
    # Verify access to conversation
    conversation = Conversation.query.get(conversation_id)
    if not conversation:
        emit('error', {'message': 'Conversation not found'})
        return
    
    if user_type == 'jobseeker' and conversation.user_id != user_id:
        emit('error', {'message': 'Unauthorized'})
        return
    elif user_type == 'company' and conversation.company_id != user_id:
        emit('error', {'message': 'Unauthorized'})
        return
    
    # Create and save the message
    message = Message(
        conversation_id=conversation_id,
        sender_type=user_type,
        sender_id=user_id,
        content=content
    )
    
    db.session.add(message)
    
    # Update conversation last_message_at
    conversation.last_message_at = datetime.utcnow()
    
    db.session.commit()
    
    # Broadcast to all users in the room
    room = f'conversation_{conversation_id}'
    emit('new_message', {
        'id': message.id,
        'conversation_id': conversation_id,
        'sender_type': message.sender_type,
        'sender_id': message.sender_id,
        'content': message.content,
        'created_at': message.created_at.isoformat() + 'Z'
    }, room=room)


# --- MAIN EXECUTION ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print("Database tables created successfully!")
    socketio.run(app, debug=True, port=5000)
