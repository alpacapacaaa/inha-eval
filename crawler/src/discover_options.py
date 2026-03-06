import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

def discover_kita_options():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
    
    url = "https://sugang.inha.ac.kr/sugang/SU_51001/Lec_Time_Search.aspx"
    
    try:
        driver.get(url)
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.ID, "ddlKita")))
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        options = soup.find('select', {'id': 'ddlKita'}).find_all('option')
        
        print("\n--- Available ddlKita Options ---")
        for opt in options:
            print(f"Text: {opt.text.strip()}, Value: {opt.get('value')}")
            
    finally:
        driver.quit()

if __name__ == "__main__":
    discover_kita_options()
