import State from "./state.js";
import {TicTacToeLogo, VersionInfo, ReferralBadge, Button} from "./elements.js";


export const home = new State(0, "Home", "/");
export const game = new State(1, "Game", "/game");
export const user = new State(2, "User", "/user");

export const login = new State(2, "Log in", "/login");
export const signup = new State(2, "Sign up", "/signup");



const header = (showLogin=true, showLogo=true)=>{
    let header = document.createElement("header");
    if (showLogo) header.appendChild(new TicTacToeLogo().element);
    if (showLogin) header.appendChild(new Button("Log in", login).element);
    return header;
}

const main = ()=>document.createElement("main");


const footer = ()=>{
    let footer = document.createElement("footer");
    footer.appendChild(new VersionInfo().element);
    footer.appendChild(new ReferralBadge().element);
    return footer;
};

home.renderFunction = ()=>{
    let thisVal=home;
    thisVal.renderTarget.appendChild(header());
    thisVal.renderTarget.appendChild(main());
    thisVal.renderTarget.appendChild(footer());
}

login.renderFunction = ()=>{
    let thisVal=login;
    thisVal.renderTarget.appendChild(header(false));
    thisVal.renderTarget.appendChild(main());
    thisVal.renderTarget.appendChild(footer());
}