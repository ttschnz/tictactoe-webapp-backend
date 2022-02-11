import State from "./state.js";
import {
    TicTacToeLogo,
    Button,
    Main,
    Footer,
    Header,
    Tile,
    Container,
    Input,
    Heading,
    HorizontalLine,
    FlexContainerColumn,
    FlexContainerRow,
    Form,
    PrimaryButton,
    Span,
    FlexContainer
} from "./elements.js";
import { 
    GamePlayerInfo,
    TicTacToeGame, 
    TicTacToeGameContainer 
} from "./game.js";

export const home = new State(0, "Home", "/");
export const game = new State(1, "Game", "/game");
export const gameInfo = new State(1.2, "Game", "/game/", RegExp("^\/game\/(.*)$"));
export const browseGames = new State(1.3, "Browse Games", "/games");
export const user = new State(2, "User", "/user");

export const login = new State(4, "Log in", "/login");
export const signup = new State(5, "Sign up", "/signup");

export const errorState = new State(404, "Error", "");

home.renderFunction = (addElement, app) => {
    addElement(new Header());
    addElement(new Main(
        new Tile(
            new FlexContainerRow(
                new TicTacToeLogo(),
                new Heading(1, "TicTacToe")
            ),
            new FlexContainerColumn(
                new Button("Play as guest", game),
                new Button("Browse games", browseGames)
            ),
            new HorizontalLine("or"),
            new FlexContainerColumn(
                new Button("Create account", signup),
                new Button("Log in", login)
            )
        )
    ));
    addElement(new Footer());
}

login.renderFunction = (addElement, app) => {
    addElement(new Header(false));
    addElement(new Main(
        new Tile(
            new Form(
                new FlexContainerColumn(
                    new Heading(1, "Log in"),
                    new Input("username", "Username", "text", "", "username"),
                    new Input("password", "Password", "password", "", "current-password"),
                    new PrimaryButton("Log in", login)
                )
            ),
            new HorizontalLine("or"),
            new FlexContainerColumn(
                new Button("Create account", signup)
            )
        )
    ));
    addElement(new Footer());
}

signup.renderFunction = (addElement, app) => {
    addElement(new Header());
    addElement(new Main(
        new Tile(
            new Form(
                new FlexContainerColumn(
                    new Heading(1, "Sign Up"),
                    new Input("email", "E-Mail", "eamil", "", "email"),
                    new Input("username", "Username", "text", "", "username"),
                    new Input("password", "Password", "password", "", "current-password"),
                    new PrimaryButton("Sign Up", signup)
                )
            ),
            new HorizontalLine("or"),
            new FlexContainerColumn(
                new Button("Log in", login)
            )
        )
    ));
    addElement(new Footer());
}

game.renderFunction = async (addElement, app) =>{
    let gameContainer = new TicTacToeGameContainer();
    let gameInfoContainer = new Container();
    let gamePlayerInfo = GamePlayerInfo.procrastinate();
    addElement(new Header());
    addElement(new Main(
        gameInfoContainer,
        new Tile(
            gameContainer,
            gamePlayerInfo
        )
    ));
    addElement(new Footer());
    
    let game = await TicTacToeGame.createNew(app, gameContainer, gameInfoContainer);
    gamePlayerInfo.resolve(game);
}

gameInfo.renderFunction = async (addElement, app)=>{
    let gameContainer = new TicTacToeGameContainer().addClass("readonly") as TicTacToeGameContainer;
    let gameInfoContainer = new Container();

    let gameId = app.state.regExResult[1];
    app.log(`gameId: ${gameId}`);
    let game = new TicTacToeGame(gameId, app, gameContainer, gameInfoContainer);

    addElement(new Header());
    addElement(new Main(gameInfoContainer, new Tile(gameContainer, new GamePlayerInfo(game))));
    addElement(new Footer());
}

gameInfo.urlGetter =((_this:State)=>{
    return _this.regExResult[1];
}).bind(gameInfo, gameInfo);

errorState.renderFunction = async (addElement, app)=>{
    addElement(new Header());
    addElement(new Main(new FlexContainerColumn(new Heading(1,"Error 404"), new Span("not found")).addClass("centered")));
    addElement(new Footer());
}