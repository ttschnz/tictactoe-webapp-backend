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
# for cronjob (restart server on update)
from flask_apscheduler import APScheduler
# we will use os to access enviornment variables stored in the *.env files, time for delays and json for ajax-responses
import os, time, json, random, sys, numpy as np, re
import secrets
import subprocess
# for debugging
# import traceback
from datetime import datetime

# add RL-A to importable 
sys.path.insert(0, '/code/RL-A/')
from TTTsolver import TicTacToeSolver, boardify
solver = TicTacToeSolver("presets/policy_p1","presets/policy_p2").solveState

# initialize flask application with template_folder pointed to public_html (relative to this file)
app=Flask(__name__)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = True
app.config["SQLALCHEMY_DATABASE_URI"] =  f"postgresql://{os.environ['POSTGRES_USER']}:{os.environ['POSTGRES_PASSWORD']}@db/tictactoe"
# app.config['SQLALCHEMY_ECHO'] = True
# prettify app
prettify = Prettify(app)
db = SQLAlchemy(app)

# proxy for default render template, passes the filename to the actual render_template fn and wether the user is signed in or not
def render_template(fileName, request, opts = False):
    username = checkToken(request.cookies["token"]) if "token" in request.cookies.keys() else False
    return rt_(fileName, opts=opts, username=username if username else False, version=os.popen("git -C '/' log -n 1 --pretty=format:'%H'").read(), behind=os.popen("git rev-list $(git -C '/' log -n 1 --pretty=format:'%H')..HEAD | grep -c ^").read())

def cronjob(*args):
    app.logger.info("cronjob executed")
    if not os.popen("git rev-parse HEAD").read().rstrip() == versionHash:
        app.logger.info("restarting server for update...")
        os._exit(1)
    else:
        app.logger.info("no update required")
    return 

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

    @staticmethod
    def authorize(username, key):
        app.logger.info(username)
        app.logger.info(key)
        return db.session.query(User).filter(User.username==username).filter(User.key==key).count()==1

    @staticmethod
    def authorizeRequest(request):
        return User.authorize(request.form["username"], request.form["key"])
    
    @staticmethod
    def find(username):
        return db.session.query(User).filter(User.username==username)

    @staticmethod
    def generateFromRequest(request):
        user = User(request.form["username"], request.form["email"], request.form["key"], request.form["salt"])
        db.session.add(user)
        db.session.commit()
        db.session.refresh(user)
        return user
    
    def getGames(self, limit, lastGameId):
        return db.session.query(Game).filter(Game.attacker == self.username).union(db.session.query(Game).filter(Game.defender==self.username)).filter(Game.gameId < lastGameId).order_by(Game.gameId.desc()).limit(limit).all()

# table to store games and their players to
class Game(db.Model, SerializerMixin):
    __tablename__ = "games"
    gameId = db.Column(db.Integer(), primary_key=True, autoincrement="auto", name="gameid")
    gameKey = db.Column(db.String(32))
    attacker = db.Column(db.String(16), db.ForeignKey("users.username"))
    defender = db.Column(db.String(16), db.ForeignKey("users.username"))
    winner = db.Column(db.String(16), db.ForeignKey("users.username"))
    isEven = db.Column(db.Boolean(), default=False)
    gameFinished = db.Column(db.Boolean(), default=False, nullable=False)
    timestamp = db.Column(db.TIMESTAMP,server_default=db.text('CURRENT_TIMESTAMP'))
    ONGOING=0
    FINISHED=1
    def __init__(self, player):
        # app.logger.info("game player username", player)
        self.attacker = player if player else None
        self.defender = os.environ["BOT_USERNAME"]
        # only set key if not with an account
        self.gameKey = hex(random.randrange(16**32))[2:] if not player else None

    # determines the game and sets gameFinished, and winner to the appropriate values 
    def determineState(self):
        board = self.getNumpyGameField()
        winner = self.getWinnerOfBoard(board)
        app.logger.info(f"determined winner: {winner}")
        if(winner == False or winner == 1 or winner == -1):
            app.logger.info("game finished")
            self.gameFinished = True
            if(winner != False):
                self.winner = self.attacker if winner == 1 else self.defender
            else:
                self.isEven = True
        else:
            app.logger.info("game not finished yet")
        db.session.commit()

    # transforms the game-id (int) to a hex-string
    def idToHexString(self, length=6):
        return ("0" * length + hex(self.gameId)[2:])[-6:]

    # returns all moves associated with this game
    def getMoves(self):
        return db.session.query(Move).filter(Move.gameId == self.gameId).all()

    # returns game field in one-dimensional array with {attacker:1, defender:-1, empty:0}
    def getGameField(self):
        moves = self.getMoves()
        field = [0]*9
        for move in moves:
            if move.player == self.attacker:
                field[move.movePosition] = 1 
            else:
                field[move.movePosition] = -1
        return field

    def getNumpyGameField(self):
        field = np.empty(9, dtype="float64")
        field[:] = self.getGameField()
        return field

    def getGameInfo(self):
        info = {}
        info["attacker"] = self.attacker
        info["defender"] = self.defender
        info["gameId"] = self.gameId
        info["winner"] = self.winner
        info["gameField"] = self.getGameField()
        info["isFinished"] = self.gameFinished
        info["isEven"] = self.isEven
        return info

    # gets the winner of game (string), None if even, False if ongoing
    def getWinner(self):
        if not self.gameFinished:
            return False 
        else:
            return self.getMoves()[-1].player

    # returns state of game => Game.ONGOING | Game.FINISHED
    def getGameState(self):
        return self.ONGOING if self.getWinner() == False else self.FINISHED

    def toResponse(self):
        response = {"data":{}}
        # response["data"]["_gameId"] = self.gameId
        response["data"]["gameId"] = self.idToHexString()
        response["success"]=True
        if not (self.attacker and self.defender):
            response["data"]["gameKey"] = self.gameKey
        return response
    
    def authenticate(self, username, gameKey):
        return self.attacker == username or self.defender == username or self.gameKey == gamekey

    @staticmethod
    def find(gameId):
        return db.session.query(Game).filter(Game.gameId == gameId).one()

    @staticmethod
    def findByHex(gameId):
        return Game.find(int("0x" + gameId, 16))

    @staticmethod
    def rotate45(array2d):
        rotated = [[] for i in range(np.sum(array2d.shape)-1)]
        for i in range(array2d.shape[0]):
            for j in range(array2d.shape[1]):
                rotated[i+j].append(array2d[i][j])
        return rotated
    @staticmethod
    def createWithUser(username):
        game = Game(username)
        db.session.add(game)
        db.session.commit()
        db.session.refresh(game)
        return game
    
    @staticmethod
    # @returns players number if he wins, elseif even False else None
    def getWinnerOfBoard(board):
        app.logger.info(f"getting winner of board={board}")
        board = board.reshape((3,3))
        app.logger.info(f"getting winner of reshaped board={board}")
        app.logger.info(f"test-rotate: {np.rot90(board)}")
        # once normal, once rotated by 45 degrees and only 3rd row of that ([2:3]) (diagonal 1) and once rotated by -45 degrees (also only 3rd row) (diagonal 2)
        for i in [board, np.rot90(board, axes=(0,1)), *[Game.rotate45(j)[2:3] for j in [board, board[::-1]]]]:
            app.logger.info(f"determining winner of sub-board {i}")
            # for every line
            for j in i:
                app.logger.info(f"looking at row {j}")
                # figure out if the average is exactly the same as the first entry
                if sum(j)/len(j) == j[0] and 0 not in j:
                    return j[0]
        if 0 in board:
            return None
        return False

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
        self.movePosition = int(movePosition)
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

    @staticmethod
    def fromXY(coords, user, gameId):
        # 2d index to 1d => x + y*3 (counting from 0)
        app.logger.info(f"creating move from coords: {coords}, user={user}, gameId={gameId}")
        move = Move(gameId, int(coords["x"])+int(coords["y"])*3, user)
        db.session.add(move)
        db.session.commit()
        db.session.refresh(move)
        return move

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
    
    @staticmethod
    def generateToken(username):
        try:
            instance = Session(username, secrets.token_hex(256//2))
            db.session.add(instance)
            db.session.commit()
            return instance
        except Exception as e:
            app.logger.error(e)
            return False

    @staticmethod
    def find(sessionKey):
        return db.session.query(Session).filter(Session.sessionKey==sessionKey)

    @staticmethod
    def authenticateRequest(request):
        token = re.match(r"(Bearer)\ ([0-f]*)", request.headers["Authorisation"]).groups()[-1] if "Authorisation" in request.headers else None
        app.logger.info(f"authenticating token {token}")
        session = Session.find(token).one() if token else None
        return session.username if session else None

    def toResponse(self):
        response = {"success":True}
        response["data"] = {}
        response["data"]["token"] = self.sessionKey
        response["data"]["token_expires"] = self.getExpiration()
        response["data"]["inCompetition"] = Competition.hasJoined(self.username)
        return response

    def getExpiration(self):
        db.session.refresh(self)
        return int(os.environ["SESSION_TIMEOUT"]) + int(self.sessionStart.timestamp())


class Competition(db.Model, SerializerMixin):
    __tablename__ = "competition"
    username = db.Column(db.String(16), db.ForeignKey("users.username"), nullable=False, primary_key=True)
    firstName = db.Column(db.String(32), nullable=False, name="firstname")
    lastName = db.Column(db.String(32), nullable=False, name="lastname")
    age = db.Column(db.Integer(), nullable=False)
    gender = db.Column(db.String(1), nullable=False)
    timestamp = db.Column(db.DateTime(), nullable=False, name="joinedon", server_default=db.text('CURRENT_TIMESTAMP'))

    def __init__(self, user, firstName, lastName, age, gender):
        self.username = user.username
        self.firstName = firstName
        self.lastName = lastName
        self.age = int(age)
        self.gender = gender
        self.checkValidity()

    def checkValidity(self):
        valid = True
        valid = valid and len(self.firstName)>0
        valid = valid and len(self.lastName)>0
        valid = valid and self.age >= 0
        valid = valid and self.age < 100
        valid = valid and self.gender in ["m", "f", "?"]
        if not valid:
            raise ValueError("invalid inputs for competition")
        return valid
    
    @staticmethod
    def generateFromRequest(request):
        user = User.find(Session.authenticateRequest(request)).one()
        competition = Competition(user, request.form["firstName"], request.form["lastName"], request.form["age"], request.form["gender"])
        db.session.add(competition)
        db.session.flush()
        db.session.refresh(competition)
        db.session.commit()
        return competition
    
    @staticmethod
    def hasJoined(username):
        # try:
        return db.session.query(Competition).filter(Competition.username == username).count() > 0
        # except Exception as e:
            # app.logger.error(e)


@app.route('/manifest.json')
@app.route('/manifest.manifest')
def webAppManifest():
    return send_from_directory('static', 'manifest.json')

@app.route('/serviceWorker.js')
def serviceWorker():
    return send_from_directory('static', 'serviceWorker.js')
# return appLoader.html on all GET requests
@app.route('/', defaults={'path': ''}, methods=["GET"])
@app.route('/<path:path>', methods=["GET"])
def appLoader(path):
    return send_from_directory('static', "appLoader.html")

# authentication
@app.route("/getsalt", methods=["POST"])
def getsalt():
    # returns salt for keygeneration of demanded user
    response = {"success":True}
    try:
        user = User.find(request.form["username"]).one()
        response["data"] = user.salt
    except:
        response["success"] = False
    return json.dumps(response)

@app.route("/login", methods=["POST"])
def loginSubmission():
    try:
        # check if users credentials match and generate a token
        response = Session.generateToken(request.form["username"]).toResponse() if User.authorizeRequest(request) else {"success":False}
    except:
        response = {"success": False}
    return json.dumps(response)

@app.route("/signup", methods=["POST"])
def signupSubmission():
    try:
        # create user
        user = User.generateFromRequest(request)
        # generate a token
        response = Session.generateToken(user.username).toResponse()
    except Exception as e:
        app.logger.error(e)
        response = {"success": False}
    return json.dumps(response)

@app.route("/joinCompetition", methods=["POST"])
def joinCompetition():
    try:
        competition = Competition.generateFromRequest(request)
        response = {"success":True}
    except Exception as e:
        app.logger.error(e)
        response = {"success": False}
    return json.dumps(response)

@app.route("/game/<gameId>", methods=["POST"])
def returnGameInfo(gameId):
    response = {"success":True}
    try:
        game = Game.find(gameId)
        response["game"] = game.to_dict()
        response["moves"] = game.getMoves()
    except Exception as e:
        response["success"] = False
        app.logger.error(e)
    return json.dumps(response)

@app.route("/games", methods=["POST"])
def getGameList():
    response = {"success":True}
    LIMIT = 2
    try:
        games = []
        lastGameId = float(request.form["gameId"] if "gameId" in request.form else "inf")
        for game in db.session.query(Game).filter(Game.gameId < lastGameId).order_by(Game.gameId.desc()).limit(LIMIT).all():
            games.append(game.getGameInfo())
        response["data"]=games
    except Exception as e:
        response["success"]=False
        app.logger.error(e)
    return json.dumps(response)

@app.route("/user/<username>", methods=["POST"])
def returnUserPage(username):
    response = {"success":True}
    LIMIT = 2
    try:
        user = User.find(username).one()
        if not user:
            abort(404)
        games = []
        lastGameId = float(request.form["gameId"] if "gameId" in request.form else "inf")
        for game in user.getGames(LIMIT, lastGameId):
            games.append(game.getGameInfo())
        response["data"]={"user":user.username, "games": games}
    except Exception as e:
        response["success"] = False
        app.logger.error(e)
    return json.dumps(response)

@app.route("/checkCredentials", methods=["POST"])
def checkCredentials():
    try:
        username = Session.authenticateRequest(request)
        if(username == None):
            raise Exception("invalid token")
        response = {"success": True, "data": username}
        return json.dumps(response)
    except Exception as e:
        app.logger.error(e)
        response = {"success": False}
        return json.dumps(response)

@app.route("/startNewGame", methods=["POST"])
def startNewGame():
    try:
        username = Session.authenticateRequest(request)
        game = Game.createWithUser(username)
        response = game.toResponse()
        return json.dumps(response)
    except Exception as e:
        app.logger.error(e)
        response={"success": False}
        return json.dumps(response)

@app.route("/makeMove", methods=["POST"])
def makeMove():
    
    try:
        game = Game.findByHex(request.form["gameId"])
        username = Session.authenticateRequest(request)
        gameKey = request.form["gameKey"] if "gameKey" in request.form else None

        if not game.authenticate(username, gameKey):
            raise ValueError("no entries found")
        if game.gameFinished:
            raise ValueError("Game finished, no moves allowed")
        db.session.add(Move(game.gameId, int(request.form["movePosition"]), username))
        db.session.commit()
        # re-calculate games state after commit of move
        game.determineState()

        # if game is not finished and bot is attacker or defender, let RL-A decide on the next move
        if game.getGameState() == Game.ONGOING and os.environ["BOT_USERNAME"] in [game.attacker, game.defender]:
            solution = solver(game.getNumpyGameField().reshape((3,3)), "defender", app.logger.info)
            app.logger.info(f"found solution to board: {solution}")
            move = Move.fromXY({"y":solution[0], "x":solution[1]},os.environ["BOT_USERNAME"], game.gameId)
            # re-calculate game's state after RL-A's move
            game.determineState()
        else:
            app.logger.info("game finished, no moves made by RL-A")
        response = {"success": True}

    except Exception as e:
        # app.logger.error(traceback.format_exc())
        response = {"success": False}

    return json.dumps(response)

@app.route("/viewGame", methods=["POST"])
def sendGameInfo():
    response = {"success":True}
    try:
        game = Game.findByHex(request.form["gameId"])
        moves = game.getMoves()
        response["data"]={"moves": [move.to_dict() for move in moves], "gameState":{"finished":game.gameFinished, "winner":game.winner, "isEven":game.isEven}, "players":{"attacker": game.attacker, "defender": game.defender}}
        
        # Move.findByGame()
        # gameId = int("0x" + request.form["gameId"], 16)
        # response["data"] = [{"gameId":i.gameId, "moveIndex":i.moveIndex, "movePosition":i.movePosition, "player": i.player} for i in db.session.query(Move).filter(Move.gameId == gameId).all()]
    except Exception as e:
        app.logger.error(e)
        response["success"] = False
    return json.dumps(response)
@app.route("/version", methods=["GET", "POST"])
def getVersion():
    response = {"success":True}
    try:
        remoteVersion = os.popen("git ls-remote origin -h HEAD").read().rstrip()
        app.logger.info('versions',remoteVersion, versionHash)
        response["data"]={"versionHash":versionHash, "upToDate":remoteVersion.startswith(versionHash)}
    except Exception as e:
        response["success"] = False
    return json.dumps(response)
# just for testing stuff
@app.route("/test", methods=["GET", "POST"])
def test():
    app.logger.info(request.form)
    # board = boardify(request.form["board"])
    # solution = solver(board, request.form["role"])
    return json.dumps({"success":True})
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
    versionHash = os.popen("git rev-parse HEAD").read().rstrip()
    # compile ts to js
    print("starting compiling watch...")
    subprocess.Popen(['tsc', '--watch'], cwd="/code")
    # print(os.popen("tsc --project /code/tsconfig.json").read())
    print("watch started")

    # add sample data for testing
    def addSampleData(dataCount=0):
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

    print("setting up cronjob")
    scheduler = APScheduler()
    scheduler.add_job(id="cronjob", func=cronjob, trigger="interval", seconds=10)
    scheduler.start()
    print("cronjob started")

    print("ssl enabled:", os.environ["ENABLE_SSL"])
    if "ENABLE_SSL" in os.environ and os.environ["ENABLE_SSL"].upper() == "TRUE" and not startHttpsServer():
        startHttpServer()
    else:
        startHttpServer()
    print("no server started because no ports were indicated.")
    