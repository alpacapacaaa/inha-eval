import json
import os

def extract():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_file = os.path.join(base_dir, 'data', 'syllabuses.json')
    out_file = os.path.join(base_dir, 'data', 'incomplete_courses.json')
    
    if not os.path.exists(data_file):
        print(f"Error: {data_file} not found.")
        return

    with open(data_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    incomplete = []
    for cid, info in data.items():
        # Check if incomplete
        overview = info.get('summary', {}).get('overview', '')
        weekly = info.get('weekly_plan', [])
        
        # Following the logic in syllabus_scraper.py:83
        if not overview or len(weekly) == 0:
            incomplete.append(cid)

    with open(out_file, 'w', encoding='utf-8') as f:
        json.dump(incomplete, f, ensure_ascii=False, indent=4)
    
    print(f"Found {len(incomplete)} incomplete courses. Saved to {out_file}")

if __name__ == "__main__":
    extract()
