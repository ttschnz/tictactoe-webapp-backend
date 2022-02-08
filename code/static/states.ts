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
    PrimaryButton
} from "./elements.js";
import { TicTacToeGame, TicTacToeGameContainer } from "./game.js";

export const home = new State(0, "Home", "/");
export const game = new State(1, "Game", "/game");
export const user = new State(2, "User", "/user");
export const browseGames = new State(3, "Browse Games", "/games");

export const login = new State(4, "Log in", "/login");
export const signup = new State(5, "Sign up", "/signup");

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
    
    addElement(new Header());
    addElement(new Main(
        new Tile(
            gameContainer
        )
    ));
    addElement(new Footer());

    await TicTacToeGame.createNew(app, gameContainer);
}