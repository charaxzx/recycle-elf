from flask import Flask, request, jsonify, send_from_directory, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from openai import OpenAI
import os
from datetime import timedelta

app = Flask(__name__, static_folder='.', static_url_path='')
app.config['SECRET_KEY'] = os.urandom(24)  # 生产环境建议固定
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://postgres:password@localhost/recycle_elf').replace("postgresql://", "postgresql+psycopg2://", 1)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)

db = SQLAlchemy(app)

# 用户模型
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    data = db.Column(db.JSON, default=dict)  # 存经验值等

with app.app_context():
    db.create_all()

client = OpenAI(
    api_key=os.environ['DASHSCOPE_API_KEY'],
    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
)

# 静态文件
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    if os.path.exists(path):
        return send_from_directory('.', path)
    return send_from_directory('.', 'index.html')

# 注册
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    if User.query.filter_by(username=username).first():
        return jsonify({'error': '用户名已存在'}), 400
    user = User(
        username=username,
        password_hash=generate_password_hash(password),
        data={
            "elfExp": 0, "elfLevel": 1,
            "plasticExp": 0, "plasticLevel": 1,
            "metalExp": 0, "metalLevel": 1,
            "paperExp": 0, "paperLevel": 1,
            "batteryExp": 0, "batteryLevel": 1,
            "currentCloth": "default",
            "currentBackground": "default",
            "purchasedFurniture": [],
            "currentFurniture": None
        }
    )
    db.session.add(user)
    db.session.commit()
    return jsonify({'success': True})

# 登录
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    user = User.query.filter_by(username=data.get('username')).first()
    if user and check_password_hash(user.password_hash, data.get('password')):
        session['user_id'] = user.id
        return jsonify({'success': True, 'user': user.data})
    return jsonify({'error': '用户名或密码错误'}), 401

# 获取用户数据
@app.route('/api/get_user_data', methods=['GET'])
def get_user_data():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '未登录'}), 401
    user = User.query.get(user_id)
    return jsonify(user.data)

# 保存用户数据
@app.route('/api/save_user_data', methods=['POST'])
def save_user_data():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '未登录'}), 401
    user = User.query.get(user_id)
    new_data = request.get_json()
    user.data.update(new_data)
    db.session.commit()
    return jsonify({'success': True})

# AI 聊天
@app.route('/api/chat', methods=['POST'])
def qwen_chat():
    try:
        data = request.get_json()
        messages = data.get('messages')
        if not messages:
            return jsonify({'error': 'messages required'}), 400
        completion = client.chat.completions.create(
            model="qwen-vl-plus",
            messages=messages,
            max_tokens=512,
            temperature=0.7
        )
        return jsonify(completion.model_dump())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)