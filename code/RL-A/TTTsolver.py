import numpy as np
import pickle, json
import sys
import pathlib

class TicTacToeSolver:
    def __init__(self, attackerFile, defenderFile) -> None:
        try:
            with open(str(pathlib.Path(__file__).parent.resolve()) + "/" + attackerFile, "rb") as f:
                self.attackerScores = pickle.load(f)
                f.close()
            print("attackerfile loaded")
        except Exception as e:
            print("failed to load", attackerFile)
            print(e)
            pass
        
        try:
            with open(str(pathlib.Path(__file__).parent.resolve()) + "/" +defenderFile, "rb") as f:
                self.defenderScores = pickle.load(f)
                f.close()
            print("defenderFile loaded")
        except Exception as e:
            print("failed to load", defenderFile)
            print(e)
            pass

    def solveState(self, board, role):
        highestScore = float("-inf")

        print(f"playing as {role}")
        scores = self.defenderScores if role == "defender" else self.attackerScores
        currentPlayer = -1 if role == "attacker" else 1
        action = [-1,-1]
        print(self.getBoardIdentifier(board))
        for move in self.getValidMoves(board):
            possibleBoard = board.copy()
            possibleBoard[move[0]][move[1]] = currentPlayer
            possibleBoardId = self.getBoardIdentifier(possibleBoard)
            score = 0 if scores.get(possibleBoardId) is None else scores.get(possibleBoardId)
            print(possibleBoardId, score)
            if score >= highestScore:
                highestScore = score
                action = move
        return action.tolist()

    def getBoardIdentifier(self, board):
        boardIdentifier = str(board.reshape(np.prod(board.shape)))
        return boardIdentifier

    def getValidMoves(self, board):
        print(board)
        return np.argwhere(board == 0)

# transforms a string like 1,-1,0,1,1,0,-1,-1,... to a solvable board
def boardify(data):
    board = np.empty(9, dtype="float64") 
    board[:] = data.split(",")
    board = board.reshape((3,3))
    return board

if __name__ == "__main__":
    solver = TicTacToeSolver("policy_3_3_x.pkl","policy_3_3_o.pkl")
    while True:
        try:
            board = np.empty(9, dtype="float64") 
            if len(sys.argv) > 1:
                board[:] = sys.argv[1].split(",")
            else:
                board[:] = (input("enter board like 1,-1,0,1,0,... : ").split(","))
            y,x = (solver.solveState(np.reshape(board, (3,3))))
            print(json.dumps({"x":int(x), "y":int(y)}))
            break
        except Exception as e:
            print("cannot handle your input, try again...")
            print(e)