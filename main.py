"""
AI Humanizer Studio Launcher
Starts the server and automatically opens your web browser.
"""

import sys
import webbrowser
import threading
import time
import uvicorn

def open_browser():
    time.sleep(1.2)
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    print("=========================================================")
    print(" ✨ AI Humanizer Studio - Starting Up...")
    print(" 🚀 URL: http://127.0.0.1:8000")
    print(" 📂 Mode: Offline Stealth Engine (100% Free & Unlimited)")
    print("=========================================================")
    
    # Start browser opener in background thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    # Run uvicorn server
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)
