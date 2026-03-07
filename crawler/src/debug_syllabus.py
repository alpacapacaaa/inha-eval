import os
import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from webdriver_manager.chrome import ChromeDriverManager

def debug_syllabus():
    # 경로 설정
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    save_path = os.path.join(base_dir, 'debug_syllabus.html')
    
    # 테스트 과목 정보 (문제가 된 과목으로 변경)
    lec_code = "CHE1903"
    class_num = "001"
    year = "2026"
    semester = "1"
    url = f"https://sugang.inha.ac.kr/sugang/SU_51001/Lec_Syllabus_View.aspx?arg1={lec_code}&arg2={class_num}&arg3={year}&arg4={semester}"
    
    print(f"Testing URL (Selenium): {url}")
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)

    try:
        driver.get(url)
        print("Page opened. Waiting 7 seconds for full loading...")
        time.sleep(7) 
        
        # 1. 기본 페이지 소스 저장
        html_content = driver.page_source
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        print(f"Main HTML saved to: {save_path}")

        # 2. 모든 iframe 확인 (내용이 iframe 안에 숨어있을 수 있음)
        iframes = driver.find_elements(By.TAG_NAME, "iframe")
        print(f"Found {len(iframes)} iframes on page.")
        
        for idx, frame in enumerate(iframes):
            try:
                driver.switch_to.frame(frame)
                frame_source = driver.page_source
                frame_path = save_path.replace('.html', f'_frame_{idx}.html')
                with open(frame_path, 'w', encoding='utf-8') as f:
                    f.write(frame_source)
                print(f"  - Frame {idx} content saved to: {frame_path}")
                driver.switch_to.default_content()
            except:
                print(f"  - Could not read content of Frame {idx}")

        # 3. 주요 요소 리서치
        has_xml = len(driver.find_elements(By.ID, "xml")) > 0
        print(f"Has <input id='xml'>: {has_xml}")
        
        if not has_xml:
            print("Trying to find tables or other content indicators...")
            tables = driver.find_elements(By.TAG_NAME, "table")
            print(f"Found {len(tables)} tables in main document.")
            for i, t in enumerate(tables[:3]):
                print(f"Table {i} preview: {t.text[:100]}...")

    except Exception as e:
        print(f"Error occurred: {str(e)}")
    finally:
        driver.quit()

if __name__ == "__main__":
    debug_syllabus()
