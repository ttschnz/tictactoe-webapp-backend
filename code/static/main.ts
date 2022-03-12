import WebApp from "./webapp.js";
import {
    home,
    game,
    browseGames,
    browseUsers,
    viewCompetition,
    joinCompetition,
    login,
    signup,
    errorState,
    userInfo,
    joinGame
} from "./states.js";
// create the app
export const app = new WebApp();
window["webApp"] = app;
// add states to it
app.addState(home);
app.addState(game);
app.addState(browseGames);
app.addState(browseUsers);
app.addState(viewCompetition);
app.addState(joinCompetition);
app.addState(login);
app.addState(signup);
app.addState(errorState);
app.addState(userInfo);
app.addState(joinGame);

app.loadStateByURL();