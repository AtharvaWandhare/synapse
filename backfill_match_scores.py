from app import app, db
from models import Match, ResumeAnalysis, Job
from core_logic.matcher import calculate_match_score
import json


with app.app_context():
    print("Starting backfill for match_score...")
    matches = Match.query.filter(Match.match_score == None).all()
    print(f"Found {len(matches)} matches with missing score")
    count = 0
    for m in matches:
        try:
            resume = ResumeAnalysis.query.filter_by(user_id=m.user_id).first()
            if resume and resume.extracted_json:
                resume_json = json.loads(resume.extracted_json)
                job = Job.query.get(m.job_id)
                if job:
                    score = calculate_match_score(resume_json, job.description_text or '', job.requirements or '')
                    if score is not None:
                        m.match_score = int(score)
                        db.session.add(m)
                        count += 1
        except Exception as e:
            print(f"Error calculating backfill for match {m.id}: {e}")

    db.session.commit()
    print(f"Backfilled {count} matches")
    print("Done")
