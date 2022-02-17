import numpy as np
# import matplotlib.pyplot as plt
import pickle, time, re, threading

class GameThread(threading.Thread):
    def __init__(self, gameField, threadName, count = False):
        threading.Thread.__init__(self)
        self.threadName = threadName
        self.gameField = gameField
        self.count = count

    def run(self):
        print("running thread {}".format(self.threadName))
        self.gameField.startRowOfGames(self.count)
        print("thread {} ended by itself".format(self.threadName))

class GameField:
    playerSymbols = {-1:"x",1:"o", 0:"□"}
    beginningPlayer = -1

    def __init__(self, players, boardSize, **kwargs):
        self.useLog = kwargs["useLog"] if "useLog" in kwargs else False
        self.winBy = kwargs["winBy"] if "winBy" in kwargs else boardSize[0]
        self.players = {-1:players[0], 1:players[1]}
        self.boardSize = boardSize
        self.enableRandomness = kwargs["enableRandomness"] if "enableRandomness" in kwargs else True
        self.winningPatterns = self.getWinningPatterns(self.winBy)

    def reset(self, fullReset=False):
        self.boardSize = self.boardSize
        self.players = self.players
        if fullReset:
            for player in self.players.values():
                player.resetPlayer()
                if self.useLog:
                    player.save()

    def makeMove(self, player, position):
        if self.board[position[0]][position[1]] == 0 and player.playerIndex == self.currentPlayerIndex:
            self.board[position[0]][position[1]] = player.playerIndex
        else:
            raise ValueError("invalid move")

    def rotate45(self,array2d):
            rotated = [[] for i in range(np.sum(array2d.shape)-1)]
            for i in range(array2d.shape[0]):
                for j in range(array2d.shape[1]):
                    rotated[i+j].append(array2d[i][j])
            return rotated

    def getWinningPatterns(self, winBy):
        return {-1:"(?P<_>-1){"+str(winBy)+",}", 1:"(?<!-)1{"+str(winBy)+",}"}

    def getWinner(self):
        # horizontal and vertical diagonal
        for i in [self.board, np.rot90(self.board), *[self.rotate45(i) for i in [self.board, self.board[::-1]]]]:
            for j in i:
                string = "".join(map(lambda x : str(int(x)), j))
                if(self.useLog):
                    print(string)
                for k in self.winningPatterns:
                    if(re.search(self.winningPatterns[k],string)):
                        if(self.useLog):
                            print("matched for", k)
                        return k
                    # else:
                        # print("no match")
        if 0 in self.board:
            return None
        return False
    
    def getWinner3by3(self):
        # horizontal and vertical diagonal
        for i in [self.board, np.rot90(self.board), [np.diagonal(i) for i in [self.board, self.board[::-1]]]]:
            for j in i:
                average = np.average(j)
                if abs(average) == 1: # will be 1.0 tho, therefore convert to int
                    return int(average)
        if 0 in self.board:
            return None
        return False

    def printBoard(self):
        print("\n----------\n "," ".join(map(str,[i for i in range(self.boardWidth)])))
        for i in range(self.boardHeight):
            print(i, " ".join(map(lambda x: self.playerSymbols[int(x)],self.board[i])))

    def start(self):
        while self.getWinner() == None:
            self.players[self.currentPlayerIndex].move()
            self.currentPlayerIndex *= -1
        self.giveRevard()
    
    def giveRevard(self):
        winner = self.getWinner()
        if winner: # if there is a winner
            self.players[winner].feedReward(1)
            self.players[winner*-1].feedReward(0)
        else:
            self.players[self.beginningPlayer].feedReward(.1)
            self.players[self.beginningPlayer*-1].feedReward(.5) # it is better to score a tie as defender

    def startRowOfGames(self, count = False, threadCount = False):
        if threadCount:
            self.threads = []
            print("starting {} threads".format(threadCount))
            for i in range(threadCount):
                thread = GameThread(self, i, count) if count else GameThread(self, i)
                thread.start()
                self.threads.append(thread)
            print("threads started...")

        elif count:
            print("playing {} games".format(count))
            winHistory = []
            percentTime = time.time()
            for i in range(count):
                if(i%(count//100) == 0):
                    timeUsed =(time.time()-percentTime)
                    percentDone = round(i/count*100)
                    print("{}% done, approx. {}s left".format(percentDone, round(timeUsed*(100-percentDone))))
                    percentTime = time.time()
                self.start()
                winHistory.append(self.getWinner())
                self.reset(True)
            print("done")
            data = {"-1":winHistory.count(-1), "1": winHistory.count(1),"tie": winHistory.count(False)}
            # for plotting the stats
            # gameStates = list(data.keys())
            # frequency = list(data.values())
            # plt.bar(gameStates, frequency)
            # plt.show()
            print(data)
        else:
            count = 0
            startTime = time.time()
            gameStats = []
            while True:
                if(count%1000 == 0):
                    oneKTime = time.time() - startTime
                    for player in self.players.values():
                        player.save()
                    startTime = time.time()
                    data = {"-1":gameStats.count(-1), "1": gameStats.count(1),"tie": gameStats.count(False)}
                    print("played {} rounds at {}s per 1000 games. {} wins for 1, {} wins for -1, {} ties".format(count, oneKTime, data["1"],data["-1"],data["tie"]))
                    gameStats =[]
                    
                self.start()
                gameStats.append(self.getWinner())
                self.reset(True)
                count+=1

    @property
    def enableRandomness(self):
        return self._enableRandomness

    @enableRandomness.setter
    def enableRandomness(self, value):
        self._enableRandomness = value
        for player in self.players.values():
            player.enableRandomness = value

    @property
    def boardSize(self):
        return self._boardSize

    @boardSize.setter
    def boardSize(self, boardSize):
        self._boardSize = boardSize
        self.boardWidth =  boardSize[0]
        self.boardHeight =  boardSize[1]
        self.board = np.zeros((self.boardHeight, self.boardWidth))

    @property
    def players(self):
        return self._players

    @players.setter
    def players(self, value):
        self.currentPlayerIndex = self.beginningPlayer
        for i in value: # => [-1, 1]
            value[i].setPlayerSymbol(self.playerSymbols[i])
            value[i].setPlayerIndex(i)
            value[i].setGameField(self)
        self._players = value

class Player:
    def __init__(self, exp_rate = 0.3):
        self.exp_rate = exp_rate
        self.enableRandomness = True
        self.lr = 0.2
        self.decay_gamma = 0.9
        self.boardScores = {}
        self.knownBoards = []
        self.roundBoards = []

    def setPlayerSymbol(self, symbol):
        self.symbol = symbol
    
    def setGameField(self, gameField):
        self.gameField = gameField
    
    def setPlayerIndex(self, index):
        self.playerIndex = index

    def move(self):
        bestMove = self.getBestMove()
        if(self.gameField.useLog):
            print("best move = {}".format(bestMove))
        self.gameField.makeMove(self, bestMove)
        self.roundBoards.append(self.getBoardIdentifier(self.gameField.board))
    
    def getBestMove(self):
        validMoves = self.getValidMoves()
        if np.random.uniform(0, 1) <= self.exp_rate and self.enableRandomness:
            if(self.gameField.useLog):
                print("randomness chose to make a random move")
            return validMoves[np.random.choice(len(validMoves))]
        else:
            if(self.gameField.useLog):
                print("finding best move")
            highestScore = float("-inf")
            for move in validMoves:
                possibleBoard = self.gameField.board.copy()
                possibleBoard[move[0]][move[1]] = self.playerIndex
                possibleBoardId = self.getBoardIdentifier(possibleBoard)
                if(self.gameField.useLog):
                    print("score for board {} is {}".format(possibleBoardId, self.boardScores.get(possibleBoardId)))
                score = 0 if self.boardScores.get(possibleBoardId) is None else self.boardScores.get(possibleBoardId)
                if score >= highestScore:
                    highestScore = score
                    action = move
            return action

    def getValidMoves(self):
        # if(self.gameField.useLog):
            # print("board:", self.gameField.board)
            # print("valid moves:", np.argwhere(self.gameField.board == 0))
        return np.argwhere(self.gameField.board == 0)

    def getBoardIdentifier(self, board):
        boardIdentifier = str(board.reshape(self.gameField.boardHeight * self.gameField.boardWidth))
        return boardIdentifier

    def feedReward(self, reward):
        for boardId in reversed(self.roundBoards):
            if self.boardScores.get(boardId) is None:
                # give board the score of 0 if it is not known
                self.boardScores[boardId] = 0
            # set score to board
            # bellman equation
            # V = (1-α)V + α(r, γV)
            # V = V - αV + αr + γV
            # V = V + α * (r + γV - V)
            # score[V] += learningRate[α] * ( r[?] + reward[γV] - score[V] )
            self.boardScores[boardId] += self.lr * (self.decay_gamma * reward - self.boardScores[boardId]) 
            # set reward for next board
            reward = self.boardScores[boardId]

    def resetPlayer(self):
        self.roundBoards = []
    def getFilename(self):
        return "policy_{}_{}_{}_{}.pkl".format(self.gameField.boardWidth,self.gameField.boardHeight, self.gameField.winBy, self.symbol)
    def save(self):
        try:
            with open(self.getFilename(), "wb") as f:
                pickle.dump(self.boardScores, f)
            print("file", self.getFilename(),"saved")
        except:
            print("fatal: failed to save progress")
    
    def load(self):
        try:
            with open(self.getFilename(), "rb") as f:
                self.boardScores = pickle.load(f)
            print("file", self.getFilename(),"loaded")
        except:
            print("failed to load")
            self.boardScores = {}

class HumanPlayer:
    def __init__(self):
        self.reward  = 0

    def setPlayerSymbol(self, symbol):
        self.symbol = symbol
     
    def setGameField(self, gameField):
        self.gameField = gameField
    
    def setPlayerIndex(self, index):
        self.playerIndex = index

    def move(self):
        self.gameField.printBoard()
        while True:
            try:
                x = input("enter x:")
                y = input("enter y:")
                self.gameField.makeMove(self, [int(y),int(x)])
                break
            except:
                print("illegal move")
                pass    

    def feedReward(self, reward):
        self.reward += reward
        print("your current score:", self.reward)
    
    def resetPlayer(self):
        pass
    def load(self):
        pass
    def save(self):
        pass

if __name__ == "__main__":
    attacker = Player()
    # attacker = HumanPlayer()
    defender = Player()
    # defender = HumanPlayer()
    game = GameField([attacker, defender], [3,3], useLog = False, enableRandomness = True, winBy = 3)
    attacker.load()
    defender.load()
    # game.start()
    game.startRowOfGames(500000, False)

    # attacker.save()
    # defender.save()