import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

def extract_resume_data(resume_text: str) -> dict | None:
    """
    Uses the FAST 'gemini-flash-latest' model for simple data extraction.
    """
    try:
        load_dotenv()
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found or is empty in your .env file.")
        genai.configure(api_key=api_key) # type: ignore
    except Exception as e:
        print(f"🛑 CONFIGURATION ERROR: {e}")
        return None

    # Use the latest, fastest Flash model for this task
    model = genai.GenerativeModel('gemini-flash-latest')
    
    # A comprehensive prompt to extract all resume data
    prompt = f"""
    You are an expert resume parser. Extract ALL content from the following resume text.
    
    Return ONLY a valid JSON object with the following exact keys:
    {{
      "personal_details": {{"name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": ""}},
      "professional_summary": "",
      "skills": [],
      "work_experience": [{{"position": "", "company": "", "duration": "", "location": "", "responsibilities": []}}],
      "education": [{{"degree": "", "institution": "", "year": "", "gpa": "", "location": ""}}],
      "certifications": [{{"name": "", "issuer": "", "date": "", "credential_id": ""}}],
      "projects": [{{"title": "", "description": "", "technologies": [], "link": ""}}],
      "achievements": [],
      "languages": [],
      "volunteering": [],
      "publications": []
    }}

    Extract ALL information available. If a field is not found, use null for strings, [] for arrays, {{}} for objects.

    Important: Return ONLY the JSON object, no markdown formatting, no code blocks, no explanations.

    Resume Text:
    ---
    {resume_text}
    ---
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            # Extract JSON from code block
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        print(f"🛑 JSON parsing error: {e}")
        print(f"Response text: {response.text[:500]}")  # Print first 500 chars for debugging
        return None
    except Exception as e:
        print(f"🛑 An unexpected error occurred during extraction: {e}")
        return None

