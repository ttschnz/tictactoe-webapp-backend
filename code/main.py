# since the builtin flask server is not for production, we use the gevent
from gevent.pywsgi import WSGIServer
# flask for serving files
from flask import Flask, render_template as rt_, request, jsonify, send_from_directory, abort
# SQLAlchemy to access the database
from flask_sqlalchemy import SQLAlchemy
# serializer to transform query result to json
from sqlalchemy_serializer import SerializerMixin
# prettify html before send
from flask_pretty import Prettify
# we will use os to access enviornment variables stored in the *.env files, time for delays and json for ajax-responses
import os, time, json, random, sys
import secrets
# for debugging
import traceback
from datetime import datetime

# add RL-A to importable 
sys.path.insert(0, '/code/RL-A/')
from TTTsolver import TicTacToeSolver, boardify
solver = TicTacToeSolver("policy_3_3_x.pkl","policy_3_3_o.pkl").solveState

# initialize flask application with template_folder pointed to public_html (relative to this file)
app=Flask(__name__)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = True
app.config["SQLALCHEMY_DATABASE_URI"] =  f"postgresql://{os.environ['POSTGRES_USER']}:{os.environ['POSTGRES_PASSWORD']}@db/tictactoe"
app.config['SQLALCHEMY_ECHO'] = True
# prettify app
prettify = Prettify(app)
db = SQLAlchemy(app)

# proxy for default render template, passes the filename to the actual render_template fn and wether the user is signed in or not
def render_template(fileName, request, opts = False):
    username = checkToken(request.cookies["token"]) if "token" in request.cookies.keys() else False
    return rt_(fileName, opts=opts, username=username if username else False, version=os.popen("git -C '/' log -n 1 --pretty=format:'%H'").read(), behind=os.popen("git rev-list $(git -C '/' log -n 1 --pretty=format:'%H')..HEAD | grep -c ^").read())

# checks if token is valid and returns username if so. if not, it returns False
def checkToken(token) -> str|bool:
    app.logger.debug("-----------------------")
    app.logger.debug(db.session.query(Session).all()[0].sessionStart)
    matchingEntries = db.session.query(Session).filter(Session.sessionKey==token).filter(Session.sessionStart < datetime.utcfromtimestamp(round(time.time()) + int(os.environ["SESSION_TIMEOUT"]))).all()
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

def determineWinner(moves):    
    return random.choice([1,0,-1,None])

# add sample data for testing
def addSampleData(dataCount=5):
    userList = [f"sampleUser{i}" for i in range(dataCount)]
    # add users
    for username in userList:
        db.session.add(User(username, f"emailof@{username}.localhost",secrets.token_hex(256//2),secrets.token_hex(256//2)))
    db.session.commit()
    
    # add games
    for _ in range(dataCount**2):
        game = Game(random.choice(userList))
        db.session.add(game)
        db.session.flush()
        db.session.refresh(game)
        db.session.commit()  
        # add moves 
        for i in range(9):
            print(i,game.attacker if i % 2 == 0 else os.environ["BOT_USERNAME"])
            db.session.add(Move(game.gameId, i, game.attacker if i % 2 == 0 else os.environ["BOT_USERNAME"]))
        db.session.commit()  
    return

def getBoard(gameId):
    board = [False]*9
    moves = db.session.query(Move).filter(Move.gameId == gameId).all()
    for move in moves:
        board[move.movePosition] = move.player
    return board

# table to store users and their password to
class User(db.Model, SerializerMixin):
    __tablename__ = "users"
    username=db.Column(db.String(16), primary_key=True, nullable=False)
    email=db.Column(db.String(256))
    key=db.Column(db.String(256))
    salt=db.Column(db.String(256))
    timestamp = db.Column(db.TIMESTAMP,server_default=db.text('CURRENT_TIMESTAMP'))
    def __init__(self, username, email, key, salt):
        if len(username) < 2:
            raise Exception("Username too short")

        self.username=username
        self.email=email
        self.key=key
        self.salt=salt

# table to store games and their players to
class Game(db.Model, SerializerMixin):
    __tablename__ = "games"
    gameId = db.Column(db.Integer(), primary_key=True, autoincrement="auto", name="gameid")
    gameKey = db.Column(db.String(32))
    attacker = db.Column(db.String(16), db.ForeignKey("users.username"))
    defender = db.Column(db.String(16), db.ForeignKey("users.username"))
    winner = db.Column(db.String(16), db.ForeignKey("users.username"))
    gameFinished = db.Column(db.Boolean(), default=False, nullable=False)
    timestamp = db.Column(db.TIMESTAMP,server_default=db.text('CURRENT_TIMESTAMP'))
    def __init__(self, player):
        # app.logger.info("game player username", player)
        self.attacker = player if player else None
        self.defender = os.environ["BOT_USERNAME"]
        # only set key if not with an account
        self.gameKey = hex(random.randrange(16**32))[2:] if not player else None

    # transforms the game-id (int) to a hex-string
    def idToHexString(self, length=6):
        return ("0" * length + hex(self.gameId)[2:])[-6:]

# table to store moves to
class Move(db.Model, SerializerMixin):
    __tablename__ = "moves"
    gameId = db.Column(db.Integer(), db.ForeignKey("games.gameid"), nullable=False, primary_key=True, name="gameid")
    moveIndex = db.Column(db.Integer(), nullable=False, primary_key=True, name="moveindex")
    movePosition = db.Column(db.Integer(), nullable=False, name="moveposition")
    player = db.Column(db.String(16),db.ForeignKey("users.username"))
    timestamp = db.Column(db.TIMESTAMP,server_default=db.text('CURRENT_TIMESTAMP'))
    def __init__(self, gameId, movePosition, player):
        self.gameId = str(gameId)
        self.player = player if player else None
        self.moveIndex = self.getMoveIndex()
        app.logger.info(self.moveIndex)
        self.movePosition = movePosition
        self.checkValidity()

    def getMoveIndex(self):
        index = -1
        moves = db.session.query(Move).filter(Move.gameId == self.gameId).order_by(Move.moveIndex.desc()).all()
        index = 0 if len(moves) == 0 else moves[0].moveIndex + 1

        if not index < 9:
            raise ValueError("")
        return index
    
    def checkValidity(self):
        # check if there is no other entry with same pos and gameid
        sameMoves = db.session.query(Move).filter(Move.gameId == self.gameId).filter(Move.movePosition == self.movePosition).all()
        if not len(sameMoves) == 0:
            raise ValueError("field is allready occupied by another move:", (self.gameId,sameMoves[0].gameId), (self.moveIndex, sameMoves[0].moveIndex),(self.movePosition,sameMoves[0].movePosition))
        # check if the player is allowed to do this move
        # if the move-index is even it should be the attacker (moves 0,2,4,...)
        # else it shoud be the defender (moves 1,3,5,...)
        # note: if the games player is none, "bot" is the defender (played as guest, therefore attacking)
        game = db.session.query(Game).filter(Game.gameId == self.gameId).all()[0]
        if self.moveIndex % 2 == 1 and game.attacker == self.player: # even and player is not the attacker
            raise ValueError(f"player {self.player} is not allowed to make move #{self.moveIndex}")
        if self.moveIndex % 2 == 0 and game.defender == self.player: # odd and player is not the defender
            raise ValueError(f"player {self.player} is not allowed to make move #{self.moveIndex}")
        return True

# table to store sessionKeys to (=tokens). Tokens allow faster and more secure authentication
class Session(db.Model, SerializerMixin):
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
    response = {"success":True}
    try:
        users = db.session.query(User).filter(User.username==request.form["username"])
        # only return if 1 user has been found (since username is UNIQUE, it should only be 1 or 0)
        if(users.count()==1):
            response["data"] = users[0].salt
        else:
            response["success"] = False
    except:
        response["success"] = False
    return json.dumps(response)


@app.route("/login", methods=["POST"])
def loginSubmission():
    response = {"success":True}
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
                response["data"]["token_expires"] = int(os.environ["SESSION_TIMEOUT"]) + round(time.time())
            else:
                response["success"] = False
    except:
        response["success"] = False
    return json.dumps(response)

@app.route("/login", methods=["GET"])
def login():
    return render_template("login.html.jinja", request)

@app.route("/game", methods=["GET"])
def returnGameTemplate():
    return render_template("game.html.jinja", request)

@app.route("/game/<gameId>", methods=["GET"])
def returnGameInfo(gameId):
    response = {"success":True}
    try:
        game = db.session.query(Game).filter(Game.gameId == gameId).all()[0]
        response["game"] = {"gameId":game.gameId, "gameKey":game.gameKey, "attacker":game.attacker, "defender":game.defender}
        moves = db.session.query(Move).filter(Move.gameId == gameId).all()
        response["moves"] = []
        for move in moves:
            response["moves"].append({"position":move.movePosition, "player":move.player, "moveIndex": move.moveIndex})
    except Exception as e:
        response["success"] = False
        app.logger.error(e)
    return json.dumps(response)

@app.route("/user", methods=["GET"])
def returnUserTemplate():
    return render_template("user.html.jinja", request)

@app.route("/user/<username>", methods=["GET"])
def returnUserPage(username):
    userFound = len(db.session.query(User).filter(User.username==username).all()) > 0
    if not userFound:
        abort(404)
    games = db.session.query(Game).filter(Game.attacker == username).union(db.session.query(Game).filter(Game.defender==username)).order_by(db.desc(Game.gameId)).all()
    for game in games:
        game.moves = [False]*9
        game.state = determineWinner(1)
        moves = db.session.query(Move).filter(Move.gameId == game.gameId).all()
        for move in moves:
            game.moves[move.movePosition] = move.player


    return render_template("user.html.jinja", request, {"username":username, "games": games, "userFound": userFound})

@app.route("/user/<username>", methods=["POST"])
def returnUserInfo(username):
    response = {"success":True}
    # TODO: optimize
    try:
        games = db.session.query(Game).filter(Game.attacker == username).union(db.session.query(Game).filter(Game.defender==username)).order_by(Game.gameId).all()
        response["games"] = [game.to_dict() for game in games]
        for game in response["games"]:
            game.pop("gameKey")
            moves = db.session.query(Move).filter(Move.gameId == game["gameId"]).all()
            game["moves"] = [move.to_dict() for move in moves]
        return json.dumps(response)
    except Exception as e:
        app.logger.error(e)
        return json.dumps({"success":False})

@app.route("/startNewGame", methods=["POST"])
def startNewGame():
    response = {"success":True}
    try:
        username = checkToken(request.cookies["token"]) if "token" in request.cookies.keys() else None
        game = Game(username)
        db.session.add(game)
        db.session.flush()
        db.session.refresh(game)
        db.session.commit()
        response["data"] = {}
        response["data"]["_gameId"] = game.gameId
        response["data"]["gameId"] = game.idToHexString()
        if not username:
            response["data"]["gameKey"] = game.gameKey
    except Exception as e:
        app.logger.error(e)
        response["success"] = False
    return json.dumps(response)

@app.route("/makeMove", methods=["POST"])
def makeMove():
    response = {"success":True}
    try:
        username = checkToken(request.cookies["token"]) if "token" in request.cookies.keys() else None
        app.logger.info(username)
        gameId = int("0x" + request.form["gameId"], 16)
        app.logger.info(gameId)
        gameKey = request.form["gameKey"] if "gameKey" in request.form else None
        app.logger.info(gameKey)
        entries = db.session.query(Game).filter(Game.attacker == username).union(db.session.query(Game).filter(Game.defender == username)).filter(Game.gameId == gameId).all() if username else db.session.query(Game).filter(Game.gameKey == gameKey).filter(Game.gameId == gameId).filter(Game.attacker == None).all()
        app.logger.info(entries)

        if not len(entries) == 1:
            raise ValueError("no entries found")

        game = entries[0]
        db.session.add(Move(game.gameId, int(request.form["movePosition"]), username))
        db.session.commit()

        # played as guest, therefore playing vs. bot, calling bot for solution
        if gameKey:
            board = [1 if name==username else 0 if name==False else -1 for name in  getBoard(game.gameId)]
            app.logger.info(board)
            solution = solver(boardify(",".join(map(str,board))), "defender")
            # 2d index to 1d => x + y*3 (counting from 0)
            db.session.add(Move(game.gameId, solution[1]+solution[0]*3, os.environ["BOT_USERNAME"]))
            db.session.commit()
    except Exception as e:
        app.logger.error("ERROR makeMove")
        app.logger.error(traceback.format_exc())
        response["success"] = False
    return json.dumps(response)

@app.route("/viewGame", methods=["POST"])
def sendGameInfo():
    response = {"success":True}
    try:
        gameId = int("0x" + request.form["gameId"], 16)
        response["data"] = [{"gameId":i.gameId, "moveIndex":i.moveIndex, "movePosition":i.movePosition, "player": i.player} for i in db.session.query(Move).filter(Move.gameId == gameId).all()]
    except Exception as e:
        app.logger.error(e)
        response["success"] = False
    return json.dumps(response)

@app.route("/signup", methods=["POST"])
def signupSubmission():
    response = {"success":True}
    try:
        # insert values to db
        db.session.add(User(request.form["username"], request.form["email"], request.form["key"], request.form["salt"]))
        db.session.commit()
        # generate a token
        response["data"] = {}
        response["data"]["token"] = generateToken(request.form["username"])
        response["data"]["token_expires"] = int(os.environ["SESSION_TIMEOUT"]) + round(time.time())
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
    board = boardify(request.form["board"])
    solution = solver(board, request.form["role"])
    return json.dumps(solution)
    # return render_template("msg.html", request)

    # return secrets.token_hex(256//2)

# for .well-known stuff (e.g. acme-challenges for ssl-certs)
#
# note that directory traversal volnerabilities are prevented by send_from_directory 
# as it checks if the path of the absolute file is inside the given directory (see https://tedboy.github.io/flask/_modules/flask/helpers.html#send_from_directory)
@app.route("/.well-known/<path:filename>")
def wellKnown(filename):
    return send_from_directory("/.well-known", filename)

@app.route("/robots.txt")
def robots():
    return "User-agent: *\nDisallow: *"

# only debug if not as module
if __name__ == "__main__":    
    # returns true if server is reachable
    def serverUp():
        try:
            db.create_all()
            print("database initialized")
            return True
        except Exception as e:
            print("Failed to initialize")
            print(e)
            return False

    # starts https server, returns false if failed
    def startHttpsServer():
        try:
            if "CERT_DIR" not in os.environ:
                raise ValueError("CERT_DIR not given (config in .env file)")
            if "HTTPS_PORT" not in os.environ:
                raise ValueError("HTTPS_PORT not given (config in .env file)")
            sslContext = tuple([os.path.join(os.environ["CERT_DIR"], i) for i in ['cert.pem', 'privkey.pem']])
            print("starting server with ssl on port", os.environ["HTTPS_PORT"], "ssl context=", sslContext)
            # 0.0.0.0 => allow all adresses to have access (important for docker-environment)
            httpsServer = WSGIServer(('0.0.0.0', int(os.environ["HTTPS_PORT"])), app, certfile=sslContext[0], keyfile=sslContext[1])
            httpsServer.serve_forever()
            return True
            # app.run(host="0.0.0.0", port=os.environ["HTTPS_PORT"], ssl_context=sslContext)
        except Exception as e:
            print("ERROR starting server on https:", e)
            print("starting HTTP server instead...")
            os.environ["HTTP_PORT"] = 80 if not "HTTP_PORT" in os.environ else os.environ["HTTP_PORT"]
            return False

    # starts http server, returns false if failed
    def startHttpServer():
        try:
            # 0.0.0.0 => allow all adresses to have access (important for docker-environment)
            print("starting server without ssl on port", os.environ["HTTP_PORT"])
            # app.run(host="0.0.0.0", port=os.environ["HTTP_PORT"])
            httpServer = WSGIServer(('0.0.0.0', int(os.environ["HTTP_PORT"])), app)
            httpServer.serve_forever()
            return True
        except Exception as e:
            print("ERROR starting server on http:", e)
            return False

    app.debug = True
    
    # wait for database to be reachable before starting flask server
    print("waiting for server to start")
    while not serverUp():
        print("server unreachable, waiting 5s")
        time.sleep(5)

    # add bot-user for AI
    try:
        db.session.add(User(os.environ["BOT_USERNAME"], os.environ["BOT_EMAIL"], secrets.token_hex(256//2), secrets.token_hex(256//2)))
        print("adding user")
        db.session.commit()
        print(db.session.query(User).all())
        print("bot user added")
    except Exception as e:
        print(e)

    try:
        print("adding sample data")
        addSampleData()
    except Exception as e:
        print(e)

    print("server reached and initialized, starting web-service")
    print("ssl enabled:", os.environ["ENABLE_SSL"])
    if "ENABLE_SSL" in os.environ and os.environ["ENABLE_SSL"].upper() == "TRUE" and not startHttpsServer():
        startHttpServer()
    else:
        startHttpServer()
    print("no server started because no ports were indicated.")
    