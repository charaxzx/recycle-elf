@echo off
echo 正在启动回收精灵服务器...
start "" http://127.0.0.1:5000
python app.py
pause