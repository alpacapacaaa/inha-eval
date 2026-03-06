import time
import json
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

def get_dept_list():
    chrome_options = Options()
    chrome_options.add_argument("--headless")  # 실행 시 창이 뜨지 않도록 설정
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    url = "https://sugang.inha.ac.kr/sugang/SU_51001/Lec_Time_Search.aspx"
    
    try:
        driver.get(url)
        # 학과 드롭다운이 로딩될 때까지 대기
        wait = WebDriverWait(driver, 10)
        dept_select = wait.until(EC.presence_of_element_located((By.ID, "ddlDept")))
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        options = soup.find('select', {'id': 'ddlDept'}).find_all('option')
        
        dept_dict = {}
        for opt in options:
            if opt.get('value'):
                dept_dict[opt.text.strip()] = opt.get('value')
                
        print(f"Successfully found {len(dept_dict)} departments.")
        
        import os
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        save_path = os.path.join(base_dir, 'data', 'departments.json')
        
        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(dept_dict, f, ensure_ascii=False, indent=4)
            
        return dept_dict
        
    finally:
        driver.quit()

if __name__ == "__main__":
    print("Starting department list scraping...")
    get_dept_list()
    print("Done! Data saved to crawler/data/departments.json")
