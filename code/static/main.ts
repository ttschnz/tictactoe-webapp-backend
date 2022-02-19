import WebApp from "./webapp.js";
import {
    home,
    game,
    gameInfo,
    browseGames,
    user,
    viewStats,
    browseUsers,
    joinCompetition,
    login,
    signup,
    errorState,
    userInfo
    } from "./states.js";
// create the app
export const app = new WebApp();
window["webApp"] = app;
// add states to it
app.addState(home);
app.addState(game);
app.addState(gameInfo);
app.addState(browseGames);
app.addState(user);
app.addState(viewStats);
app.addState(browseUsers);
app.addState(joinCompetition);
app.addState(login);
app.addState(signup);
app.addState(errorState);
app.addState(userInfo);


// find the matching state (if there are multiple, just take the first)
let matchingStates = Object.values(app.states).filter(state => {
    // if the url matches the path
    console.log(state.url, state.regEx, document.location.pathname);
    if(state.url == document.location.pathname) return true;
    // if the regex matches the path
    if(state.regEx && state.regEx.test(document.location.pathname)) return true;
});

app.log(`found ${Object.values(matchingStates??{}).length} matching states:`, matchingStates)
app.state = (matchingStates ?? [])[0] ?? errorState;