import WebApp, {
    JSONResponse
} from "./webapp";
import {
    BasicElement,
    Container,
    FlexContainer,
    FlexContainerRow,
    Link,
    MaterialIcon,
    Span,
    Popup,
    PrimaryButton,
    Button,
    Tile,
    Heading,
    FlexContainerColumn,
    ClickableElmnt,
    UserSpan,
    Table,
    TableRow,
    SortableTableHeadingRow,
    SortableTableHeading
} from "./elements.js";
import {
    game,
    home,
    signup
} from "./states.js";

export type PositionIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Coord = 0 | 1 | 2;
export interface Coords {
    0: Coord,
        1: Coord
};
export interface UserShortStats {
    defeatCount: number,
        drawCount: number,
        username: string,
        winCount: number
}
export interface PostGameInfo {
    attacker: string
    defender: string
    gameField: Array < -1 | 0 | 1 >
        gameId: number
    isDraw: boolean
    isFinished: boolean
    winner: string | null | false
}

export interface Move {
    gameId: string,
        moveIndex: number,
        movePosition: PositionIndex,
        player: string
}
export interface GameMetaData {
    players: {
            attacker: string | null,
            defender: string
        },
        gameState: {
            finished: boolean,
            winner: string | null,
            isDraw: boolean
        }
};

export class TicTacToeGame {
    _gameMetaData: GameMetaData;
    attacker = {
        icon: "x",
        number: 1
    };
    defender = {
        icon: "o",
        number: -1
    };
    emptyField = {
        icon: "false",
        number: 0
    }
    iconMap = {
        "1": "x",
        "x": "1",
        "o": "-1",
        "-1": "o",
        "0": "false",
        "false": "0"
    }
    moves: Move[];
    gameNumberContainer: BasicElement;
    gameStateContainer: BasicElement;
    /**
     * Represents an existing game, to create call TicTacToeGame.createNew()
     * @param gameId ID of Game
     * @param app instance of WebApp, for API and logging 
     * @param authenticator instance of Authenticator to authenticate requests, only used for unfinished games
     * @param _gameData 
     */
    constructor(public gameId: string, private app: WebApp, public renderTarget ? : TicTacToeGameContainer, public infoTarget ? : Container, public gamePlayerInfo ? : GamePlayerInfo, public authenticator ? : Authenticator, private _gameData: Number[][] = Array(3).fill(0).map(x => Array(3).fill(null))) {
        this.generateInfo();
        if (this.renderTarget) this.refreshState(true);
    }

    set gameData(data: Number[][]) {
        this.app.log(`gameData setter called`);
        if (this.renderTarget) this.renderTarget.activate(this);
        if (this.renderTarget) this.renderTarget.renderData(data);
        this.updateInfo();
        this._gameData = data;
    }

    get gameData(): Number[][] {
        return this._gameData;
    }

    get gameUrl(): string {
        return `${document.location.origin}/games/${this.gameId}`;
    }

    set gameMetaData(value: GameMetaData) {
        this._gameMetaData = value;
        this.gamePlayerInfo.resolve(this);
        if (value.gameState.finished) this.renderTarget.gameState = value.gameState;
    }
    get gameMetaData(): GameMetaData {
        return this._gameMetaData;
    }

    /**
     * generates elements that should be show inside this.infotarget
     */
    generateInfo() {
        if (this.app.isSecureContext()) this.gameNumberContainer = new Link({
                action: (() => {
                    navigator.clipboard.writeText(this.gameUrl);
                }).bind(this)
            },
            new FlexContainer(
                new MaterialIcon("tag"),
                new Span(this.gameId),
                new MaterialIcon("content_copy").addClass("showOnHover")
            ).addClass("centered", "gameNumberContainer")
        ).addClass("noTextDecoration");

        else this.gameNumberContainer = new Container(
            new FlexContainer(
                new MaterialIcon("tag"),
                new Span(this.gameId)
            ).addClass("centered", "gameNumberContainer")
        );

        this.gameStateContainer = new Container(new Span("connected."));
        this.gameStateContainer.addClass("gameStateContainer");
    }
    showConfetti() {
        window["party"].confetti(this.renderTarget.element, {
            count: 80
        });
    }

    /**
     * updates the info shown inside this.infoTarget
     */
    updateInfo(firstUpdate = false) {
        this.app.log("updating info");
        if (!this.gameNumberContainer || !this.gameStateContainer) this.generateInfo();
        let infoSpan = (this.gameStateContainer.findChildren(Span, true)[0] as Span);
        // update the gameState to "your turn" or "opponents turn" depending on who did the last move. "finished: @username" if the game is done, "finished: Guest" if it is a guest
        if (this.gameMetaData && this.gameMetaData.gameState.finished) {
            // show who won
            infoSpan.update("finished: ",
                this.gameMetaData.gameState.isDraw ? "nobody" : this.gameMetaData.gameState.winner == null ? "Guest" : new UserSpan(this.gameMetaData.gameState.winner),
                " won");
            // show confetti if you are the winner and signed in
            if (this.app.credentials && this.gameMetaData.gameState.winner == this.app.credentials.username) this.showConfetti();
            // show confetti if you are a guest and the winner is a guest (requires a rule that guests can't play against each other)
            else if (!this.gameMetaData.gameState.isDraw && !this.app.credentials && this.gameMetaData.gameState.winner == null) this.showConfetti();
            // show popup to restart Game if the game has not just been loaded and the user has access to the game
            if (!firstUpdate && this.authenticator && this.app.credentials) this.app.getState().add(new Popup(new Span("Game finished. Do you want to play again?"), new PrimaryButton("New game", game), new Button("Home", home)));
            // show popup to restart Game if the game has not just been loaded and the user has access to the game and is a guest
            else if (!firstUpdate && this.authenticator) this.app.getState().add(new Popup(new Span("Game finished "), new PrimaryButton("Play again", game), new Button("Sign up and win", signup)));
        } else if (this.authenticator) infoSpan.update(this.isMyTurn() ? "your turn" : "opponents turn")
        else(this.gameStateContainer.findChildren(Span, true)[0] as Span).update("observer");
        this.infoTarget.add(this.gameNumberContainer);
        this.infoTarget.add(this.gameStateContainer);

        // update game player info if any are found
        let gamePlayerInfo = (this.infoTarget.element.parentElement["instance"] as BasicElement).findChildren(GamePlayerInfo, true);
        gamePlayerInfo.forEach(gpi => (gpi as GamePlayerInfo).update(this.getNextPlayer()));
        if (this.gameMetaData && this.gameMetaData.gameState.finished && !this.gameMetaData.gameState.isDraw) gamePlayerInfo.forEach(gpi => (gpi as GamePlayerInfo).win(this.evaluatePlayer(this.gameMetaData.gameState.winner)));
    }

    /**
     * makes a move and sends it to the server
     * @param x x-position of move
     * @param y y-position of move
     */
    async makeMove({
        x,
        y
    }: {
        x: Coord;y: Coord;
    }): Promise < boolean > {
        if (this.validateMove([x, y])) {
            this.app.log(`move at ${x}, ${y}`);
            this.moves.push({
                gameId: this.gameId,
                moveIndex: ((this.getLastMove() ?? {
                    moveIndex: -1
                }).moveIndex) + 1,
                movePosition: TicTacToeGame.coordsToMovePosition(x, y),
                player: "guest"
            });
            this.gameData[y][x] = this.attacker.number;
            this.renderTarget.renderData(this.gameData);
            this.updateInfo();
            await this.commitMove([x, y] as Coords);
            await this.refreshState();
            return true;
        } else return false;
    }
    async commitMove(coords: Coords) {
        let response = await this.app.api(...this.authenticator.authenticate("/makeMove", {
            gameId: this.gameId,
            movePosition: TicTacToeGame.coordsToMovePosition(coords[0], coords[1])
        }));
        if (response.success) return true;
        else this.app.showError("Failed to commit move to server.", {
            retry: (
                () => {
                    this.commitMove(coords);
                }).bind(this)
        });
    }
    /**
     * 
     * @returns the last move made on the game (not synced)
     */
    getLastMove(): Move {
        return this.moves.sort((moveA, moveB) => moveA.moveIndex - moveB.moveIndex)[this.moves.length - 1];
    }
    getNextPlayer(): number {
        this.app.log(`last move:`, this.getLastMove());
        if (this.getLastMove() == undefined) return this.attacker.number;
        else {
            // return 0 if game is finished (nobodies turn)
            if (this.gameMetaData && this.gameMetaData.gameState.finished) return 0
            // return attacker if last player was defender
            if (this.defender.number == this.evaluatePlayer(this.getLastMove().player)) return this.attacker.number
            // return defender if last player was attacker
            if (this.attacker.number == this.evaluatePlayer(this.getLastMove().player)) return this.defender.number
            // if not loaded yet, return 0 (nobodies turn)
            return 0
        }
    }
    isMyTurn(): boolean {
        return (((this.getLastMove() ?? {
            moveIndex: -1
        }).moveIndex) + 1) % 2 == 0;
    }

    /**
     * checks if move is allowed (valid)
     * @param coords where the move should be placed
     */
    validateMove(coords: Coords): boolean {
        // not allowed if no auth is set
        if (!this.authenticator) return false;

        // allowed if there are no moves
        let lastMove = this.getLastMove();
        if (lastMove == undefined) {
            console.log(`last move was undefined, therefore allowing move on coords ${coords}`);
            return true;
        }

        // by default the move is valid, we will check if it is invalid
        let valid = true;
        // is the field empty?
        let fieldIsEmpty = (this.gameData[coords[1]][coords[0]] == this.emptyField.number)
        valid = valid && fieldIsEmpty;
        // is the last player who made a move the enemy (currently the defender)?
        let lastPlayerWasEnemy = this.evaluatePlayer(lastMove.player) == this.defender.number;
        valid = valid && lastPlayerWasEnemy;
        this.app.log(`validating move on coords:${coords}, fieldIsEmpty=${fieldIsEmpty}, lastPlayerWasEnemy=${lastPlayerWasEnemy}`);
        return valid;
    }

    /**
     * creates an instance of TicTacToeGame after creating a game on the server and getting its credentials
     * @param app WebApp for API
     * @param renderTarget the target element to show the game to
     * @param infoTarget the element to show informations about the game
     * @returns Promisw which will be resolved to a TicTacToeGame instance
     */
    public static async createNew(app: WebApp, renderTarget: TicTacToeGameContainer, infoTarget: Container, gamePlayerInfo: GamePlayerInfo, ): Promise < TicTacToeGame > {
        let response = await app.api("/startNewGame", {}, true);
        if (response.success) return new TicTacToeGame(response.data.gameId, app, renderTarget, infoTarget, gamePlayerInfo, app.credentials ? Authenticator.fromUsername(app.credentials) : Authenticator.fromGameKey(response.data.gameKey));
        else app.showError("Game data could not be refreshed", {
            retry: TicTacToeGame.createNew.bind(undefined, app)
        });
    }

    /**
     * translates a positionIndex ([0,1,2,3,4,5,6,7,8]) to coords ([0,0], [0,1]) etc.
     * @param positionIndex 
     * @returns 
     */
    public static movePositionToCoords(positionIndex: PositionIndex): Coords {
        let y = Math.floor(positionIndex / 3) as Coord;
        let x = positionIndex - y * 3 as Coord;
        return [x, y]
    }

    /**
     * translates a coords to positionIndex
     * @param x 
     * @param y 
     * @returns 
     */
    public static coordsToMovePosition(x: Coords[0], y: Coords[1]): PositionIndex {
        return x + y * 3 as PositionIndex;
    }

    /**
     * evaluates the number of the player -1, 0, 1
     * -1 for defender, 1 for player, 0 for none
     * @param player 
     * @returns -1 | 0 | 1
     */
    evaluatePlayer(player: string): number {
        if (["bot"].indexOf(player) < 0) return this.attacker.number;
        else return this.defender.number;
    }

    /**
     * parses an array of moves to the game field
     * @param moves 
     * @returns 
     */
    setMoves(moves: Move[]): void {
        this.moves = moves;
        let gameData: Number[][] = Array(3).fill(0).map(_x => Array(3).fill(this.emptyField.number));
        for (let move of moves) {
            let coord = TicTacToeGame.movePositionToCoords(move.movePosition);
            gameData[coord[1]][coord[0]] = this.evaluatePlayer(move.player);
        }
        this.gameData = gameData;
    }

    /**
     * requests the games state from the server and renders it
     */
    async refreshState(firstUpdate = false): Promise < void > {
        let response = await this.app.api("/viewGame", {
            gameId: this.gameId
        });
        if (response.success) {
            this.setMoves(response.data.moves as Move[]);
            this.gameMetaData = {
                players: response.data.players,
                gameState: response.data.gameState
            } as GameMetaData;
            this.updateInfo(firstUpdate);
        } else this.app.showError("Game data could not be refreshed", {
            retry: this.refreshState
        });
    }
}
export class TicTacToeGameTile extends BasicElement {
    _game: TicTacToeGame;
    occupied: Boolean = false;
    _disabled: Boolean = false;
    constructor(public x: number, public y: number) {
        super("div");
        this.element.classList.add("gameTile", "loading");
        this.element.dataset.x = String(this.x);
        this.element.dataset.y = String(this.y);
        this.occupy();
    }

    occupy(user: string | boolean = false): void {
        this.element.dataset.occupiedBy = String(user);
    }

    set game(value) {
        if (!this.game) {
            this._game = value;
            if (this.game.authenticator) this.element.addEventListener("click", this.click.bind(this));
            this.element.classList.remove("loading");
        }
    }

    get game(): TicTacToeGame {
        return this._game;
    }

    set disabled(value: Boolean) {
        this._disabled = value;
        this.addClass("disabled");
    }

    get disabled() {
        return this._disabled;
    }

    async click(_event: MouseEvent): Promise < void > {
        if (!this.disabled) {
            if (!this.occupied) await this.game.makeMove({
                x: this.x as Coord,
                y: this.y as Coord
            }) || this.app.showError("invalid move: it is not your turn");
            else this.app.showError("invalid move: field is occupied")
        } else this.app.showError("game finished, no more moves possible");
    }

    activate(game: TicTacToeGame): void {
        this.game = game;
    }

    renderData(data: Number[][]): void {
        let occupyer = this.game.iconMap[String(data[this.y][this.x])];
        if (data[this.y] && data[this.x]) this.element.dataset.occupiedBy = occupyer;
        this.occupied = occupyer != this.game.emptyField.icon;
    }
}
export class TicTacToeMiniature extends Container {
    gameTiles: TicTacToeGameTile[] = [];
    game: TicTacToeGame;
    userMap: any;
    constructor(public gameInfo: PostGameInfo) {
        super();
        this.game = new TicTacToeGame(this.gameInfo.gameId.toString(16), this.app);
        this.userMap = {
            "1": "x",
            "-1": "o",
            "0": false
        }
        this.addClass("readonly")
        this.addClass("gameContainer");
        this.addClass("miniature");
        for (let y of [0, 1, 2]) {
            for (let x of [0, 1, 2]) {
                let tile = new TicTacToeGameTile(x, y);
                this.gameTiles.push(tile);
                this.element.appendChild(tile.element);
            }
        }
        for (let i in this.gameInfo.gameField) {
            this.gameTiles[i].occupy(this.userMap[String(this.gameInfo.gameField[i])]);
            this.gameTiles[i].game = this.game;
        }
    }

}
export class TicTacToeGameContainer extends Container {
    game: TicTacToeGame;
    gameTiles: TicTacToeGameTile[] = [];
    _gameState: GameMetaData["gameState"];
    constructor() {
        super();
        this.element.classList.add("gameContainer");
        for (let y of [0, 1, 2]) {
            for (let x of [0, 1, 2]) {
                let tile = new TicTacToeGameTile(x, y);
                this.gameTiles.push(tile);
                this.element.appendChild(tile.element);
                if (this.game) tile.activate(this.game);
            }
        }
    }
    set gameState(value: GameMetaData["gameState"]) {
        this._gameState = value;
        if (this.gameState.finished) {
            this.gameTiles.forEach(tile => tile.disabled = true);
            this.addClass("gameFinished");
        }
    }
    get gameState() {
        return this._gameState;
    }
    activate(game: TicTacToeGame): void {
        this.game = game;
        this.gameTiles.forEach(tile => tile.activate(game));
    }

    renderData(data: Number[][]): void {
        this.gameTiles.forEach(tile => tile.renderData(data))
    }
}
export class Authenticator {
    gameKey: string;
    username: string;
    token: string;
    password: string;

    constructor(private authFn: (target: string, data ? : any) => [gameKey: string, data: any, sendToken: boolean]) {

    }

    authenticate(target: string, data ? : any): [gameKey: string, data: any, sendToken: boolean] {
        return this.authFn(target, data);
    }

    public static fromGameKey(gameKey: string): Authenticator {
        let auth = new Authenticator((target: string, data ? : any) => {
            console.log(`authentcating ${target} from Game Key`);
            if (target == "/makeMove") return [target, {
                ...data,
                ...{
                    gameKey
                }
            }, false];
            else {
                console.log("skipping authentication for unknown target");
                return [target, data, false];
            }
        });
        auth.gameKey = gameKey;
        return auth;
    }

    public static fromUsername(_credentials): Authenticator {
        return new Authenticator((target: string, data ? : any) => {
            console.log(`authenticating ${target} from Username`);
            if (target == "/makeMove") return [target, {
                ...data
            }, true];
            else {
                console.log("skipping authentication for unknown target");
                return [target, data, true];
            }
        });
    }
}

export class PlayerInfo extends FlexContainer {
    isBot: boolean;
    map = {
        "-1": "radio_button_unchecked", // circle (o)
        "1": "close" // cross (x)
    };
    constructor(public playerName: string | null, public role: -1 | 1) {
        super();
        this.isBot = playerName == "bot";
        this.add(new MaterialIcon(this.map[String(role)]).addClass("playerSign"));
        this.add(new MaterialIcon(this.isBot ? "precision_manufacturing" : "person").addClass("playerIcon"));
        this.add(new UserSpan(playerName).addClass("playerName"));
        this.addClass("playerInfo");
    }
    update(nextPlayer) {
        console.log(`nextPlayer:`, nextPlayer);
        if (nextPlayer == this.role) this.addClass("myTurn");
        else this.removeClass("myTurn");
    }
    win(player) {
        if (player == this.role) this.addClass("winningPlayer");
    }
}
// currently only guest vs. bot, so no complicated stuff here
export class GamePlayerInfo extends FlexContainerRow {
    game: TicTacToeGame;
    resolved: boolean = false;
    constructor(game ? : TicTacToeGame) {
        super();
        this.addClass("gamePlayerInfo", "centered");
        if (game) this.resolve(game);
    }

    public static procrastinate(): GamePlayerInfo {
        return new GamePlayerInfo();
    }

    public resolve(game: TicTacToeGame) {
        this.game = game;
        if (this.game.gameMetaData && !this.resolved) {
            this.add(new PlayerInfo(game.gameMetaData.players.attacker, 1));
            this.add(new Span("vs.").addClass("vs"));
            this.add(new PlayerInfo(game.gameMetaData.players.defender, -1));
            this.resolved = true;
        } else {
            this.app.log("skipped player-info resolving since no gameMetaData is known or it has already been resolved");
        }
    }
    public update(nextPlayer) {
        this.findChildren(PlayerInfo).forEach(playerInfo => (playerInfo as PlayerInfo).update(nextPlayer))
    }
    public win(player) {
        this.findChildren(PlayerInfo).forEach(playerInfo => (playerInfo as PlayerInfo).win(player))
    }
}

export class UserInfo extends BasicElement {
    totalCount: Span = new Span().addClass("totalCount", "userStats") as Span;
    winCount: Span = new Span().addClass("winCount", "userStats") as Span;
    streakCount: Span = new Span().addClass("streakCount", "userStats") as Span;
    looseCount: Span = new Span().addClass("looseCount", "userStats") as Span;
    ongoingCount: Span = new Span().addClass("ongoingCount", "userStats") as Span;

    constructor(private _username: string, lazy = false) {
        super("div");
        this.addClass("userInfo");
        this.add(new Heading(1, new UserSpan(this.username)));
        this.add(new FlexContainerRow(
            new FlexContainerColumn(
                new Heading(2, "Games Played"),
                this.totalCount
            ).addClass("userStatsContainer", "centered"),
            new FlexContainerColumn(
                new Heading(2, "Games won"),
                this.winCount
            ).addClass("userStatsContainer", "centered"),
            new FlexContainerColumn(
                new Heading(2, "Games lost"),
                this.looseCount
            ).addClass("userStatsContainer", "centered"),
            new FlexContainerColumn(
                new Heading(2, "Ongoing games"),
                this.ongoingCount
            ).addClass("userStatsContainer", "centered"),
            new FlexContainerColumn(
                new Heading(2, "Streak"),
                this.streakCount
            ).addClass("userStatsContainer", "centered")
        ).addClass("userStatsOverview"));
        if (!lazy) this.loadData().then(data => this.displayData(data));
    }
    public get username(): string {
        return this._username.split("@").join("");
    }
    public set username(value: string) {
        this._username = value;
    }

    async loadData(): Promise < PostGameInfo[] > {
        return new Promise(async (resolve, _reject) => {
            let response = await this.app.api(`/users/${this.username}`);
            if (response.success) {
                resolve(response.data.games as PostGameInfo[])
            } else this.app.showError("Could not load user-data", {
                retry: this.loadData.bind(this)
            });
        });
    }

    async displayData(data: PostGameInfo[]) {
        if (!data) data = await this.loadData();
        this.totalCount.update(String(data.filter(gameInfo => true).length));
        this.winCount.update(String(data.filter(gameInfo => gameInfo.winner == this.username).length));
        this.streakCount.update(String(data.filter(gameInfo=>gameInfo.isFinished).map(gameInfo => gameInfo.winner == this.username ? 1 : 0).join("").split("0").shift().length));
        this.looseCount.update(String(data.filter(gameInfo => gameInfo.isFinished && !gameInfo.isDraw && gameInfo.winner != this.username ? 1 : 0).length));
        this.ongoingCount.update(String(data.filter(gameInfo => !gameInfo.isFinished ? 1 : 0).length));

    }
}

export class GameBrowser extends FlexContainerRow {
    /**
     * 
     * @param _username username of the user to be shown, false if games of all users should be shown
     * @param lazy whether or not the data should be waited for or fetched itself
     */
    hasMore: boolean = true;
    gameData: PostGameInfo[] = [];
    loadMoreButton = new Button("load more", this.loadMore.bind(this)).addClass("flexNewLine");
    constructor(private _username: string | false, lazy = false) {
        super();
        this.addClass("justifyCenter", "gameBrowser");
        if (!lazy) this.loadData().then(data => this.displayData(data));
    }
    public get username(): string {
        return this._username ? this._username.split("@").join("") : "";
    }
    public set username(value: string) {
        this._username = value;
    }

    async loadData(lastGameId ? : number): Promise < PostGameInfo[] > {
        return new Promise(async (resolve, _reject) => {
            let response: JSONResponse;
            if (lastGameId) response = await this.app.api(`/users/${this.username}`, {
                gameId: lastGameId
            });
            else response = await this.app.api(`/users/${this.username}`)
            if (response.success) {
                resolve(response.data.games as PostGameInfo[])
            } else this.app.showError("Could not load user-data", {
                retry: (() => {
                    resolve(this.loadData(lastGameId));
                }).bind(this)
            });
        });
    }

    async displayData(data ? : PostGameInfo[], clear: boolean = true) {
        if (!data) data = await this.loadData();

        this.gameData.push(...data);
        if (clear) this.clear();
        for (let game of data) {
            this.add(
                new Tile(
                    new FlexContainerColumn(
                        new ClickableElmnt(
                            new FlexContainerColumn(
                                new FlexContainerRow(
                                    new Heading(2, `#${game.gameId.toString(16)}`),
                                    new Container(game.isFinished && !game.isDraw && game.winner ? new Container(new UserSpan(game.winner), new Span(" won")) : game.isDraw ? new Span("draw") : new Span("ongoing")),
                                    // add a "continue" button if the user is part of the game and it is not finished
                                    (!game.isFinished && this.app.credentials && [game.attacker, game.defender].indexOf(this.app.credentials.username) >= 0) ? new PrimaryButton("continue", `/games/${game.gameId.toString(16)}`).addClass("continueGame") : undefined
                                ).addClass("alignCenter", "gameTitleRow"),
                                new TicTacToeMiniature(game)
                            ),
                            `/games/${game.gameId.toString(16)}`),
                        new FlexContainerRow(
                            new Heading(3, new UserSpan(game.attacker)),
                            new Span("Attacker")
                        ).addClass("attackerName"),
                        new FlexContainerRow(
                            new Heading(3, new UserSpan(game.defender)),
                            new Span("Defender")
                        ).addClass("defenderName")
                    )
                )
            );
        }
        // add button to load more if there are more (by default we assume there are more, the value will be changed if loadMore comes up empty handed)
        if (this.hasMore && data.length > 0) this.add(this.loadMoreButton);
        // show "no more games" if there are no more games
        else {
            this.add(new Span(this.gameData.length == 0 ? "No games" : "No more games").addClass("flexNewLine"));
            // remove button to show more
            this.loadMoreButton.element.parentElement.removeChild(this.loadMoreButton.element);
        }
    }
    async loadMore() {
        if (this.gameData) {
            let data = await this.loadData(this.gameData[this.gameData.length - 1].gameId);
            this.hasMore = data.length > 0;
            this.displayData(data, false);
        } else {
            this.app.log(this, this.gameData);
        }
    }
}

export class UserBrowserTable extends Table {
    offset: number = 0;
    data: UserShortStats[];
    keys = {
        "username": "username",
        "wins": "winCount",
        "defeats": "defeatCount",
        "draws": "drawCount"
    }
    comparer:Intl.Collator = new Intl.Collator();
    constructor() {
        super();
        this.addClass("loading");
        this.add(new SortableTableHeadingRow(((item:SortableTableHeading)=>{
            console.log(item)
            let key = this.keys[item.key];
            if(item.currentSorting == "ASC" || item.currentSorting == "NONE") {
                console.log(`sorting data descending by key ${key}`);
                this.displayUsers(this.data.sort((a,b)=>this.comparer.compare(b[key], a[key])))
                item.currentSorting = "DESC";
            }else{
                console.log(`sorting data ascending by key ${key}`);
                this.displayUsers(this.data.sort((a,b)=>this.comparer.compare(a[key], b[key])))
                item.currentSorting = "ASC";
            }
        }), this, ...Object.keys(this.keys)));
        this.loadUsers();
        this.addClass("userBrowserTable");
    }
    async loadUsers() {
        let result = await this.app.api("/users", {
            offset: this.offset
        });
        if(result.success)this.displayUsers(result.data)
        else(this.app.showError("Could not load table", {retry: this.loadUsers.bind(this)}))
    }
    displayUsers(data: UserShortStats[]){
        this.removeClass("loading");
        this.clear(TableRow);
        for (let user of data) {
            this.add(new TableRow(new UserSpan(user.username), String(user.winCount), String(user.defeatCount), String(user.drawCount)));
        }
        this.data = data;
    }
}