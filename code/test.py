from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
Model = declarative_base()

# ORM
engine = create_engine('sqlite:///', echo = True)
meta = MetaData()


class User(Model):
    __tablename__ = "users"
    username=Column(String(16), primary_key=True, nullable=False)
    email=Column(String(256))
    def __init__(self, username, email):
        self.username=username
        self.email=email
    
class Game(Model):
    __tablename__ = "games"
    gameid = Column(Integer(), primary_key=True, autoincrement="auto")
    attacker = Column(String(16), ForeignKey("users.username"), nullable=False)
    defender = Column(String(16), ForeignKey("users.username"), nullable=False)
    def __init__(self, attacker, defender):
        self.attacker = attacker
        self.defender = defender

class Move(Model):
    __tablename__ = "moves"
    gameid = Column(Integer(), ForeignKey("games.gameid"), nullable=False, primary_key=True)
    moveIndex = Column(Integer(), nullable=False, primary_key=True)
    movePosition = Column(Integer(), nullable=False)
    
    def __init__(self, gameid, moveIndex, movePosition):
        self.gameid
        self.moveIndex
        self.movePosition

User.metadata.create_all(engine)
Game.metadata.create_all(engine)
Move.metadata.create_all(engine)