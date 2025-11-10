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
        genai.configure(api_key=api_key) # type: ignore
    except Exception as e:
        print(f"🛑 CONFIGURATION ERROR: {e}")
        return None

    model = genai.GenerativeModel('gemini-pro-latest')
    
    # Convert the extracted data back to a string to feed to the Pro model
    resume_json_string = json.dumps(extracted_data, indent=2)

    prompt = f"""
    You are an expert career coach. Analyze the candidate's extracted resume data, provided as a JSON object,
    in the context of the target job profile: '{target_job_profile}'.

    Return ONLY a valid JSON object with the following exact structure:
    {{
      "resume_score": <An integer score from 0-100>,
      "main_feedback": "<A single, concise sentence summarizing the most important area for improvement.>",
      "strengths": ["<A list of 2-3 key strengths of the resume.>"],
      "top_3_improvements": [
        {{
          "area": "Professional Summary",
          "suggestion": "<A brief, actionable suggestion for the summary.>",
          "example_rewrite": "<A rewritten, impactful professional summary tailored for the role.>"
        }},
        {{
          "area": "Action Verbs / Keywords",
          "suggestion": "<Explain why stronger verbs are needed.>",
          "examples": {{"weak_verbs": ["<List of 2-3 weak verbs>"], "stronger_verbs": ["<List of 2-3 better alternatives>"]}}
        }},
        {{
          "area": "Missing Keywords",
          "suggestion": "<Explain why adding specific keywords is important for ATS.>",
          "keywords_to_add": ["<A short list of 3-5 of the MOST CRITICAL missing keywords>"]
        }}
      ]
    }}

    Important: Return ONLY the JSON object, no markdown formatting, no code blocks, no explanations.

    Candidate's Extracted Resume Data:
    ---
    {resume_json_string}
    ---
    """
    
    try:
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        
        # Remove markdown code blocks if present
        if response_text.startswith('```'):
            lines = response_text.split('\n')
            response_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else response_text
            response_text = response_text.replace('```json', '').replace('```', '').strip()
        
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        print(f"🛑 JSON parsing error: {e}")
        print(f"Response text: {response.text[:500]}")
        return None
    except Exception as e:
        print(f"🛑 An unexpected error occurred during the feedback API call: {e}")
        return None


# In core_logic/improver.py

def get_career_roadmap(extracted_data: dict, target_job_profile: str) -> list | None:
    """
    Uses Gemini Pro to generate a JSON-based career roadmap.
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
    
    model = genai.GenerativeModel('gemini-pro-latest')
    
    # We pass the user's skills so the AI knows what is "completed"
    current_skills = extracted_data.get('skills', [])

    prompt = f"""
    You are an expert career coach. Analyze the user's current skills and their target job role.
    Your task is to generate a step-by-step career roadmap as a JSON array.

    The user's target job is: '{target_job_profile}'
    The user's current skills are: {current_skills}

    The JSON array must be a list of "phase" objects. Each object must have:
    1.  `phase`: An integer (1, 2, 3...).
    2.  `title`: A short title for the phase (e.g., "Core ML Engineering").
    3.  `summary`: A one-sentence summary of this phase.
    4.  `steps`: An array of objects, each with:
        * `name`: The name of the skill or topic (e.g., "Docker").
        * `status`: A string. It MUST be "completed" if the skill is in the user's current skill list. It MUST be "in_progress" or "to_learn" if it's not.

    Carefully compare the user's current skills with the skills needed for the target job to decide the status for each step.
    Create 3-5 logical phases, starting from their current skills and ending at their target job.
    """
    
    try:
        response = model.generate_content(prompt)
        # The response.text will be a string, which we parse into a Python list
        return json.loads(response.text)
    except Exception as e:
        print(f"🛑 An unexpected error occurred during roadmap generation: {e}")
        return None