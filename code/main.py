# flask for serving files
from flask import Flask, render_template as rt_, request
# SQLAlchemy to access the database
from flask_sqlalchemy import SQLAlchemy
# we will use os to access enviornment variables stored in the *.env files, time for delays and json for ajax-responses
import os, time, json
import secrets

# initialize flask application with template_folder pointed to public_html (relative to this file)
app=Flask(__name__)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = True
app.config["SQLALCHEMY_DATABASE_URI"] =  f"postgresql://{os.environ['POSTGRES_USER']}:{os.environ['POSTGRES_PASSWORD']}@db/tictactoe"
db = SQLAlchemy(app)

# proxy for default render template, passes the filename to the actual render_template fn and wether the user is signed in or not
def render_template(fileName, request):
    username = checkToken(request.cookies["token"]) if "token" in request.cookies.keys() else False
    return rt_(fileName, username=username) if username else rt_(fileName)

# checks if token is valid and returns username if so. if not, it returns False
def checkToken(token) -> str|bool:
    matchingEntries = db.session.query(Session).filter(Session.sessionKey==token and Session.sessionStart > time.time()+os.environ["SESSION_TIMEOUT"]).all()
    return matchingEntries[0].username if len(matchingEntries) == 1 else False

# generates a token for a user, inserts it to the db and returns the token. False if failed
def generateToken(username) -> str|bool:
    try:
        token = secrets.token_hex(256//2)
        app.logger.debug("SESSION:")
        app.logger.debug(Session(username, token))
        app.logger.debug("-----------------------")
        db.session.add(Session(username, token))
        db.session.commit()
        return token
    except:
        return False

# table to store users and their password to
class User(db.Model):
    __tablename__ = "users"
    username=db.Column(db.String(16), primary_key=True, nullable=False)
    email=db.Column(db.String(256))
    key=db.Column(db.String(256))
    salt=db.Column(db.String(256))

    def __init__(self, username, email, key, salt):
        if len(username) < 2:
            raise Exception("Username too short")

        self.username=username
        self.email=email
        self.key=key
        self.salt=salt

# table to store games and their players to
class Game(db.Model):
    __tablename__ = "games"
    gameid = db.Column(db.Integer(), primary_key=True, autoincrement="auto")
    attacker = db.Column(db.String(16), db.ForeignKey("users.username"), nullable=False)
    defender = db.Column(db.String(16), db.ForeignKey("users.username"), nullable=False)
    def __init__(self, attacker, defender):
        self.attacker = attacker
        self.defender = defender

# table to store moves to
class Move(db.Model):
    __tablename__ = "moves"
    gameid = db.Column(db.Integer(), db.ForeignKey("games.gameid"), nullable=False, primary_key=True)
    moveIndex = db.Column(db.Integer(), nullable=False, primary_key=True, name="moveindex")
    movePosition = db.Column(db.Integer(), nullable=False, name="moveposition")
    def __init__(self, gameid, moveIndex, movePosition):
        self.gameid = gameid
        self.moveIndex = moveIndex
        self.movePosition = movePosition

# table to store sessionKeys to (=tokens). Tokens allow faster and more secure authentication
class Session(db.Model):
    __tablename__ = "sessions"
    sessionId = db.Column(db.Integer(), primary_key=True, autoincrement="auto")
    username = db.Column(db.String(16), db.ForeignKey("users.username"), nullable=False)
    sessionKey = db.Column(db.String(256), nullable=False, name="sessionkey", unique=True)
    sessionStart = db.Column(db.DateTime(), nullable=False, name="sessionstart", server_default=db.text('CURRENT_TIMESTAMP'))
    def __init__(self, username, sessionKey):
        self.username= username
        self.sessionKey = sessionKey

@app.route("/")
def index():
    return render_template("index.html.jinja", request)

@app.route("/getsalt", methods=["POST"])
def getsalt():
    # returns salt for keygeneration of demanded user
    response = {}
    try:
        users = db.session.query(User).filter(User.username==request.form["username"])
        # only return if 1 user has been found (since username is UNIQUE, it should only be 1 or 0)
        if(users.count()==1):
            response["data"] = users[0].salt
            response["success"] = True
        else:
            response["success"] = False
    except:
        response["success"] = False
    return json.dumps(response)


@app.route("/login", methods=["POST"])
def loginSubmission():
    response = {}
    try:
        # check if username and password match
        isAuthorized = db.session.query(User).filter(User.username==request.form["username"],User.key==request.form["key"]).count()==1
        response["success"] = isAuthorized
        # if they match, return a token
        if isAuthorized:
            token = generateToken(request.form["username"])
            if token:
                response["data"] = {}
                response["data"]["token"] = token
                response["data"]["token_expires"] = os.environ["SESSION_TIMEOUT"]
            else:
                response["success"] = False
    except:
        response["success"] = False
    return json.dumps(response)

@app.route("/login", methods=["GET"])
def login():
    return render_template("login.html.jinja", request)

@app.route("/signup", methods=["POST"])
def signupSubmission():
    response = {}
    try:
        # insert values to db
        db.session.add(User(request.form["username"], request.form["email"], request.form["key"], request.form["salt"]))
        db.session.commit()
        # generate a token
        response["data"] = {}
        response["data"]["token"] = generateToken(request.form["username"])
        response["data"]["token_expires"] = os.environ["SESSION_TIMEOUT"]
        response["success"] = True
    except Exception as e:
        app.logger.error(e)
        response["success"] = False
    return json.dumps(response)

@app.route("/signup", methods=["GET"])
def signup():
    return render_template("signup.html.jinja", request)

# just for testing stuff
@app.route("/test", methods=["GET", "POST"])
def test():
    return secrets.token_hex(256//2)

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
    
    # wait for database to be reachable before starting flask server
    print("waiting for server to start")
    while not serverUp():
        print("server unreachable, waiting 5s")
        time.sleep(5)

    print("server reached and initialized, starting web-service")
    # 0.0.0.0 => allow all adresses to have access (important for docker-environment)
    app.run(host="0.0.0.0", port=os.environ["HTTP_PORT"])