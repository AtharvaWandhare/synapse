"""
AI-Enhanced Job Matching using TF-IDF and Cosine Similarity
"""
import json
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np


def calculate_match_score(resume_data: dict, job_description: str, job_requirements: str) -> int:
    """
    Calculate AI-enhanced match score between resume and job using TF-IDF and cosine similarity.
    
    Args:
        resume_data: Dictionary containing extracted resume information (skills, experience, etc.)
        job_description: Job description text
        job_requirements: Job requirements text
    
    Returns:
        Match score between 0-100
    """
    try:
        # Extract resume text from structured data
        resume_text = _extract_resume_text(resume_data)
        
        # Combine job description and requirements
        job_text = f"{job_description} {job_requirements}".strip()
        
        if not resume_text or not job_text:
            return 0
        
        # Create TF-IDF vectorizer with optimized parameters for job matching
        vectorizer = TfidfVectorizer(
            max_features=500,  # Limit features for performance
            stop_words='english',  # Remove common words
            ngram_range=(1, 2),  # Include unigrams and bigrams
            min_df=1,  # Minimum document frequency
            lowercase=True,
            strip_accents='unicode'
        )
        
        # Vectorize both texts
        try:
            tfidf_matrix = vectorizer.fit_transform([resume_text, job_text])
        except ValueError:
            # Fallback if vectorization fails (e.g., empty vocabulary)
            return _fallback_keyword_match(resume_data, job_text)
        
        # Calculate cosine similarity
        similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
        
        # Convert to 0-100 scale
        base_score = int(similarity * 100)
        
        # Apply skill-based boost
        skill_boost = _calculate_skill_boost(resume_data, job_text)
        
        # Final score with boost (capped at 100)
        final_score = min(100, base_score + skill_boost)
        
        return final_score
        
    except Exception as e:
        print(f"Error calculating match score: {e}")
        # Fallback to simple keyword matching
        return _fallback_keyword_match(resume_data, f"{job_description} {job_requirements}")


def _extract_resume_text(resume_data: dict) -> str:
    """
    Extract and combine all relevant text from resume data structure.
    """
    text_parts = []
    
    # Handle different possible structures
    if isinstance(resume_data, dict):
        # Skills
        skills = resume_data.get('skills') or resume_data.get('skills_extracted') or resume_data.get('keywords') or []
        if isinstance(skills, list):
            text_parts.extend([str(s) for s in skills])
        
        # Experience
        experience = resume_data.get('experience') or resume_data.get('work_experience') or []
        if isinstance(experience, list):
            for exp in experience:
                if isinstance(exp, dict):
                    text_parts.append(exp.get('title', ''))
                    text_parts.append(exp.get('company', ''))
                    text_parts.append(exp.get('description', ''))
                elif isinstance(exp, str):
                    text_parts.append(exp)
        
        # Education
        education = resume_data.get('education') or []
        if isinstance(education, list):
            for edu in education:
                if isinstance(edu, dict):
                    text_parts.append(edu.get('degree', ''))
                    text_parts.append(edu.get('institution', ''))
                    text_parts.append(edu.get('field', ''))
                elif isinstance(edu, str):
                    text_parts.append(edu)
        
        # Projects
        projects = resume_data.get('projects') or []
        if isinstance(projects, list):
            for proj in projects:
                if isinstance(proj, dict):
                    text_parts.append(proj.get('name', ''))
                    text_parts.append(proj.get('description', ''))
                elif isinstance(proj, str):
                    text_parts.append(proj)
        
        # Summary/Objective
        summary = resume_data.get('summary') or resume_data.get('objective') or ''
        if summary:
            text_parts.append(str(summary))
        
        # Certifications
        certs = resume_data.get('certifications') or []
        if isinstance(certs, list):
            text_parts.extend([str(c) for c in certs])
    
    # Clean and join all parts
    clean_parts = [str(p).strip() for p in text_parts if p]
    return ' '.join(clean_parts)


def _calculate_skill_boost(resume_data: dict, job_text: str) -> int:
    """
    Calculate additional boost based on exact skill matches.
    Returns: 0-15 boost points
    """
    try:
        # Extract skills from resume
        skills = resume_data.get('skills') or resume_data.get('skills_extracted') or resume_data.get('keywords') or []
        if not isinstance(skills, list):
            return 0
        
        # Normalize skills and job text
        resume_skills = set([str(s).lower().strip() for s in skills if s])
        job_text_lower = job_text.lower()
        
        # Count exact skill matches
        matches = sum(1 for skill in resume_skills if skill in job_text_lower)
        
        if not resume_skills:
            return 0
        
        # Calculate boost (up to 15 points)
        match_ratio = matches / len(resume_skills)
        boost = int(match_ratio * 15)
        
        return boost
        
    except Exception:
        return 0


def _fallback_keyword_match(resume_data: dict, job_text: str) -> int:
    """
    Simple keyword-based matching as fallback.
    """
    try:
        import re
        
        # Extract skills from resume
        skills = resume_data.get('skills') or resume_data.get('skills_extracted') or resume_data.get('keywords') or []
        if not isinstance(skills, list):
            return 0
        
        resume_skills = [str(s).lower().strip() for s in skills if s]
        
        # Extract words from job text
        job_words = set([w.strip().lower() for w in re.findall(r"\b\w+\b", job_text)])
        
        if not resume_skills or not job_words:
            return 0
        
        # Calculate overlap
        overlap = sum(1 for skill in resume_skills if skill in job_words)
        score = int(min(100, (overlap / max(len(resume_skills), 1)) * 100))
        
        return score
        
    except Exception:
        return 0
