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


def get_career_roadmap(extracted_data: dict, target_job_profile: str) -> dict | None:
    """
    Uses Gemini Pro to generate a flowchart-style career roadmap.
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
    You are an expert career coach. Generate a visual flowchart-style career roadmap as a JSON object.

    Target job: '{target_job_profile}'
    Current skills: {current_skills}

    Create a roadmap with parallel learning tracks (like Frontend, Backend, DevOps) connected by checkpoints.

    Return ONLY a valid JSON object like this example:
    {{
      "title": "{target_job_profile}",
      "description": "Target audience description and prerequisites",
      "tracks": [
        {{
          "id": "frontend",
          "name": "Frontend",
          "color": "#fbbf24",
          "nodes": [
            {{
              "id": "html",
              "label": "HTML",
              "type": "skill",
              "status": "completed",
              "description": "Learn HTML basics and semantic markup"
            }},
            {{
              "id": "css",
              "label": "CSS",
              "type": "skill",
              "status": "to_learn",
              "description": "Master styling and responsive design"
            }}
          ]
        }},
        {{
          "id": "backend",
          "name": "Backend",
          "color": "#3b82f6",
          "nodes": [
            {{
              "id": "nodejs",
              "label": "Node.js",
              "type": "skill",
              "status": "to_learn",
              "description": "Backend JavaScript runtime"
            }}
          ]
        }}
      ],
      "checkpoints": [
        {{
          "id": "checkpoint-1",
          "label": "Checkpoint - Static Webpages",
          "type": "checkpoint",
          "description": "Build static HTML/CSS pages",
          "connectedNodes": ["html", "css"]
        }},
        {{
          "id": "checkpoint-2",
          "label": "Checkpoint - Interactive Apps",
          "type": "checkpoint",
          "description": "Create interactive web applications",
          "connectedNodes": ["css", "nodejs"]
        }}
      ],
      "connections": [
        {{"from": "html", "to": "css"}},
        {{"from": "css", "to": "checkpoint-1"}},
        {{"from": "checkpoint-1", "to": "nodejs"}},
        {{"from": "nodejs", "to": "checkpoint-2"}}
      ],
      "projects": [
        {{
          "id": "project-1",
          "label": "Portfolio Website",
          "type": "project",
          "description": "Build a personal portfolio",
          "linkedNodes": ["html", "css"]
        }}
      ]
    }}

    Rules:
    - Create 2-4 parallel tracks (Frontend/Backend/DevOps/etc based on target job)
    - Each track should have 3-6 skill nodes
    - Add 3-5 checkpoints that connect skills across tracks
    - status MUST be "completed" if skill is in current skills, otherwise "to_learn" or "in_progress"
    - Include 2-4 project ideas that tie skills together
    - Use colors: yellow (#fbbf24) for highlighted skills, gray (#6b7280) for checkpoints, blue (#3b82f6) for backend, green (#10b981) for misc
    - Return ONLY the JSON object, no markdown, no code blocks

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
