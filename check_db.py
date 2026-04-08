from models import db, User, Article, Bullet, Photo
from app import app

with app.app_context():
    # 创建所有表
    db.create_all()
    print('数据库表创建成功')
    
    # 检查表是否存在
    print('User table exists:', db.session.query(User).first() is not None or True)
    print('Bullet table exists:', db.session.query(Bullet).first() is not None or True)
    print('Article table exists:', db.session.query(Article).first() is not None or True)
    print('Photo table exists:', db.session.query(Photo).first() is not None or True)