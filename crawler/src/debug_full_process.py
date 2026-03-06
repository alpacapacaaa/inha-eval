import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait, Select
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

def debug_full_process():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    save_path = os.path.join(base_dir, 'debug_full_syllabus.html')
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    try:
        # 1. 메인 검색 페이지 접속 (세션 생성)
        driver.get("https://sugang.inha.ac.kr/sugang/SU_51001/Lec_Time_Search.aspx")
        wait = WebDriverWait(driver, 10)
        
        # 2. 아무 학과나 선택해서 조회 (세션 활성화)
        dept_select = Select(wait.until(EC.presence_of_element_located((By.ID, "ddlDept"))))
        dept_select.select_by_index(1) # 첫 번째 학과
        driver.find_element(By.ID, "ibtnSearch1").click()
        time.sleep(2)
        
        # 3. 검색 결과에서 첫 번째 강의의 '학수번호' 링크(또는 강의계획서 버튼) 확인
        # 보통 학수번호를 클릭하면 강의계획서가 팝업으로 뜹니다.
        try:
            # dgList 테이블에서 첫 번째 행의 학수번호 셀 찾기 (보통 첫 번째 td)
            first_course_link = driver.find_element(By.CSS_SELECTOR, "#dgList tr:nth-child(2) td:nth-child(1) a")
            course_id = first_course_link.text.strip()
            print(f"Found course link: {course_id}")
            
            # 클릴 전 현재 윈도우 핸들 저장
            main_window = driver.current_window_handle
            
            # 클릭! (팝업이 뜰 것임)
            first_course_link.click()
            time.sleep(3)
            
            # 새 창으로 전환
            for handle in driver.window_handles:
                if handle != main_window:
                    driver.switch_to.window(handle)
                    break
            
            print(f"Switched to popup: {driver.current_url}")
            
            # 팝업 내용 기다리기
            time.sleep(5) 
            
            html_content = driver.page_source
            with open(save_path, 'w', encoding='utf-8') as f:
                f.write(html_content)
                
            print(f"Syllabus HTML saved to: {save_path}")
            
            if "강의계획서" in html_content:
                print("SUCCESS: Found syllabus content via Session + Click!")
            else:
                print("FAILURE: Still no syllabus content.")
                print(f"Preview: {html_content[:300]}")
                
        except Exception as e:
            print(f"Error finding/clicking course link: {str(e)}")
            # 링크가 없다면 버튼 형태인지 확인해봐야 함

    finally:
        driver.quit()

if __name__ == "__main__":
    debug_full_process()
