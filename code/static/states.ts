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
    InfoTile,
    Popup
} from "./elements.js";
import {
    GamePlayerInfo,
    TicTacToeGame,
    TicTacToeGameContainer,
    UserInfo,
    GameBrowser,
    Authenticator,
    PostGameInfo
} from "./game.js";
import {
    Credentials, JSONResponse
} from "./webapp.js";

// id 0 -- home
export const home = new State(0, "Home", "/");

// id 1 -- gaming
export const game = new State(1, "Game", "/games/new");
export const gameInfo = new State(1.2, "Game", "/games/", RegExp("^\/games\/(.*)$"));
export const browseGames = new State(1.3, "Browse Games", "/games");
export const joinGame = new State(1.4, "Join Game", "/join");

// id 2 -- user management
export const browseUsers = new State(2.1, "Browse Users", "/users");
export const userInfo = new State(2.3, "User", "/users/", RegExp("^\/users\/(.*)$"));

// id 3 -- admin stuff

// id 4 -- authenticating
export const login = new State(4, "Log in", "/login");

// id 5 -- creating account
export const signup = new State(5, "Sign up", "/signup");

// id 6 -- competition
export const viewCompetition = new State(6, "View Competition", "/competition");
export const joinCompetition = new State(6.1, "Join Competition", "/competition/join");

// errors
export const errorState = new State(404, "Error", "");

// forge is loaded in the .html file, this declaration is just to prevent tsc from throwing an error
const forge = window["forge"];

home.renderFunction = (addElement, app) => {
    addElement(new Header());
    if (app.credentials) addElement(new Main(
        new Tile(
            new FlexContainerRow(
                new TicTacToeLogo(),
                new Heading(1, "TicTacToe")
            ).addClass("centered"),
            new FlexContainerColumn(
                new HorizontalLine("Your Account"),
                new FlexContainerColumn(
                    new PrimaryButton(`New game`, game),
                    new Button(`Join game`, joinGame),
                    new Button(`View stats`, () => {
                        if (app.credentials) app.loadStateByURL(`/users/${app.credentials.username}`);
                        else app.loadStateByURL(`/users/@bot`);
                    }),
                    new Button("Log out", app.signOut)
                ),
                new HorizontalLine("General"),
                new FlexContainerColumn(
                    new Button("Browse games", browseGames),
                    new Button("Browse users", browseUsers),
                    new PrimaryButton("View competition", viewCompetition)
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
                    new Button("Browse games", browseGames),
                    new Button("View competition", viewCompetition)
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
    if (app.credentials) {
        app.setState(home);
        app.showError("You are allready logged in.");
        return
    };
    let username = new Input("username", "Username", "text", true, "", "username");
    let password = new Input("password", "Password", "password", true, "", "current-password");
    const loginFunction = async () => {
        // get the salt for the user
        let saltResponse = await app.api("/getsalt", {
            username: username.value
        });
        if (saltResponse.success) {
            // decode the salt
            let salt = forge.util.hexToBytes(saltResponse.data);
            // use the salt for key generation
            let key = forge.util.bytesToHex(forge.pkcs5.pbkdf2(password.value, salt, 12, 32));
            // try to log in and get an access token
            let loginResponse = await app.api("/login", {
                username: username.value,
                key
            });
            if (loginResponse.success) {
                // save the token
                app.credentials = {
                    token: loginResponse.data.token,
                    tokenExpiration: loginResponse.data.token_expires,
                    username: username.value,
                    inCompetition: loginResponse.data.inCompetition
                } as Credentials;
                // go home
                app.setState(home);
            } else app.showError("Failed to log in", {
                retry: loginFunction
            });
        } else app.showError("Failed to log in", {
            retry: loginFunction
        });
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
        )
    ).addHomeLink());
    addElement(new Footer(app));
}

signup.renderFunction = (addElement, app) => {
    // go home if signed in
    if (app.credentials) {
        app.setState(home);
        app.showError("You are allready logged in.");
        return
    };
    let username = new Input("username", "Username", "text", true, "", "username");
    let password = new Input("password", "Password", "password", true, "", "current-password");
    let email = new Input("email", "E-Mail", "email", true, "", "email");

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
        if (response.success) {
            // signup was successful, check if direct-login was enabled
            if (response.data.token) {
                // if a token is already proviced (direct-login), save it and go home
                app.credentials = {
                    token: response.data.token,
                    tokenExpiration: response.data.token_expires,
                    username: username.value,
                    inCompetition: response.data.inCompetition
                } as Credentials;
                app.setState(home);
            } else {
                // if only signup was made, go to login
                app.setState(login);
            }
        } else {
            if (response.error) app.showError(`Error creating account: ${response.error}`, {
                retry: signupFunction
            });
            else app.showError("Error creating account. Please check your inputs and try again later.", {
                retry: signupFunction
            })
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
        )
    ).addHomeLink());
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
        )
    ).addHomeLink());
    addElement(new Footer(app));

    // apply game-objects
    let game = await TicTacToeGame.createNew(app, gameContainer, gameInfoContainer, gamePlayerInfo);
    gamePlayerInfo.resolve(game);
}

gameInfo.renderFunction = async (addElement, app) => {
    let gameContainer = new TicTacToeGameContainer() as TicTacToeGameContainer;
    if (!app.credentials) gameContainer.addClass("readonly");
    let gameInfoContainer = new Container();
    let gamePlayerInfo = GamePlayerInfo.procrastinate();

    let gameId = app.getState().regExResult[1];
    app.log(`gameId: ${gameId}`);
    let game
    if (app.credentials) game = new TicTacToeGame(gameId, app, gameContainer, gameInfoContainer, gamePlayerInfo, Authenticator.fromUsername(app.credentials));
    else game = new TicTacToeGame(gameId, app, gameContainer, gameInfoContainer, gamePlayerInfo);
    gamePlayerInfo.resolve(game)

    addElement(new Header());
    addElement(new Main(
        gameInfoContainer,
        new Tile(
            gameContainer,
            gamePlayerInfo
        )
    ).addHomeLink());
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
        ).addClass("centered")
    ).addHomeLink());
    addElement(new Footer(app));
}

viewCompetition.renderFunction = async (addElement, app) => {
    addElement(new Header());
    addElement(new Main(
        new Tile(
            new FlexContainerColumn(
                new Heading(1, "Competition"),
                app.credentials && app.credentials.inCompetition ? new InfoTile(new Span("You are enlisted in the competition.")) :undefined,
                new Span("To prove to you that the reinforcement learning algorithm (RL-A) we developed works and is unbeatable, we developed this web app. You can try your luck and beat the bot. The first player to beat the bot will receive a prize in the form of a bar of chocolate. To participate, you need to create an account and be the first player to beat the RL-A.*"),
                app.credentials ? app.credentials.inCompetition ? new PrimaryButton("Start playing", game) : new PrimaryButton("Join Competition", joinCompetition) : new PrimaryButton("Sign up", signup),
                new TinySpan("*We reserve the right to change the rules of the competition at any time without warning, including in such a way that players who would have won, lose their prize.")
            )
        ).addClass("fixedWidth")
    ).addHomeLink());
    addElement(new Footer(app));
}

joinCompetition.renderFunction = (addElement, app) => {
    // go to log in if not signed in
    if (!app.credentials) {
        app.setState(login);
        app.showError("please log in to join competition.");
        return
    };
    let firstName = new Input("firstName", "First name", "text", true, "", "first-name", /^.{1,}$/gm, "Please enter your first name");
    let lastName = new Input("lastName", "Last name", "text", true, "", "last-name", /^.{1,}$/gm, "Please enter your last name");
    let age = new Input("age", "Age", "number", true, "", "age", /^[1-9]?[0-9]$/gm, "Please enter any value between 0 and 99");
    let gender = new Input("gender", "Gender (m/f/?)", "text", true, "", "gender", /^(m|f|\?)$/gm, "Valid options are: 'm', 'f', and '?'");

    const joinFunction = async () => {
        // send data to the server
        let response = await app.api("/joinCompetition", {
            firstName: firstName.value,
            lastName: lastName.value,
            age: age.value,
            gender: gender.value
        }, true);
        if (response.success) {
            if(app.credentials){
                app.credentials = {
                    username: app.credentials.username,
                    token: app.credentials.token,
                    tokenExpiration: app.credentials.tokenExpiration,
                    inCompetition: true
                }
                app.setState(viewCompetition);
            }else{
                // the user logged out during the request, don't do anything
            }
        } else {
            if (response.error) app.showError(`Error joining competition: ${response.error}`, {
                retry: joinFunction
            });
            else app.showError("Error joining competition. Please check your inputs and try again later.", {
                retry: joinFunction
            })
        }
    };

    addElement(new Header());
    addElement(new Main(
        new Tile(
            new Form(
                new FlexContainerColumn(
                    new Heading(1, "Join Competition"),
                    firstName,
                    lastName,
                    age,
                    gender,
                    new PrimaryButton("Join Competition", joinFunction),
                    new TinySpan("By joining the competition, you agree to our terms. We reserve the right to change the rules of the competition at any time without warning, including in such a way that players who would have won, lose their prize.")
                )
            )
        ).addClass("fixedWidth")
    ).addHomeLink());
    addElement(new Footer(app));
}

userInfo.renderFunction = async (addElement, app) => {
    let username = app.getState().regExResult[1];
    let info = new UserInfo(username, true);
    let gameBrowser = new GameBrowser(username, true);
    addElement(new Header());
    addElement(new Main(
        info,
        gameBrowser
    ).addHomeLink());
    addElement(new Footer(app));

    const errorPopup = new Popup(new Heading(1, "User not found"), new Span(`The user "${username}" has not been found`));
    errorPopup.close = async ()=>{
        await errorPopup.fadeOut();
        errorPopup.element.parentElement.removeChild(errorPopup.element);
        app.setState(home);
    }

    app.api(`/users/${username.split("@").join("")}`).then((response) => {
        if (response.success) {
            gameBrowser.displayData(response.data.games);
            info.displayData(response.data.games);
        } else addElement(errorPopup);
    });
}

userInfo.urlGetter = (_args) => {
    return userInfo.regExResult[1];
}


browseGames.renderFunction = (addElement, app) => {
    const gameBrowser = new GameBrowser(false, true);
    addElement(new Header());
    addElement(new Main(
        gameBrowser.addClass("allGames")
    ).addHomeLink());
    addElement(new Footer(app));
    gameBrowser.loadData = (lastGameId?:number)=>{
        return new Promise(async(resolve, _reject)=>{
            let response:JSONResponse;
            if(lastGameId) response = await app.api("/games", {gameId: lastGameId});
            else  response = await app.api("/games");
            if(response.success){
                let data = response.data as PostGameInfo[]
                resolve(data);
            }else app.showError("could not fetch games", {retry: ()=>{
                resolve(gameBrowser.loadData.bind(gameBrowser, lastGameId))
            }})
        });
    }
    gameBrowser.displayData();
}