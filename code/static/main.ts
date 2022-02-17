import WebApp from "./webapp.js";
import {
    home,
    game,
    user,
    login,
    signup,
    gameInfo,
    errorState
} from "./states.js";
// create the app
export const app = new WebApp();
window["webApp"] = app;
// add states to it
app.addState(home);
app.addState(user);
app.addState(game);
app.addState(signup);
app.addState(login);
app.addState(gameInfo);

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