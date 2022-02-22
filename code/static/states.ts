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
    TinySpan,
    Popup,
    HomeLink
} from "./elements.js";
import {
    GamePlayerInfo,
    TicTacToeGame,
    TicTacToeGameContainer,
    UserInfo,
    GameBrowser,
    Authenticator
} from "./game.js";
import { Credentials } from "./webapp.js";

export const home = new State(0, "Home", "/");
export const game = new State(1, "Game", "/game");
export const gameInfo = new State(1.2, "Game", "/game/", RegExp("^\/game\/(.*)$"));
export const browseGames = new State(1.3, "Browse Games", "/games");
export const user = new State(2, "User", "/user");
export const userInfo = new State(2.3, "User", "/user/", RegExp("^\/user\/(.*)$"));
export const viewStats = new State(2.2, "Stats", "/account");
export const browseUsers = new State(2.1, "Browse Users", "/games");

export const joinCompetition = new State(6, "View Competition", "/competition");

export const login = new State(4, "Log in", "/login");
export const signup = new State(5, "Sign up", "/signup");

export const errorState = new State(404, "Error", "");

// forge is loaded in the .html file, this declaration is just to prevent tsc from throwing an error
const forge = window["forge"];

home.renderFunction = (addElement, app) => {
    addElement(new Header());
    if(app.credentials) addElement(new Main(
        new Tile(
            new FlexContainerRow(
                new TicTacToeLogo(),
                new Heading(1, "TicTacToe")
            ).addClass("centered"),
            new FlexContainerColumn(
                new HorizontalLine("Your Account"),
                new FlexContainerColumn(
                    new PrimaryButton(`New game`, game),
                    new Button(`Join game`, ()=>{
                        addElement(new Popup(new Span("Joining a game is not yet possible.")))
                    }),
                    new Button(`View stats`, ()=>{
                        if(app.credentials) app.loadStateByURL(`/user/${app.credentials.username}`);
                        else app.loadStateByURL(`/user/@bot`);
                    }),
                    new Button("Log out", app.signOut)
                ),
                new HorizontalLine("General"),
                new FlexContainerColumn(
                    new Button("Browse games", ()=>{
                        addElement(new Popup(new Span("Browsing games is not yet implemented.")))
                    }),
                    new Button("Browse users", ()=>{
                        addElement(new Popup(new Span("Browsing users is not yet implemented.")))
                    }),
                    new PrimaryButton("View competition", joinCompetition)
                )
            )
        )
    ));
    else addElement(new Main(
        new Tile(
            new FlexContainerRow(
                new TicTacToeLogo(),
                new Heading(1, "TicTacToe")
            ).addClass("centered"),
            new FlexContainerColumn(
                new FlexContainerColumn(
                    new PrimaryButton("Play as guest", game),
                    new Button("Browse games", ()=>{
                        addElement(new Popup(new Span("Browsing games is not yet implemented.")))
                    })
                ),
                new HorizontalLine("or"),
                new FlexContainerColumn(
                    new Button("Create account", signup),
                    new Button("Log in", login)
                )
            )
        )
    ));
    addElement(new Footer(app));
}

login.renderFunction = (addElement, app) => {
    // go home if signed in
    if(app.credentials) {
        app.setState(home);
        app.showError("You are allready logged in.");
        return
    };
    let username = new Input("username", "Username", "text", "", "username");
    let password = new Input("password", "Password", "password", "", "current-password");
    const loginFunction = async ()=>{
        // get the salt for the user
        let saltResponse = await app.api("/getsalt", {username:username.value});
        if(saltResponse.success){
            // decode the salt
            let salt = forge.util.hexToBytes(saltResponse.data);
            // use the salt for key generation
            let key = forge.util.bytesToHex(forge.pkcs5.pbkdf2(password.value, salt, 12, 32));
            // try to log in and get an access token
            let loginResponse = await app.api("/login", {username:username.value, key});
            if (loginResponse.success) {
                // save the token
                app.credentials = {
                    "token": loginResponse.data.token,
                    "tokenExpiration": loginResponse.data.token_expires,
                    "username": username.value
                } as Credentials;
                // go home
                app.setState(home);
            } else app.showError("Failed to log in", {retry:loginFunction});
        } else app.showError("Failed to log in", {retry:loginFunction});
    };

    addElement(new Header(false));
    addElement(new Main(
        new Tile(
            new Form(
                new FlexContainerColumn(
                    new Heading(1, "Log in"),
                    username,
                    password,
                    new PrimaryButton("Log in", loginFunction)
                )
            ),
            new HorizontalLine("or"),
            new FlexContainerColumn(
                new Button("Create account", signup)
            )
        ).addHomeLink()
    ));
    addElement(new Footer(app));
}

signup.renderFunction = (addElement, app) => {
    // go home if signed in
    if(app.credentials) {
        app.setState(home);
        app.showError("You are allready logged in.");
        return
    };
    let username = new Input("username", "Username", "text", "", "username");
    let password = new Input("password", "Password", "password", "", "current-password");
    let email = new Input("email", "E-Mail", "eamil", "", "email");

    const signupFunction = async () => {
        // generate a random salt
        let salt = forge.random.getBytesSync(128);
        
        // use the salt to derive the key with pbkdf2 (https://en.wikipedia.org/wiki/PBKDF2)
        let key = forge.util.bytesToHex(forge.pkcs5.pbkdf2(password.value, salt, 12, 32));
        // hexify bytes to prevent encoding bugs on serverside
        salt = forge.util.bytesToHex(salt);

        // log it all for debugging
        app.log(`signup: ${username.value}:${password.value}=>${email.value}::${username.value}@${key}.${salt}=>${email.value}`);

        // send data to the server
        let response = await app.api("/signup", {
            username: username.value,
            email: email.value,
            key,
            salt
        });
        if(response.success){
            // signup was successful, check if direct-login was enabled
            if (response.data.token) {
                // if a token is already proviced (direct-login), save it and go home
                localStorage.setItem("token", response.data.token);
                localStorage.setItem("tokenExpiration", response.data.token_expires);
                localStorage.setItem("username", username.value);
                app.setState(home);
            } else {
                // if only signup was made, go to login
                app.setState(login);
            }
        }else{
            if(response.error) app.showError(`Error creating account: ${response.error}`, {retry:signupFunction});
            else app.showError("Error creating account. Please check your inputs and try again later.", {retry:signupFunction})
        }
    };

    addElement(new Header());
    addElement(new Main(
        new Tile(
            new Form(
                new FlexContainerColumn(
                    new Heading(1, "Sign Up"),
                    email,
                    username,
                    password,
                    new PrimaryButton("Sign Up", signupFunction)
                )
            ),
            new HorizontalLine("or"),
            new FlexContainerColumn(
                new Button("Log in", login)
            )
        ).addHomeLink()
    ));
    addElement(new Footer(app));
}

game.renderFunction = async (addElement, app) => {
    // create game-objects
    let gameContainer = new TicTacToeGameContainer();
    let gameInfoContainer = new Container();
    let gamePlayerInfo = GamePlayerInfo.procrastinate();

    addElement(new Header());
    addElement(new Main(
        gameInfoContainer,
        new Tile(
            gameContainer,
            gamePlayerInfo
        ).addHomeLink()
    ));
    addElement(new Footer(app));

    // apply game-objects
    let game = await TicTacToeGame.createNew(app, gameContainer, gameInfoContainer, gamePlayerInfo);
    gamePlayerInfo.resolve(game);
}

gameInfo.renderFunction = async (addElement, app) => {
    let gameContainer = new TicTacToeGameContainer() as TicTacToeGameContainer;
    if(!app.credentials)gameContainer.addClass("readonly");
    let gameInfoContainer = new Container();
    let gamePlayerInfo = GamePlayerInfo.procrastinate();

    let gameId = app.getState().regExResult[1];
    app.log(`gameId: ${gameId}`);
    let game
    if(app.credentials) game = new TicTacToeGame(gameId, app, gameContainer, gameInfoContainer, gamePlayerInfo, Authenticator.fromUsername(app.credentials));
    else game = new TicTacToeGame(gameId, app, gameContainer, gameInfoContainer, gamePlayerInfo);
    gamePlayerInfo.resolve(game)

    addElement(new Header());
    addElement(new Main(
        gameInfoContainer, 
        new Tile(
            gameContainer,
            gamePlayerInfo
        ).addHomeLink()
    ));
    addElement(new Footer(app));
}

gameInfo.urlGetter = ((_this: State) => {
    return _this.regExResult[1];
}).bind(gameInfo, gameInfo);

errorState.renderFunction = async (addElement, app) => {
    addElement(new Header());
    addElement(new Main(
        new FlexContainerColumn(
            new Heading(1, "Error 404"), 
            new Span("not found")
        ).addHomeLink().addClass("centered")
    ));
    addElement(new Footer(app));
}

joinCompetition.renderFunction = async(addElement, app)=>{
    addElement(new Header());
    addElement(new Main(
        new Tile(
            new FlexContainerColumn(
                new Heading(1, "Competition"), 
                new Span("To prove to you that the reinforcement learning algorithm (RL-A) we developed works and is unbeatable, we developed this web app. You can try your luck and beat the bot. The first player to beat the bot will receive a prize in the form of a bar of chocolate. To participate, you need to create an account and be the first player to beat the RL-A.*"),
                new PrimaryButton("Sign up", signup),
                new TinySpan("*We reserve the right to change the rules of the competition at any time without warning, including in such a way that players who would have won, lose their prize.")
            )
        ).addHomeLink().addClass("fixedWidth")
    ));
    addElement(new Footer(app));
}

userInfo.renderFunction = async(addElement, app, ..._args)=>{
    let username = app.getState().regExResult[1];
    let info = new UserInfo(username, true);
    let gameBrowser = new GameBrowser(username, true);
    addElement(new Header());
    addElement(new Main(
        new HomeLink(),
        info,
        gameBrowser
    ));
    addElement(new Footer(app));

    app.api(`/user/${username.split("@").join("")}`).then((response)=>{
        if(response.success){
            gameBrowser.displayData(response.data.games);
            info.displayData(response.data.games);
        }else app.setState(errorState);
    });
}

userInfo.urlGetter = (_args) => {
    return userInfo.regExResult[1];
}
