import os
import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from typing import List, Dict, Any
from bs4 import BeautifulSoup

def scrape_courses():
    # 경로 설정
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    dept_file = os.path.join(base_dir, 'data', 'departments.json')
    save_path = os.path.join(base_dir, 'data', 'courses.json')

    with open(dept_file, 'r', encoding='utf-8') as f:
        departments = json.load(f)

    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    url = "https://sugang.inha.ac.kr/sugang/SU_51001/Lec_Time_Search.aspx"
    # 교양/기타 카테고리 설정 (ddlKita 값)
    # 7: 핵심교양, 9: 일반교양, 1: 영어, 11: 기초학문 등 (인하대 수강신청 시스템 기준)
    ge_categories = [
        {"name": "핵심교양", "value": "7"},
        {"name": "일반교양", "value": "9"},
        {"name": "교양영어", "value": "1"},
        {"name": "E-Learning", "value": "4"},
        {"name": "크로스오버", "value": "6"},
        {"name": "교양한국어", "value": "2"},
        {"name": "NCS과목", "value": "10"}
    ]

    all_courses: List[Dict[str, Any]] = []

    def parse_table(soup, category_name):
        table = soup.find('table', {'id': 'dgList'})
        if not table:
            return []
        
        results = []
        rows = table.find_all('tr')[1:] # 헤더 제외
        for row in rows:
            cols = row.find_all('td')
            if len(cols) < 10: continue
            
            results.append({
                "dept": category_name,
                "id": cols[0].text.strip(),
                "name": cols[2].text.strip(),
                "grade": cols[3].text.strip(),
                "credit": cols[4].text.strip(),
                "type": cols[5].text.strip(),
                "time_location": cols[6].text.strip(),
                "professor": cols[7].text.strip(),
                "evaluation_type": cols[8].text.strip(),
                "note": cols[9].text.strip()
            })
        return results

    try:
        driver.get(url)
        wait = WebDriverWait(driver, 10)

        # --- 1. 전공 과목 수집 ---
        count = 0
        for dept_name, dept_code in departments.items():
            count += 1
            print(f"[{count}/{len(departments)}] Major: {dept_name}")
            try:
                dept_select = Select(wait.until(EC.presence_of_element_located((By.ID, "ddlDept"))))
                dept_select.select_by_value(dept_code)
                driver.find_element(By.ID, "ibtnSearch1").click()
                time.sleep(1.2)
                
                soup = BeautifulSoup(driver.page_source, 'html.parser')
                courses = parse_table(soup, dept_name)
                all_courses.extend(courses)
                print(f"  - Found {len(courses)} courses.")
            except Exception as e:
                print(f"  - Error: {str(e)}")

        # --- 2. 교양/기타 과목 수집 ---
        print("\n--- Starting GE Categories ---")
        for ge in ge_categories:
            print(f"GE Category: {ge['name']}")
            try:
                # ddlKita 선택
                kita_select = Select(wait.until(EC.presence_of_element_located((By.ID, "ddlKita"))))
                kita_select.select_by_value(ge['value'])
                
                # 교양용 검색 버튼 클릭 (ibtnSearch2)
                search_btn = driver.find_element(By.ID, "ibtnSearch2")
                search_btn.click()
                time.sleep(2.0) # 교양은 데이터가 많아 더 대기
                
                soup = BeautifulSoup(driver.page_source, 'html.parser')
                courses = parse_table(soup, ge['name'])
                all_courses.extend(courses)
                print(f"  - Found {len(courses)} courses.")
            except Exception as e:
                print(f"  - Error: {str(e)}")

        # 결과 저장
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(all_courses, f, ensure_ascii=False, indent=4)
        
        print(f"\nTotal {len(all_courses)} courses saved to {save_path}")

    finally:
        driver.quit()

if __name__ == "__main__":
    scrape_courses()
