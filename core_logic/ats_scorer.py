import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

def calculate_ats_score(extracted_data: dict, target_job_role: str = None) -> dict | None:
    """
    Calculate ATS score for a resume based on extracted data.
    If target_job_role is not provided, it will be extracted from the resume.
    Returns: {
        'ats_score': int (0-100),
        'target_job_role': str,
        'breakdown': {
            'keywords': int,
            'formatting': int,
            'experience': int,
            'skills': int,
            'education': int
        },
        'recommendations': [str]
    }
    """
    try:
        load_dotenv()
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")
        genai.configure(api_key=api_key)
    except Exception as e:
        print(f"Configuration error: {e}")
        return None

    model = genai.GenerativeModel('gemini-pro-latest')
    resume_json_string = json.dumps(extracted_data, indent=2)
    
    # If target job role not provided, ask AI to extract it
    if not target_job_role:
        extract_prompt = f"""
        Based on this resume data, what is the candidate's target job role?
        Return ONLY the job role name (e.g., "Software Engineer", "Data Scientist", "Product Manager").
        
        Resume Data:
        {resume_json_string}
        """
        try:
            response = model.generate_content(extract_prompt)
            target_job_role = response.text.strip().replace('"', '').replace("'", "")
        except:
            target_job_role = "General Professional"

    prompt = f"""
    You are an ATS (Applicant Tracking System) expert. Analyze this resume for the role: '{target_job_role}'.
    
    Calculate an ATS score (0-100) and provide a detailed breakdown.
    
    Return ONLY a valid JSON object with this exact structure:
    {{
      "ats_score": 85,
      "target_job_role": "{target_job_role}",
      "breakdown": {{
        "keywords": 80,
        "formatting": 90,
        "experience": 85,
        "skills": 88,
        "education": 82
      }},
      "recommendations": [
        "Add more industry-specific keywords",
        "Quantify achievements with metrics",
        "Include relevant certifications"
      ]
    }}
    
    Resume Data:
    {resume_json_string}
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Clean markdown formatting
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        result = json.loads(response_text)
        result['target_job_role'] = target_job_role  # Ensure it's set
        return result
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        print(f"Response: {response.text[:500]}")
        return None
    except Exception as e:
        print(f"Error during ATS scoring: {e}")
        return None


def get_profile_enhancement(extracted_data: dict, resume_text: str) -> dict | None:
    """
    Get detailed profile enhancement recommendations.
    Returns structured suggestions for improving the resume/profile.
    """
    try:
        load_dotenv()
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found")
        genai.configure(api_key=api_key)
    except Exception as e:
        print(f"Configuration error: {e}")
        return None

    model = genai.GenerativeModel('gemini-pro-latest')
    resume_json_string = json.dumps(extracted_data, indent=2)

    prompt = f"""
    You are a professional resume consultant. Provide detailed enhancement recommendations.
    
    Return ONLY a valid JSON object with this structure:
    {{
      "overall_rating": 7.5,
      "key_strengths": ["Strength 1", "Strength 2", "Strength 3"],
      "critical_improvements": [
        {{
          "category": "Professional Summary",
          "current_issue": "Generic summary without impact",
          "recommendation": "Specific actionable advice",
          "example": "Rewritten example text"
        }}
      ],
      "content_gaps": [
        {{
          "missing_element": "Quantified achievements",
          "importance": "High",
          "how_to_add": "Add metrics and percentages to each role"
        }}
      ],
      "keyword_optimization": {{
        "missing_keywords": ["keyword1", "keyword2"],
        "overused_keywords": ["keyword3"],
        "recommended_additions": ["keyword4", "keyword5"]
      }},
      "formatting_tips": ["Tip 1", "Tip 2", "Tip 3"]
    }}
    
    Resume Data:
    {resume_json_string}
    
    Resume Text:
    {resume_text[:2000]}
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        print(f"JSON parsing error: {e}")
        return None
    except Exception as e:
        print(f"Error during enhancement generation: {e}")
        return None
