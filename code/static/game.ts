import WebApp from "./webapp";
import { BasicElement, Container } from "./elements.js";
export class TicTacToeGame {
    attacker={icon:"x", number:1};
    defender={icon:"o", number:-1};
    iconMap = {"1":"x", "x":"1", "o":"-1", "-1":"o", "0":"false", "false":"0"}
    /**
     * Represents an existing game, to create call TicTacToeGame.createNew()
     * @param gameId ID of Game
     * @param app instance of WebApp, for API and logging 
     * @param authenticator instance of Authenticator to authenticate requests, only used for unfinished games
     * @param _gameData 
     */
    constructor(public gameId: string, private app: WebApp, public renderTarget:TicTacToeGameContainer,public authenticator ? : Authenticator, private _gameData:Number[][]=Array(3).fill(0).map(x => Array(3).fill(null))) {
        this.refreshState();
    }

    set gameData(data: Number[][]) {
        this.app.log(`gameData setter called`);
        this.renderTarget.activate(this);
        this.renderTarget.renderData(data);
        this._gameData = data;
    }
    get gameData() {
        return this._gameData;
    }
    makeMove(x,y){
        this.app.log(`move at ${x}, ${y}`);
        this.gameData[y][x] = this.attacker.number;
        this.renderTarget.renderData(this.gameData);
    }

    public static async createNew(app:WebApp, renderTarget:TicTacToeGameContainer):Promise<TicTacToeGame>{
        let response = await app.api("/startNewGame", {});
        if(response.success) return new TicTacToeGame(response.data.gameId, app,renderTarget, Authenticator.fromGameKey(response.data.gameKey));
        else app.showError("Game data could not be refreshed", {
            retry: TicTacToeGame.createNew.bind(undefined, app)
        });
    }

    movePositionToCoords(positionIndex:number){
        let y = Math.floor(positionIndex / 3);
        let x = positionIndex-y*3;
        return [x,y]
    }
    coordsToMovePosition(x,y){
        return x+y*3;
    }

    evaluatePlayer(player:string){
        if(["bot"].indexOf(player) >= 0) return this.attacker.number;
        else return this.defender.number;
    }

    parseMoves(moves:any[]):Number[][]{
        let gameData = Array(3).fill(0).map(x => Array(3).fill(null));
        for(let move of moves){
            let [x,y]=this.movePositionToCoords(move.movePosition);
            gameData[y][x] = this.evaluatePlayer(move.player);
        }
        return gameData;
    }

    async refreshState() {
        let response = await this.app.api("/viewGame", {
            gameId: this.gameId
        })
        if (response.success) this.gameData = this.parseMoves(response.data);
        else this.app.showError("Game data could not be refreshed", {
            retry: this.refreshState
        });
    }
}
export class TicTacToeGameTile extends BasicElement{
    _game: TicTacToeGame;
    constructor(public x:number,public y:number){
        super("div");
        this.element.classList.add("gameTile", "loading");
        this.element.dataset.x=String(this.x);
        this.element.dataset.y=String(this.y);
        this.occupy();
    }
    occupy(user:string|boolean=false){
        this.element.dataset.occupiedBy=String(user);
    }
    set game(value){
        if(!this.game){
            this._game = value;
            this.element.addEventListener("click", this.click.bind(this));
            this.element.classList.remove("loading");
        }
    }
    get game():TicTacToeGame{
        return this._game;
    }
    click(event:MouseEvent){
        this.game.makeMove(this.x, this.y);
    }
    activate(game:TicTacToeGame){
        this.game = game;
    }
    renderData(data:Number[][]){
        if(data[this.y] && data[this.x]) this.element.dataset.occupiedBy = this.game.iconMap[String(data[this.y][this.x])] ?? false;
    }
}

export class TicTacToeGameContainer extends Container{
    game:TicTacToeGame;
    gameTiles: TicTacToeGameTile[] = [];
    constructor(){
        super("div");
        this.element.classList.add("gameContainer");
        for(let y of [0,1,2]){
            for(let x of [0,1,2]){
                let tile = new TicTacToeGameTile(x,y);
                this.gameTiles.push(tile);
                this.element.appendChild(tile.element);
                if(this.game) tile.activate(this.game);
            }
        }
    }
    activate(game:TicTacToeGame){
        this.game = game;
        this.gameTiles.forEach(tile=>tile.activate(game));
    }
    renderData(data:Number[][]){
        this.gameTiles.forEach(tile=>tile.renderData(data))
    }
}
export class Authenticator {
    gameKey:string;
    username:string;
    token:string;
    password:string;
    constructor() {

    }
    public static fromGameKey(gameKey:string):Authenticator{
        let auth = new Authenticator();
        auth.gameKey=gameKey;
        return auth;
    }

    public static fromUsername():Authenticator{
        return new Authenticator()
    }
}

