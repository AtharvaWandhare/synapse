from app import app, db
from models import CareerRoadmap
import json

with app.app_context():
    r = CareerRoadmap.query.order_by(CareerRoadmap.created_at.desc()).limit(20).all()
    for rm in r:
        print('--- ROADMAP ID:', rm.id)
        print('Target Job:', rm.target_job)
        print('Created:', rm.created_at)
        try:
            roadmap = json.loads(rm.roadmap_json)
            print('Phases:', len(roadmap))
            for i, step in enumerate(roadmap):
                print(f' Phase {i+1}:')
                title = step.get('title') or (f'Phase {step.get("phase")}')
                print('  Title:', title)
                desc = step.get('description') or step.get('summary') or ''
                if desc:
                    print('  Desc:', desc[:200])
                if 'skills' in step and step['skills']:
                    print('  Skills:', ', '.join(step['skills']))
                if 'steps' in step and step['steps']:
                    print('  Steps Names:', ', '.join([st.get('name') for st in step['steps']]))
        except Exception as e:
            print('Failed to parse roadmap JSON:', e)

    if not r:
        print('No roadmaps found')
