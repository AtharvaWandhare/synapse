import os
import json
import google.generativeai as genai
from dotenv import load_dotenv

def get_resume_feedback(extracted_data: dict, target_job_profile: str) -> dict | None:
    """
    Uses the POWERFUL 'gemini-pro-latest' model for deep analysis and feedback.
    Takes existing extracted data and a target job as input.
    """
    try:
        load_dotenv()
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found or is empty in your .env file.")
        genai.configure(api_key=api_key)
    except Exception as e:
        print(f"Configuration error: {e}")
        return None

    model = genai.GenerativeModel('gemini-pro-latest')
    resume_json_string = json.dumps(extracted_data, indent=2)

    prompt = f"""
    You are an expert career coach. Analyze the candidate's extracted resume data, provided as a JSON object,
    in the context of the target job profile: '{target_job_profile}'.

    Return ONLY a valid JSON object with the following exact structure:
    {{
      "resume_score": 85,
      "main_feedback": "A single, concise sentence summarizing the most important area for improvement.",
      "strengths": ["Strength 1", "Strength 2", "Strength 3"],
      "top_3_improvements": [
        {{
          "area": "Professional Summary",
          "suggestion": "Brief, actionable suggestion.",
          "example_rewrite": "Rewritten summary."
        }},
        {{
          "area": "Action Verbs",
          "suggestion": "Why stronger verbs are needed.",
          "examples": {{"weak_verbs": ["managed", "worked"], "stronger_verbs": ["orchestrated", "engineered"]}}
        }},
        {{
          "area": "Missing Keywords",
          "suggestion": "Why adding keywords is important.",
          "keywords_to_add": ["keyword1", "keyword2", "keyword3"]
        }}
      ]
    }}

    Important: Return ONLY the JSON object, no markdown, no code blocks, no explanations.

    Candidate's Extracted Resume Data:
    {resume_json_string}
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
        print(f"Response: {response.text[:500]}")
        return None
    except Exception as e:
        print(f"Error during feedback generation: {e}")
        return None


def get_career_roadmap(extracted_data: dict, target_job_profile: str) -> list | None:
    """
    Uses Gemini Pro to generate a JSON-based career roadmap.
    """
    try:
        load_dotenv()
        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found or is empty in your .env file.")
        genai.configure(api_key=api_key)
    except Exception as e:
        print(f"Configuration error: {e}")
        return None
    
    model = genai.GenerativeModel('gemini-pro-latest')
    current_skills = extracted_data.get('skills', [])

    prompt = f"""
    You are an expert career coach. Generate a career roadmap as a JSON array.

    Target job: '{target_job_profile}'
    Current skills: {current_skills}

    Return ONLY a valid JSON array like this example:
    [
      {{
        "phase": 1,
        "title": "Foundation Phase",
        "summary": "Build core programming skills.",
        "steps": [
          {{"name": "Python", "status": "completed"}},
          {{"name": "Git", "status": "to_learn"}}
        ]
      }},
      {{
        "phase": 2,
        "title": "Advanced Phase",
        "summary": "Learn advanced topics.",
        "steps": [
          {{"name": "Docker", "status": "to_learn"}},
          {{"name": "AWS", "status": "in_progress"}}
        ]
      }}
    ]

    Rules:
    - status MUST be "completed" if the skill is in current skills
    - Otherwise use "in_progress" or "to_learn"
    - Create 3-5 phases
    - Return ONLY the JSON array, no markdown, no code blocks

    Compare current skills with target job requirements carefully.
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
        print(f"JSON parsing error in roadmap: {e}")
        print(f"Response: {response.text[:500] if hasattr(response, 'text') else 'No response'}")
        return None
    except Exception as e:
        print(f"Error during roadmap generation: {e}")
        import traceback
        traceback.print_exc()
        return None
