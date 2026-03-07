import os
import json
import time
import re
import urllib.parse
import xml.etree.ElementTree as ET
from typing import Dict, Any, List
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def scrape_syllabuses():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dept_file = os.path.join(base_dir, 'data', 'departments.json')
    save_path = os.path.join(base_dir, 'data', 'syllabuses.json')

    syllabus_data: Dict[str, Any] = {}
    if os.path.exists(save_path):
        try:
            with open(save_path, 'r', encoding='utf-8') as f:
                loaded_data = json.load(f)
                if isinstance(loaded_data, dict):
                    syllabus_data = loaded_data
        except: pass

    incomplete_file = os.path.join(base_dir, 'data', 'incomplete_courses.json')
    incomplete_set = set()
    if os.path.exists(incomplete_file):
        with open(incomplete_file, 'r', encoding='utf-8') as f:
            incomplete_set = set(json.load(f))
            print(f"[System] Targeting {len(incomplete_set)} incomplete courses for rescraping.")

    with open(dept_file, 'r', encoding='utf-8') as f:
        departments = json.load(f)

    driver = None
    wait = None

    def init_chrome_driver():
        nonlocal driver, wait
        print("\n[System] (Re)starting browser session...")
        if driver:
            try: driver.quit()
            except: pass
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        new_driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
        new_wait = WebDriverWait(new_driver, 10)
        driver = new_driver
        wait = new_wait
        return new_driver, new_wait

    init_chrome_driver()
    search_url = "https://sugang.inha.ac.kr/sugang/SU_51001/Lec_Time_Search.aspx"
    ge_categories = [
        {"name": "핵심교양", "value": "7"},
        {"name": "일반교양", "value": "9"},
        {"name": "교양영어", "value": "1"},
        {"name": "E-Learning", "value": "4"}
    ]

    def process_current_list(category_name, dept_current, dept_total):
        if not driver or not wait: return
        try:
            wait.until(EC.presence_of_element_located((By.ID, "dgList")))
            time.sleep(1.0)
            main_window = driver.current_window_handle
            
            rows = driver.find_elements(By.CSS_SELECTOR, "#dgList tr")[1:]
            total_courses = len(rows)
            print(f"\n[{dept_current}/{dept_total}] {category_name} - Found {total_courses} courses")
            
            for i in range(total_courses):
                try:
                    current_rows = driver.find_elements(By.CSS_SELECTOR, "#dgList tr")
                    if i + 1 >= len(current_rows): break
                    
                    target_row = current_rows[i+1]
                    link = target_row.find_element(By.CSS_SELECTOR, "td:nth-child(1) a")
                    course_id = link.text.strip()
                    
                    # Skipping Logic
                    is_incomplete = course_id in incomplete_set
                    if course_id in syllabus_data and not is_incomplete:
                        existing = syllabus_data[course_id]
                        # Double check if it's truly completed
                        if existing.get('summary', {}).get('overview', '') and len(existing.get('weekly_plan', [])) > 0:
                            if i % 25 == 0 or i == total_courses - 1:
                                print(f"  ({i+1}/{total_courses}) Skipping completed: {course_id}")
                            continue

                    print(f"  ({i+1}/{total_courses}) * {'RE-EXTRACTING' if is_incomplete else 'Extracting'}: {course_id}")
                    link.click()
                    time.sleep(1.0)
                    
                    try: driver.switch_to.alert.accept()
                    except: pass

                    if len(driver.window_handles) > 1:
                        driver.switch_to.window(driver.window_handles[-1])
                        try:
                            wait_p = WebDriverWait(driver, 3.5)
                            try:
                                xml_el = wait_p.until(EC.presence_of_element_located((By.ID, "xml")))
                                enc_xml = xml_el.get_attribute("value")
                                if enc_xml and len(enc_xml) > 100:
                                    res_data = parse_syllabus_xml(urllib.parse.unquote(enc_xml), course_id)
                                    if res_data and isinstance(res_data, dict) and len(res_data.get('summary', {}).get('overview', '')) > 5:
                                        syllabus_data[course_id] = res_data
                                        print(f"      - Saved (XML): {course_id}")
                                        if is_incomplete: incomplete_set.discard(course_id)
                                    else: print(f"      - Data Quality issue: {course_id}")
                            except:
                                # Standard XML not found, try ABEEK/HTML fallback
                                html_src = driver.page_source
                                if "성적평가" in html_src or "주차" in html_src:
                                    res_data = parse_abeek_html(html_src, course_id)
                                    if res_data and len(res_data.get('summary', {}).get('overview', '')) > 5:
                                        syllabus_data[course_id] = res_data
                                        print(f"      - Saved (ABEEK/HTML): {course_id}")
                                        if is_incomplete: incomplete_set.discard(course_id)
                                    else: print(f"      - Fallback failed: {course_id}")
                                else:
                                    print(f"      - No standard data: {course_id}")
                        except Exception as e:
                            print(f"      - Skipping (Error): {course_id} - {str(e)}")

                        if len(driver.window_handles) > 1:
                            try: driver.close()
                            except: pass
                        driver.switch_to.window(main_window)
                    
                    if len(syllabus_data) % 15 == 0:
                        with open(save_path, 'w', encoding='utf-8') as f:
                            json.dump(syllabus_data, f, ensure_ascii=False, indent=4)
                except Exception as e:
                    if "session" in str(e).lower() or "handle" in str(e).lower(): raise e
                    print(f"    - Course Error: {str(e)}")
                    try: driver.switch_to.window(main_window)
                    except: pass
        except Exception as e:
            if "session" in str(e).lower() or "handle" in str(e).lower(): raise e
            print(f"  - List Error: {str(e)}")

    # 메인 실행 엔진
    try:
        def run_all():
            nonlocal driver, wait
            dept_items = list(departments.items())
            total_depts = len(dept_items) + len(ge_categories)
            
            # 전공 루프
            idx = 0
            while idx < len(dept_items):
                dept_name, dept_code = dept_items[idx]
                try:
                    driver.get(search_url)
                    sel_el = wait.until(EC.presence_of_element_located((By.ID, "ddlDept")))
                    sel = Select(sel_el)
                    sel.select_by_value(dept_code)
                    driver.find_element(By.ID, "ibtnSearch1").click()
                    process_current_list(dept_name, idx + 1, total_depts)
                    idx += 1
                except Exception as e:
                    if "session" in str(e).lower() or "handle" in str(e).lower():
                        init_chrome_driver()
                        continue
                    print(f"  - Dept Loop Error: {str(e)}")
                    idx += 1

            # 교양 루프
            ge_idx = 0
            ge_start = len(dept_items)
            while ge_idx < len(ge_categories):
                ge = ge_categories[ge_idx]
                try:
                    driver.get(search_url)
                    sel = Select(wait.until(EC.presence_of_element_located((By.ID, "ddlKita"))))
                    sel.select_by_value(ge['value'])
                    driver.find_element(By.ID, "ibtnSearch2").click()
                    process_current_list(ge['name'], ge_start + ge_idx + 1, total_depts)
                    ge_idx += 1
                except Exception as e:
                    if "session" in str(e).lower() or "handle" in str(e).lower():
                        init_chrome_driver()
                        continue
                    print(f"  - GE Loop Error: {str(e)}")
                    ge_idx += 1

        run_all()
    finally:
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(syllabus_data, f, ensure_ascii=False, indent=4)
        if driver: 
            try: driver.quit()
            except: pass

def parse_syllabus_xml(xml_str, course_id):
    try:
        # EUC-KR 인코딩 선언이 있을 경우 처리
        xml_str = xml_str.replace('encoding="EUC-KR"', 'encoding="UTF-8"')
        root = ET.fromstring(xml_str)
        main = root.find('MAIN')
        
        if main is None:
            print(f"      - Warning: <MAIN> tag not found in XML for {course_id}")
            return {"course_id": course_id, "error": "Missing <MAIN> tag"}

        data: Dict[str, Any] = {
            "course_id": course_id,
            "summary": {
                "object": (main.findtext('OBJECT') or '').strip(),
                "overview": (main.findtext('OVERVIEW') or '').strip(),
                "method": (main.findtext('ING_METHOD') or '').strip(),
                "notes": (main.findtext('NOTICE') or '').strip()
            },
            "evaluation": {
                "midterm": int(main.findtext('SHARE_MID') or 0),
                "final": int(main.findtext('SHARE_LAST') or 0),
                "assignment": int(main.findtext('SHARE_REPORT') or 0),
                "attendance": int(main.findtext('SHARE_ATTEND') or 0),
                "quiz": int(main.findtext('SHARE_QUIZ') or 0),
                "discussion": int(main.findtext('SHARE_DISCUSSION') or 0),
                "etc": int(main.findtext('SHARE_ETC') or 0)
            },
            "weekly_plan": []
        }
        
        # INFO가 XML 구조 내 어디에 있든 모두 찾도록 재귀적 탐색 (.//) 사용
        for info in root.findall('.//INFO'):
            data['weekly_plan'].append({
                "week": (info.findtext('WEEK') or '').strip(),
                "topic": (info.findtext('THEME') or '').strip(),
                "content": (info.findtext('CONTENT') or '').strip()
            })
            
        return data
    except Exception as e:
        print(f"      - XML Parse Error for {course_id}: {str(e)}")
        return {"course_id": course_id, "error": f"XML Parse fail: {str(e)}"}

def parse_abeek_html(html_str, course_id):
    from bs4 import BeautifulSoup
    import re
    soup = BeautifulSoup(html_str, 'html.parser')
    
    obj_val = ""
    over_val = ""
    eval_data = {"midterm": 0, "final": 0, "assignment": 0, "attendance": 0, "quiz": 0, "discussion": 0, "etc": 0}
    plans = []
    
    # 1. 요약/목표 추출
    all_tds = soup.find_all(['td', 'th'])
    for t in all_tds:
        txt = t.get_text(strip=True)
        if txt in ["교과목표", "강의목표", "Course Objectives"] and not obj_val:
            sib = t.find_next_sibling('td')
            if sib:
                v = sib.get_text(strip=True)
                if len(v) > 5 and not v.startswith("1회차"): obj_val = v
        elif txt in ["강의개요", "강의설명", "Course Description"] and not over_val:
            sib = t.find_next_sibling('td')
            if sib:
                v = sib.get_text(strip=True)
                if len(v) > 5 and not v.startswith("1회차"): over_val = v

    if not obj_val: obj_val = over_val
    if not over_val: over_val = obj_val

    # 2. 평가 방법 추출
    for tbl in soup.find_all('table'):
        tbl_txt = tbl.get_text()
        if "성적평가" in tbl_txt or "평가방법" in tbl_txt:
            def get_num(k):
                match = re.search(rf'{k}.*?(\d+)%', tbl_txt)
                return int(match.group(1)) if match else 0
            eval_data["midterm"] = get_num("중간")
            eval_data["final"] = get_num("기말")
            eval_data["assignment"] = get_num("과제")
            eval_data["attendance"] = get_num("출석")
            break

    # 3. 주간 계획 추출
    for tbl in soup.find_all('table'):
        if any(k in tbl.get_text() for k in ["주차", "회차", "Week"]):
            rows = tbl.find_all('tr')
            if len(rows) > 1:
                for row in rows:
                    tds = row.find_all('td')
                    if len(tds) >= 3:
                        w = tds[0].get_text(strip=True)
                        if re.search(r'\d', w):
                            plans.append({
                                "week": w,
                                "topic": tds[1].get_text(strip=True),
                                "content": tds[2].get_text(strip=True)
                            })
                if len(plans) > 0: break

    # 최소 데이터 품질 확인
    if len(over_val) < 5 and len(plans) == 0:
        return None
        
    return {
        "course_id": course_id,
        "summary": {"object": obj_val, "overview": over_val, "method": "", "notes": ""},
        "evaluation": eval_data,
        "weekly_plan": plans
    }

if __name__ == "__main__":
    scrape_syllabuses()
