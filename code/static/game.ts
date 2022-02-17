import WebApp from "./webapp";
import {
    BasicElement,
    Container,
    FlexContainer,
    FlexContainerRow,
    Link,
    MaterialIcon,
    Span
} from "./elements.js";

export type PositionIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type Coord = 0 | 1 | 2;
export interface Coords {
    0: Coord,
        1: Coord
};

export interface Move {
    gameId: string,
        moveIndex: number,
        movePosition: PositionIndex,
        player: string
}
export interface GameMetaData{
    players:{
        attacker:string|null, 
        defender:string
    },
    gameState:{
        finished:boolean,
        winner:string|null
    }
};

export class TicTacToeGame {
    gameMetaData:GameMetaData;
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
    constructor(public gameId: string, private app: WebApp, public renderTarget: TicTacToeGameContainer, public infoTarget: Container,public gamePlayerInfo:GamePlayerInfo, public authenticator ? : Authenticator,  private _gameData: Number[][] = Array(3).fill(0).map(x => Array(3).fill(null))) {
        this.generateInfo();
        this.refreshState();
    }

    set gameData(data: Number[][]) {
        this.app.log(`gameData setter called`);
        this.renderTarget.activate(this);
        this.renderTarget.renderData(data);
        this.updateInfo();
        this._gameData = data;
    }

    get gameData(): Number[][] {
        return this._gameData;
    }

    get gameUrl(): string {
        return `${document.location.href}/${this.gameId}`;
    }

    /**
     * generates elements that should be show inside this.infotarget
     */
    generateInfo() {
        this.gameNumberContainer = new Link({
            action: (() => {
                navigator.clipboard.writeText(this.gameUrl);
            }).bind(this)
        }, new FlexContainer(
            new MaterialIcon("tag"),
            new Span(this.gameId),
            new MaterialIcon("content_copy").addClass("showOnHover")
        ).addClass("centered", "gameNumberContainer")).addClass("noTextDecoration");
        this.gameStateContainer = new Container(new Span("connected."));
        this.gameStateContainer.addClass("gameStateContainer");
    }

    /**
     * updates the info shown inside this.infoTarget
     */
    updateInfo() {
        this.app.log("updating info");
        if (!this.gameNumberContainer || !this.gameStateContainer) this.generateInfo();
        // update the gameState to "your turn" or "opponents turn" depending on who did the last move
        if (this.authenticator)(this.gameStateContainer.findChildren(Span, true)[0] as Span).update(this.isMyTurn() ? "your turn" : "opponents turn")
        else(this.gameStateContainer.findChildren(Span, true)[0] as Span).update("observer");
        this.infoTarget.add(this.gameNumberContainer);
        this.infoTarget.add(this.gameStateContainer);

        // update game player info if any are found
        (this.infoTarget.element.parentElement["instance"] as BasicElement).findChildren(GamePlayerInfo, true).forEach(gpi=>(gpi as GamePlayerInfo).update(this.getNextPlayer()))
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
    }): Promise<boolean> {
        if (this.validateMove([x, y])) {
            this.app.log(`move at ${x}, ${y}`);
            this.moves.push({
                gameId: this.gameId,
                moveIndex: ((this.getLastMove() ?? {
                    moveIndex: -1
                }).moveIndex) + 1,
                movePosition: this.coordsToMovePosition(x, y),
                player: "guest"
            });
            this.gameData[y][x] = this.attacker.number;
            this.renderTarget.renderData(this.gameData);
            this.updateInfo();
            await this.commitMove([x,y] as Coords);
            await this.refreshState();
            return true;
        } else return false;
    }
    async commitMove(coords:Coords){
        let response = await this.app.api(...this.authenticator.authenticate("/makeMove", {gameId:this.gameId, movePosition:this.coordsToMovePosition(coords[0], coords[1])}));
        if(response.success) return true;
        else this.app.showError("Failed to commit move to server.", {
            retry:(
                ()=>{
                    this.commitMove(coords);
                }).bind(this)
            }
        );
    }
    /**
     * 
     * @returns the last move made on the game (not synced)
     */
    getLastMove(): Move {
        return this.moves.sort((moveA, moveB) => moveA.moveIndex - moveB.moveIndex)[this.moves.length - 1];
    }
    getNextPlayer(): number{
        this.app.log(`last move:`, this.getLastMove());
        if(this.getLastMove() == undefined) return this.attacker.number;
        else {
            if(this.defender.number == this.evaluatePlayer(this.getLastMove().player)) return this.attacker.number
            if(this.attacker.number == this.evaluatePlayer(this.getLastMove().player)) return this.defender.number
            return 0
        }
    }
    isMyTurn(): boolean {
        return ((this.getLastMove() ?? {
            moveIndex: -1
        }).moveIndex) + 1 % 2 == 0;
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
    public static async createNew(app: WebApp, renderTarget: TicTacToeGameContainer, infoTarget: Container, gamePlayerInfo:GamePlayerInfo,): Promise < TicTacToeGame > {
        let response = await app.api("/startNewGame", {}, true);
        if (response.success) return new TicTacToeGame(response.data.gameId, app, renderTarget, infoTarget,gamePlayerInfo, app.credentials ? Authenticator.fromUsername(app.credentials) : Authenticator.fromGameKey(response.data.gameKey));
        else app.showError("Game data could not be refreshed", {
            retry: TicTacToeGame.createNew.bind(undefined, app)
        });
    }

    /**
     * translates a positionIndex ([0,1,2,3,4,5,6,7,8]) to coords ([0,0], [0,1]) etc.
     * @param positionIndex 
     * @returns 
     */
    movePositionToCoords(positionIndex: PositionIndex): Coords {
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
    coordsToMovePosition(x: Coords[0], y: Coords[1]): PositionIndex {
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
            let coord = this.movePositionToCoords(move.movePosition);
            gameData[coord[1]][coord[0]] = this.evaluatePlayer(move.player);
        }
        this.gameData = gameData;
    }

    /**
     * requests the games state from the server and renders it
     */
    async refreshState(): Promise < void > {
        let response = await this.app.api("/viewGame", {
            gameId: this.gameId
        });
        if (response.success) {
            this.setMoves(response.data.moves as Move[]);
            this.gameMetaData = {players:response.data.players, gameState: response.data.gameState} as GameMetaData;
            this.gamePlayerInfo.resolve(this);
        }
        else this.app.showError("Game data could not be refreshed", {
            retry: this.refreshState
        });
    }
}
export class TicTacToeGameTile extends BasicElement {
    _game: TicTacToeGame;
    occupied: Boolean = false;

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

    async click(_event: MouseEvent): Promise<void> {

        if (!this.occupied) await this.game.makeMove({
            x: this.x as Coord,
            y: this.y as Coord
        }) || this.app.showError("invalid move: it is not your turn", {});
        else this.app.showError("invalid move: field is occupied", {})
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

export class TicTacToeGameContainer extends Container {
    game: TicTacToeGame;
    gameTiles: TicTacToeGameTile[] = [];

    constructor() {
        super("div");
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

    constructor(private authFn: (target:string, data?:any)=>[gameKey:string, data:any, sendToken:boolean]) {

    }

    authenticate(target:string, data?:any):[gameKey:string, data:any, sendToken:boolean] {
        return this.authFn(target, data);
    }

    public static fromGameKey(gameKey: string): Authenticator {
        let auth = new Authenticator((target:string, data?:any)=>{
            console.log(`authentcating ${target} from Game Key`);
            if(target == "/makeMove") return [target, {...data,...{gameKey}}, false];
            else {
                console.log("skipping authentication for unknown target");
                return [target, data, false];
            }
        });
        auth.gameKey = gameKey;
        return auth;
    }

    public static fromUsername(_credentials): Authenticator {
        return new Authenticator((target:string, data?:any)=>{
            console.log(`authenticating ${target} from Username`);
            if(target == "/makeMove") return [target, {...data}, true];
            else {
                console.log("skipping authentication for unknown target");
                return [target, data, true];
            }
        });
    }
}

export class PlayerInfo extends FlexContainer {
    isBot:boolean;
    map = {
        "-1": "radio_button_unchecked", // circle (o)
        "1": "close" // cross (x)
    };
    constructor(public playerName: string|null, public role: -1 | 1) {
        super();
        this.isBot = playerName == "bot";
        this.add(new MaterialIcon(this.map[String(role)]).addClass("playerSign"));
        this.add(new MaterialIcon(this.isBot ? "precision_manufacturing" : "person").addClass("playerIcon"));
        this.add(new Span(playerName ? `@${playerName}` : "Guest").addClass("playerName"));
        this.addClass("playerInfo");
    }
    update(nextPlayer){
        console.log(`nextPlayer:`,nextPlayer);
        if(nextPlayer == this.role) this.addClass("myTurn");
        else this.removeClass("myTurn");
    }
}
// currently only guest vs. bot, so no complicated stuff here
export class GamePlayerInfo extends FlexContainerRow {
    game: TicTacToeGame;
    resolved:boolean=false;
    constructor(game?:TicTacToeGame) {
        super();
        this.addClass("gamePlayerInfo", "centered");
        if(game) this.resolve(game);
    }

    public static procrastinate():GamePlayerInfo{
        return new GamePlayerInfo();
    }

    public resolve(game:TicTacToeGame){
        this.game = game;
        if(this.game.gameMetaData && !this.resolved){
            this.add(new PlayerInfo(game.gameMetaData.players.attacker, 1));
            this.add(new Span("vs.").addClass("vs"));
            this.add(new PlayerInfo(game.gameMetaData.players.defender, -1));
            this.resolved = true;
        }else{
            this.app.log("skipped player-info resolving since no gameMetaData is known or it has already been resolved");
        }
    }
    public update(nextPlayer){
        this.findChildren(PlayerInfo).forEach(playerInfo=>(playerInfo as PlayerInfo).update(nextPlayer))
    }
}