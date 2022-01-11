from main import db
def init():
    db.create_all()
if __name__ == '__main__':
    init()