# 💼 Synapse - Tinder for Jobs

A dual-portal job matching platform that connects job seekers with companies through a Tinder-style interface. Built with Flask, SQLAlchemy, and vanilla JavaScript.

## 🌟 Features

### For Job Seekers
- **Tinder-Style Job Discovery**: Swipe right to like, left to pass on job opportunities
- **Resume Analysis**: Upload your resume and get AI-powered insights and improvement suggestions
- **Profile Management**: Create and edit your professional profile summary
- **Matches Dashboard**: View all jobs you've liked and apply directly
- **Smart Matching**: Get personalized job recommendations based on your profile

### For Companies
- **Company Dashboard**: Overview of job postings and applicant statistics
- **Job Posting**: Create and manage job listings with detailed descriptions
- **Applicant Management**: View profiles of candidates who liked your jobs
- **Job Management**: Edit or delete job postings as needed
- **Real-time Analytics**: Track engagement on your job postings

## 🏗️ Architecture

- **Backend**: Python Flask with Flask-SQLAlchemy ORM
- **Database**: SQLite (easily upgradeable to PostgreSQL)
- **Authentication**: Flask-Login with Bcrypt password hashing
- **Frontend**: Pure HTML, CSS, and JavaScript

## 📋 Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Git

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
cd synapse
```

### 2. Create Virtual Environment

```bash
# On Windows
python -m venv venv
venv\Scripts\activate

# On macOS/Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env and add your configuration
# At minimum, change the SECRET_KEY to a random string
```

**Important**: If you want resume analysis to work, you need to add a Google Gemini API key:
1. Get your API key from: https://makersuite.google.com/app/apikey
2. Add it to `.env`: `GOOGLE_API_KEY=your-key-here`

### 5. Initialize the Database

```bash
python app.py
```

This will create the `database.db` file with all required tables. Press `Ctrl+C` to stop the server after tables are created.

### 6. Seed the Database (Optional but Recommended)

```bash
python seed_jobs.py
```

This will populate the database with:
- 3 sample companies
- 8 sample job postings
- 2 sample job seekers

## 🎮 Running the Application

```bash
source venv/Scripts/activate && python app.py
```

The application will be available at: http://localhost:5000

## 🔑 Test Credentials

After running the seed script, you can log in with these credentials:

### Companies
```
Email: hr@techcorp.com
Password: company123

Email: careers@innovate.com
Password: company123

Email: jobs@datainsights.com
Password: company123
```

### Job Seekers
```
Email: john.doe@example.com
Password: user123

Email: jane.smith@example.com
Password: user123
```

## 📱 Usage Guide

### For Job Seekers

1. **Register**: Go to the Job Seeker registration page
2. **Upload Resume**: Navigate to your profile and upload your resume (PDF, DOC, DOCX, or TXT)
3. **Review Analysis**: Check your resume score and improvement suggestions
4. **Edit Profile Summary**: Customize your profile summary that companies will see
5. **Discover Jobs**: Go to the Discover page and start swiping on jobs
   - Swipe right (or click ✅) to like a job
   - Swipe left (or click ❌) to pass
   - Use keyboard arrows: Right arrow = Like, Left arrow = Pass
6. **View Matches**: Check your Matches page to see all liked jobs and apply

### For Companies

1. **Register**: Go to the Company registration page
2. **Post Jobs**: Click "Post New Job" and fill in the job details
3. **View Dashboard**: Check your statistics and recent activity
4. **Manage Jobs**: Edit or delete your job postings from "My Jobs"
5. **View Applicants**: See all candidates who liked your jobs, along with their profiles
6. **Contact Candidates**: Use the email links to reach out to interested candidates

## 🛠️ Project Structure

```
synapse/
├── app.py                 # Main Flask application
├── models.py              # Database models
├── seed_jobs.py           # Database seeding script
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── .gitignore            # Git ignore file
├── database.db           # SQLite database (created after first run)
├── core_logic/           # Resume analysis logic (from resume-analyzer)
│   ├── analyzer.py
│   ├── extractor.py
│   └── improver.py
├── templates/            # HTML templates
│   ├── base.html
│   ├── login.html
│   ├── register_jobseeker.html
│   ├── register_company.html
│   ├── discover.html
│   ├── profile.html
│   ├── matches.html
│   └── company/
│       ├── dashboard.html
│       ├── post_job.html
│       ├── my_jobs.html
│       └── applicants.html
├── static/               # Static files
│   ├── style.css
│   ├── app.js           # Job seeker JavaScript
│   └── company.js       # Company portal JavaScript
└── uploads/             # Resume uploads (gitignored)
```

## 🔧 Configuration

### Database

By default, Synapse uses SQLite. To use PostgreSQL:

1. Install psycopg2: `pip install psycopg2-binary`
2. Update `app.py`:
   ```python
   app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://user:password@localhost/synapse'
   ```

### File Uploads

Maximum upload size is set to 16MB by default. To change:

```python
# In app.py
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # 32MB
```

Allowed file types: PDF, DOC, DOCX, TXT

## 🐛 Troubleshooting

### Issue: Resume analysis not working
**Solution**: Make sure you've added your Google Gemini API key to the `.env` file.

### Issue: Database errors
**Solution**: Delete `database.db` and run `python app.py` again to recreate it.

### Issue: Import errors
**Solution**: Make sure you've activated the virtual environment and installed all requirements.

### Issue: Port 5000 already in use
**Solution**: Change the port in `app.py`:
```python
app.run(debug=True, port=5001)  # Use a different port
```

## 🚀 Deployment

### Production Checklist

1. **Change SECRET_KEY**: Generate a secure random key
2. **Disable Debug Mode**: Set `FLASK_DEBUG=False` in `.env`
3. **Use Production Database**: Switch to PostgreSQL or MySQL
4. **Set Up HTTPS**: Use a reverse proxy like Nginx
5. **Configure WSGI**: Use Gunicorn or uWSGI
6. **Set Up Email**: Configure SMTP for notifications (optional)

### Example Gunicorn Command

```bash
gunicorn -w 4 -b 0.0.0.0:8000 app:app
```

## 📝 API Endpoints

### Job Seeker Endpoints
- `GET /api/get-next-job` - Fetch the next unswiped job
- `POST /api/swipe` - Record a like/dislike on a job

### Company Endpoints
- `DELETE /api/company/delete-job/<id>` - Delete a job posting
- `PUT /api/company/update-job/<id>` - Update a job posting

## 🤝 Contributing

This is a collaborative project. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- Original resume-analyzer logic provided by your collaborator
- Full-stack implementation and dual-portal design

## 🙏 Acknowledgments

- Resume analysis powered by Google Gemini AI
- UI inspired by modern job platforms and dating apps
- Built with ❤️ using Flask and vanilla JavaScript

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Contact the development team

---

**Happy Job Matching! 🎉**
