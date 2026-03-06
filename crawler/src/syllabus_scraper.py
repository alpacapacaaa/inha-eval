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

    with open(dept_file, 'r', encoding='utf-8') as f:
        departments = json.load(f)

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    url = "https://sugang.inha.ac.kr/sugang/SU_51001/Lec_Time_Search.aspx"
    
    ge_categories = [
        {"name": "핵심교양", "value": "7"},
        {"name": "일반교양", "value": "9"},
        {"name": "교양영어", "value": "1"},
        {"name": "E-Learning", "value": "4"}
    ]

    try:
        driver.get(url)
        wait = WebDriverWait(driver, 10)
        main_window = driver.current_window_handle

        def process_current_list(category_name):
            try:
                wait.until(EC.presence_of_element_located((By.ID, "dgList")))
                time.sleep(1.5)
                
                rows = driver.find_elements(By.CSS_SELECTOR, "#dgList tr")[1:]
                print(f"  - Found {len(rows)} courses in {category_name}")
                
                for i in range(len(rows)):
                    try:
                        current_rows = driver.find_elements(By.CSS_SELECTOR, "#dgList tr")
                        if i + 1 >= len(current_rows): break
                        
                        target_row = current_rows[i+1]
                        link = target_row.find_element(By.CSS_SELECTOR, "td:nth-child(1) a")
                        course_id = link.text.strip()
                        
                        # 이미 수집했더라도 weekly_plan이 비어있으면 다시 시도
                        if course_id in syllabus_data and len(syllabus_data[course_id].get('weekly_plan', [])) > 0:
                            continue

                        print(f"    * Extracting XML for: {course_id}")
                        link.click()
                        time.sleep(2.0)
                        
                        new_window = None
                        for handle in driver.window_handles:
                            if handle != main_window:
                                new_window = handle
                                break
                        
                        if new_window:
                            driver.switch_to.window(new_window)
                            
                            try:
                                # xml 값이 채워질 때까지 대기 (가끔 빈 값이 먼저 잡힐 수 있음)
                                wait_popup = WebDriverWait(driver, 7)
                                xml_element = wait_popup.until(EC.presence_of_element_located((By.ID, "xml")))
                                
                                # 값이 들어올 때까지 최대 3초 더 대기
                                for _ in range(6):
                                    encoded_xml = xml_element.get_attribute("value")
                                    if encoded_xml and len(encoded_xml) > 100: # 최소한의 길이 체크
                                        break
                                    time.sleep(0.5)
                                
                                encoded_xml = xml_element.get_attribute("value")
                                decoded_xml = urllib.parse.unquote(encoded_xml)
                                
                                data = parse_syllabus_xml(decoded_xml, course_id)
                                syllabus_data[course_id] = data
                                
                                plan_count = len(data.get('weekly_plan', []))
                                print(f"      - Saved with {plan_count} weekly items")

                                if len(syllabus_data) % 5 == 0:
                                    with open(save_path, 'w', encoding='utf-8') as f:
                                        json.dump(syllabus_data, f, ensure_ascii=False, indent=4)

                            except Exception as e:
                                print(f"      - EXTRACTION ERROR for {course_id}: {str(e)}")
                            
                            driver.close()
                            driver.switch_to.window(main_window)
                    
                    except Exception as e:
                        print(f"    - Error: {str(e)}")
                        if len(driver.window_handles) > 1:
                            for h in driver.window_handles:
                                if h != main_window:
                                    driver.switch_to.window(h)
                                    driver.close()
                        driver.switch_to.window(main_window)

            except Exception as e:
                print(f"  - List error: {str(e)}")

        # 전공/교양 루프
        for dept_name, dept_code in departments.items():
            print(f"Major: {dept_name}")
            driver.get(url)
            dept_select = Select(wait.until(EC.presence_of_element_located((By.ID, "ddlDept"))))
            dept_select.select_by_value(dept_code)
            driver.find_element(By.ID, "ibtnSearch1").click()
            process_current_list(dept_name)

        for ge in ge_categories:
            print(f"GE: {ge['name']}")
            kita_select = Select(wait.until(EC.presence_of_element_located((By.ID, "ddlKita"))))
            kita_select.select_by_value(ge['value'])
            driver.find_element(By.ID, "ibtnSearch2").click()
            process_current_list(ge['name'])

    finally:
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(syllabus_data, f, ensure_ascii=False, indent=4)
        driver.quit()

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

if __name__ == "__main__":
    scrape_syllabuses()
