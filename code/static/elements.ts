import State, {
    ErrorOptions
} from "./state.js";
import WebApp from "./webapp.js";
import {
    app
} from "./main.js";
import {
    home,
    login
} from "./states.js";
import {
    TicTacToeGame
} from "./game.js";
// basic element on which all other elements should be extended 
export class BasicElement {
    element: HTMLElement
    constructor(tagName) {
        this.element = document.createElement(tagName);
    }
    get app(): WebApp {
        return app
    }
}

export class ClickableElmnt extends BasicElement {
    constructor(public label: string | HTMLElement |BasicElement, public action: State | Function, tagName: string = "div") {
        super(tagName);
        this.element.classList.add("clickable");
        this.element.addEventListener("click", this.click.bind(this))
        if (this.label instanceof HTMLElement) this.element.appendChild(this.label);
        else if (this.label instanceof BasicElement) this.element.appendChild(this.label.element);
        else this.element.appendChild(document.createTextNode(this.label));
    }
    /**
     * function to handle click events or simmilar on the button
     * sets the state to the target state given to the constructor
     */
    click(_event: Event) {
        if (this.action instanceof State) this.app.setState(this.action);
        else this.action();
    }
}
// HTML Button Element
export class Button extends ClickableElmnt {
    /**
     * 
     * @param label Label (innerText) of button
     * @param action State or function which a click event should trigger
     */
    constructor(public label: string | HTMLElement | BasicElement, public action: State | Function) {
        super(label, action, "button");
        this.element.classList.add("button");
    }
}
export class PrimaryButton extends Button {
    constructor(public label: string | HTMLElement | BasicElement, public action: State | Function) {
        super(label, action);
        this.element.classList.add("primary");
    }
}

export class Link extends BasicElement {
    constructor(public href: string) {
        super("a");
        this.element.setAttribute("href", this.href);
    }
}
// logo
export class TicTacToeLogo extends ClickableElmnt {
    constructor() {
        let label = document.createElement("div");
        label.classList.add("tictactoeLogo");
        label.innerHTML = `
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
export class ReferralBadge extends Link {
    constructor() {
        super("https://www.digitalocean.com/?refcode=5431ada19bb0&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge");

        let badgeImg = document.createElement("img");
        badgeImg.setAttribute("src", "https://web-platforms.sfo2.digitaloceanspaces.com/WWW/Badge%203.svg");
        badgeImg.setAttribute("alt", "DigitalOcean Referral Badge");

        this.element.appendChild(badgeImg);
    }
}
export class VersionInfo extends Link {
    constructor() {
        super(`https://github.com/ttschnz/tictactoe_webapp/}`);
    }
}

export class Container extends BasicElement {
    /**
     * @param args [tagName:?String="div", ...children:[BasicElement]] 
     */
    constructor(...args: Array < any > ) {
        let tagName: string;
        if (typeof args[0] == "string") tagName = args.shift();
        super(tagName ?? "div");
        if (args[0] instanceof Array) args = args.shift();
        for (let child of args) {
            this.element.appendChild(child.element);
        }
    }
}
export class Main extends Container {
    constructor(...children: BasicElement[]) {
        super("main", children);
    }
}
export class Footer extends BasicElement {
    constructor() {
        super("footer");
        this.element.appendChild(new VersionInfo().element);
        this.element.appendChild(new ReferralBadge().element);
    }
}
export class Header extends BasicElement {
    constructor(showLogin: boolean = true, showLogo: boolean = true) {
        super("header");
        if (showLogo) this.element.appendChild(new TicTacToeLogo().element);
        if (showLogin) this.element.appendChild(new Button("Log in", login).element);
    }
}
export class Tile extends Container {
    constructor(...children: BasicElement[]) {
        super(children);
        this.element.classList.add("tile");
    }
}
export class Heading extends BasicElement {
    constructor(headingLevel: 1 | 2 | 3 | 4 | 5 | 6, content: string) {
        super(`h${headingLevel}`);
        this.element.appendChild(document.createTextNode(content));
    }
}
export class FlexContainer extends Container {
    constructor(...children: BasicElement[]) {
        super(children);
        this.element.classList.add("flex");
    }
}
export class FlexContainerColumn extends FlexContainer {
    constructor(...children: BasicElement[]) {
        super(...children);
        this.element.classList.add("column");
    }
}
export class FlexContainerRow extends FlexContainer {
    constructor(...children: BasicElement[]) {
        super(...children);
        this.element.classList.add("row");
    }
}

export class HorizontalLine extends BasicElement {
    constructor(label: string = "") {
        super("hr");
        this.element.classList.add("labelledHr");
        this.element.dataset.label = label;
    }
}

export class Input extends BasicElement {
    constructor(name: string, label: string, type: string = "text", value ? : string | undefined, autocomplete ? : string | undefined) {
        super("div");
        this.element.classList.add("labeled", "input");

        let input = document.createElement("input");
        input.name = name;
        input.type = type;
        input.placeholder = label;
        if (value != undefined) input.setAttribute("value", value);
        if (autocomplete != undefined) input.setAttribute("autocomplete", autocomplete);
        this.element.appendChild(input);

        let labelElement = document.createElement("label");
        labelElement.setAttribute("for", name);
        labelElement.appendChild(document.createTextNode(label));
        this.element.appendChild(labelElement);

    }
}
export class Form extends Container {
    constructor(...children: BasicElement[]) {
        super("form", children);
    }
}

class MaterialIcon extends BasicElement{
    constructor(iconName:string){
        super("span");
        this.element.classList.add("material-icons");
        this.element.innerHTML=iconName;
    }
}
class MaterialIconButton extends Button{
    constructor(public label: string | HTMLElement | BasicElement, public action: State | Function) {
        super(label, action);
        this.element.classList.add("material-icons");
    }
}
export class Warning extends FlexContainer {
    constructor(errorText: string, options: ErrorOptions) {
        super();
        this.element.classList.add("warning");
        let errorSpan = document.createElement("span");
        errorSpan.classList.add("flex");
        errorSpan.appendChild(new MaterialIcon("warning").element);
        errorSpan.appendChild(document.createTextNode(errorText));
        this.element.appendChild(errorSpan);

        if (options.retry) this.element.appendChild(new Button("retry", this.callFn.bind(this, options.retry)).element);
        if (options.ok) this.element.appendChild(new Button("ok",this.callFn.bind(this, options.ok)).element);
        if (options.cancel) this.element.appendChild(new Button("cancel", this.callFn.bind(this, options.cancel)).element);
        
        this.element.appendChild(new MaterialIconButton("close", this.close.bind(this)).element);
    }
    close(){
        this.element.parentElement.removeChild(this.element);
    }
    /**
     * Closes warning before calling function (to prevent multiple warnings from popping up at once)
     * @param callback function to be called after closing warning
     */
    callFn(callback:Function){
        this.close()
        callback();
    }
}
export class Span extends BasicElement{
    constructor(content:string){
        super("span");
        this.element.appendChild(document.createTextNode(content));
    }
}