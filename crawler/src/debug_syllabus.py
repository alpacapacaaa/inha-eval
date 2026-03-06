import os
import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager

def debug_syllabus():
    # 경로 설정
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    save_path = os.path.join(base_dir, 'debug_syllabus.html')
    
    # 테스트 과목 정보
    lec_code = "AAO4005"
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
        print("Page opened. Waiting 5 seconds for full loading...")
        time.sleep(5) 
        
        html_content = driver.page_source
        
        with open(save_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        print(f"HTML saved to: {save_path}")
        
        if "강의계획서" in html_content:
            print("SUCCESS: Found '강의계획서' in content.")
            # 핵심 키워드가 있는지 추가 확인
            for keyword in ["강의진행방식", "성적평가기준", "중간", "기말"]:
                if keyword in html_content:
                    print(f"   - Found keyword: {keyword}")
                else:
                    print(f"   - MISSING keyword: {keyword}")
        else:
            print("FAILURE: '강의계획서' title not found. Maybe an error page or empty.")
            print(f"Preview (First 300 chars): {html_content[:300]}")

    except Exception as e:
        print(f"Error occurred: {str(e)}")
    finally:
        driver.quit()

if __name__ == "__main__":
    debug_syllabus()
