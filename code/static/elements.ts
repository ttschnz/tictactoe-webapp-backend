import State from "./state.js";
import WebApp from "./webapp.js";
import { app } from "./main.js";
import { home, login } from "./states.js";

// basic element on which all other elements should be extended 
export class BasicElement{
    element:HTMLElement
    constructor(){

    }
    get app(): WebApp{
        return app
    }
}
export class ClickableElmnt extends BasicElement{
    constructor(public label:string|HTMLElement, public action:State|Function, tagName:string="div"){
        super();
        this.element = document.createElement(tagName);
        this.element.classList.add("clickable");
        this.element.addEventListener("click", this.click.bind(this))
        if(this.label instanceof HTMLElement) this.element.appendChild(this.label);
        else this.element.appendChild(document.createTextNode(this.label));
    }
    /**
         * function to handle click events or simmilar on the button
         * sets the state to the target state given to the constructor
         */
    click(_event:Event){
        if(this.action instanceof State) this.app.setState(this.action);
        else this.action();
    }
}
// HTML Button Element
export class Button extends ClickableElmnt{
    /**
     * 
     * @param label Label (innerText) of button
     * @param action State or function which a click event should trigger
     */
    constructor(public label:string|HTMLElement, public action:State|Function){
        super(label, action, "button");
        this.element.classList.add("button");
    }

    
}
export class Link extends BasicElement{
    constructor(public href:string){
        super();
        this.element = document.createElement("a");
        this.element.setAttribute("href", this.href);
    }
}
// logo
export class TicTacToeLogo extends ClickableElmnt{
    constructor(){
        let label = document.createElement("div");
        label.classList.add("tictactoeLogo");
        label.innerHTML=`
        <svg width="100mm" height="100mm" version="1.1" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
        <g transform="matrix(1.0969 0 0 1.6998 -44.844 -174.91)" fill="none" stroke-width="2px" stroke="#000">
        <path d="m65.481 102.9-1.0691 58.532"/>
        <path d="m90.738 105.04 16.036 56.661"/>
        <path d="m40.892 118 91.139 6.4145"/>
        <path d="m41.16 145.13 84.457 3.3409"/>
        <path d="m70.559 129.09 20.58 10.691"/>
        <path d="m66.55 140.58 23.52-12.027"/>
        </g>
        </svg>`;
        super(label, home);
    }
}
// badge to earn money from digitalocean
export class ReferralBadge extends Link{
    constructor(){
        super("https://www.digitalocean.com/?refcode=5431ada19bb0&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge");
        
        let badgeImg = document.createElement("img");
        badgeImg.setAttribute("src", "https://web-platforms.sfo2.digitaloceanspaces.com/WWW/Badge%203.svg");
        badgeImg.setAttribute("alt", "DigitalOcean Referral Badge");

        this.element.appendChild(badgeImg);
    }
}
export class VersionInfo extends Link{
    constructor(){
        super(`https://github.com/ttschnz/tictactoe_webapp/}`);
    }
}
