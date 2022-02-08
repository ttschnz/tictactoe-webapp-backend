import WebApp from "./webapp.js";
import { home,game,user,login,signup} from "./states.js";

// create the app
export const app = new WebApp();
window["webApp"] = app;
// add states to it
app.addState(home);
app.addState(user);
app.addState(game);
app.addState(signup);
app.addState(login);
// find the matching state
app.state = Object.values(app.states).filter((state)=>state.url==document.location.pathname)[0];