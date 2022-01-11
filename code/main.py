# flask for serving files
from flask import Flask, render_template, request
# SQLAlchemy to access the database
from flask_sqlalchemy import SQLAlchemy
# we will use os to access enviornment variables stored in the *.env files
import os, time


# initialize flask application with template_folder pointed to public_html (relative to this file)
app=Flask(__name__)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = True
app.config["SQLALCHEMY_DATABASE_URI"] =  f"postgresql://{os.environ['POSTGRES_USER']}:{os.environ['POSTGRES_PASSWORD']}@db/tictactoe"
db = SQLAlchemy(app)


class User(db.Model):
    __tablename__ = "users"
    username=db.Column(db.String(16), primary_key=True, nullable=False)
    email=db.Column(db.String(256))
    passwordhash=db.Column(db.String(256))
    def __init__(self, username, email, passwordhash):
        self.username=username
        self.email=email
        self.passwordhash=passwordhash
    
class Game(db.Model):
    __tablename__ = "games"
    gameid = db.Column(db.Integer(), primary_key=True, autoincrement="auto")
    attacker = db.Column(db.String(16), db.ForeignKey("users.username"), nullable=False)
    defender = db.Column(db.String(16), db.ForeignKey("users.username"), nullable=False)
    def __init__(self, attacker, defender):
        self.attacker = attacker
        self.defender = defender

class Move(db.Model):
    __tablename__ = "moves"
    gameid = db.Column(db.Integer(), db.ForeignKey("games.gameid"), nullable=False, primary_key=True)
    moveIndex = db.Column(db.Integer(), nullable=False, primary_key=True, name="moveindex")
    movePosition = db.Column(db.Integer(), nullable=False, name="moveposition")
    def __init__(self, gameid, moveIndex, movePosition):
        self.gameid = gameid
        self.moveIndex = moveIndex
        self.movePosition = movePosition

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/signup", methods=["POST"])
def success():
    try:
        db.session.add(User(request.form["username"], request.form["email"], request.form["passwordhash"]))
        db.session.commit()
        return render_template("success.html")
    except:
        return render_template("error.html")


@app.route("/api/test", methods=["GET", "POST"])
def apiTest():
    return jsonify(request.form)

# only debug if not as module
if __name__ == "__main__":    
    # returns true if server is reachable
    def serverUp():
        try:
            db.create_all()
            return True
        except:
            return False

    app.debug = True

    print("waiting for server to start")
    while not serverUp():
        print("server unreachable, waiting 5s")
        time.sleep(5)
        
    print("server reached and initialized, starting web-service")
    app.run(host="0.0.0.0", port=os.environ["HTTP_PORT"])