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
    element: HTMLElement;
    children: BasicElement[] = [];
    constructor(tagName) {
        this.element = document.createElement(tagName);
        this.element["instance"] = this;
    }
    get app(): WebApp {
        return app
    }
    /**
     * adds an element to the container and stores its instance to this.children if a BasicElement is given
     * @param element 
     */
    add(...elements: Array < BasicElement | HTMLElement | Text > ): void {
        for (let element of elements) {
            if (element instanceof HTMLElement || element instanceof Text) this.element.appendChild(element);
            else this.element.appendChild(element.element);
            if (element instanceof BasicElement && this.children.indexOf(element) < 0) this.children.push(element);
        }
    }
    /**
     * clears content of element
     */
    clear(): void {
        while (this.element.childNodes.length > 0) {
            this.element.removeChild(this.element.childNodes[0]);
        }
        console.log(this.element.children);
    }

    /**
     * Filters the children by class
     * @param className class to filter by
     * @returns an array with the children matching the class provided
     */
    findChildren(className: Function, recurse: boolean = false): BasicElement[] {
        let result: BasicElement[] = [];
        if (recurse) this.children.forEach(elmt => {
            result.push(...elmt.findChildren(className, recurse))
        });
        result.push(...this.children.filter(elmt => elmt.constructor == className));
        return result;
    }
    /**
     * adds css classes to element
     * @param tokens classes
     * @returns this
     */
    addClass(...tokens: string[]): BasicElement {
        this.element.classList.add(...tokens);
        return this;
    }
    removeClass(...tokens: string[]): BasicElement {
        this.element.classList.remove(...tokens);
        return this;
    }
}

export class ClickableElmnt extends BasicElement {
    constructor(public label: string | HTMLElement | BasicElement, public action: State | Function, tagName: string = "div") {
        super(tagName);
        this.addClass("clickable");
        this.element.addEventListener("click", this.click.bind(this))
        if (this.label instanceof HTMLElement) this.add(this.label);
        else if (this.label instanceof BasicElement) this.add(this.label);
        else this.add(document.createTextNode(this.label));
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
        this.addClass("button");
    }
}
export class PrimaryButton extends Button {
    constructor(public label: string | HTMLElement | BasicElement, public action: State | Function) {
        super(label, action);
        this.addClass("primary");
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

export class Container extends BasicElement {
    /**
     * @param args tagName:?String="div", ...children:BasicElement[]
     */
    constructor(...args: Array < any > ) {
        let tagName: string;
        if (typeof args[0] == "string") tagName = args.shift();
        if (tagName) super(tagName);
        else super("div");
        if (args[0] instanceof Array) args = args.shift();
        for (let child of args) {
            this.add(child);
        }
    }
}
export class Image extends BasicElement {
    constructor(public src: string, public alt ? : string) {
        super("img");
        this.element.setAttribute("src", this.src);
        if (this.alt) this.element.setAttribute("alt", this.alt);
    }
}

export class Link extends Container {
    constructor({
        href,
        action
    }: {
        href ? : string;action ? : Function
    }, ...children: BasicElement[]) {
        super("a", children);
        if (action) this.element.addEventListener("click", (event: MouseEvent) => {
            console.log(event);
            event.preventDefault();
            action();
        });
        if (href) this.element.setAttribute("href", href);
    }
}

// badge to earn money from digitalocean
export class ReferralBadge extends Link {
    constructor() {
        let tgt = "https://www.digitalocean.com/?refcode=5431ada19bb0&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge";
        let badgeImg = new Image("https://web-platforms.sfo2.digitaloceanspaces.com/WWW/Badge%203.svg", "DigitalOcean Referral Badge").addClass("referralBadge");
        super({
            href: tgt
        }, badgeImg);
    }
}

export class VersionInfo extends Link {
    constructor(versionHash?:string) {
        super({
            href: "#"
        }, new Span());
        this.addClass("versionHash");
        this.update(versionHash);
    }
    update(versionHash){
        (this.findChildren(Span)[0] as Span).update(versionHash ? versionHash : "source");
        this.element.setAttribute("href", versionHash?`https://github.com/ttschnz/tictactoe_webapp/tree/${versionHash}`:"https://github.com/ttschnz/tictactoe_webapp/");
    }
}

export class Main extends Container {
    constructor(...children: BasicElement[]) {
        super("main", children);
    }
}
export class Footer extends BasicElement {
    constructor(app:WebApp) {
        super("footer");
        this.add(new VersionInfo());
        this.add(new ReferralBadge());
        app.api("/version").then((response)=>{
            if(response.success){
                let versionInfo =(this.findChildren(VersionInfo)[0] as VersionInfo)
                versionInfo.update(response.data.versionHash);
                if(!response.data.upToDate) versionInfo.addClass("behind");
                else versionInfo.addClass("upToDate");
            }
        })
    }
}
export class Header extends BasicElement {
    constructor(showLogin: boolean = true, showLogo: boolean = true) {
        super("header");
        if (showLogo) this.add(new TicTacToeLogo());
        if (localStorage.getItem("username")) this.add(new FlexContainer(new Span(`@${localStorage.getItem("username")}`), new Button("Sign out", app.signOut)).addClass("centered"));
        else if (showLogin) this.add(new Button("Log in", login));
    }
}
export class Tile extends Container {
    constructor(...children: BasicElement[]) {
        super(children);
        this.addClass("tile");
    }
}
export class Heading extends BasicElement {
    constructor(headingLevel: 1 | 2 | 3 | 4 | 5 | 6, content: string) {
        super(`h${headingLevel}`);
        this.add(document.createTextNode(content));
    }
}
export class FlexContainer extends Container {
    constructor(...children: BasicElement[]) {
        super(children);
        this.addClass("flex");
    }
}
export class FlexContainerColumn extends FlexContainer {
    constructor(...children: BasicElement[]) {
        super(...children);
        this.addClass("column");
    }
}
export class FlexContainerRow extends FlexContainer {
    constructor(...children: BasicElement[]) {
        super(...children);
        this.addClass("row");
    }
}

export class HorizontalLine extends BasicElement {
    constructor(label: string = "") {
        super("hr");
        this.addClass("labelledHr");
        this.element.dataset.label = label;
    }
}

export class Input extends BasicElement {
    input: HTMLInputElement;
    constructor(name: string, label: string, type: string = "text", value ? : string | undefined, autocomplete ? : string | undefined) {
        super("div");
        this.addClass("labeled", "input");

        this.input = document.createElement("input");
        this.input.name = name;
        this.input.type = type;
        this.input.placeholder = label;
        if (value != undefined) this.input.setAttribute("value", value);
        if (autocomplete != undefined) this.input.setAttribute("autocomplete", autocomplete);
        this.add(this.input);

        let labelElement = document.createElement("label");
        labelElement.setAttribute("for", name);
        labelElement.appendChild(document.createTextNode(label));
        this.add(labelElement);

    }
    get value() {
        return this.input.value;
    }
    set value(data) {
        this.input.value = data;
    }
}
export class Form extends Container {
    constructor(...children: BasicElement[]) {
        super("form", children);
        this.element.addEventListener("submit", (event) => {
            event.preventDefault();
        })
    }
}

export class MaterialIcon extends BasicElement {
    constructor(iconName: string) {
        super("span");
        this.addClass("material-icons");
        this.element.innerHTML = iconName;
    }
}
export class MaterialIconButton extends Button {
    constructor(public label: string | HTMLElement | BasicElement, public action: State | Function) {
        super(label, action);
        this.addClass("material-icons");
    }
}
export class Warning extends FlexContainer {
    constructor(errorText: string, options?: ErrorOptions) {
        super();
        this.addClass("warning");
        let errorSpan = document.createElement("span");
        errorSpan.classList.add("flex");
        errorSpan.appendChild(new MaterialIcon("warning").element);
        errorSpan.appendChild(document.createTextNode(errorText));
        this.add(errorSpan);

        if (options && options.retry) this.add(new Button("retry", this.callFn.bind(this, options.retry)));
        if (options && options.ok) this.add(new Button("ok", this.callFn.bind(this, options.ok)));
        if (options && options.cancel) this.add(new Button("cancel", this.callFn.bind(this, options.cancel)));

        this.add(new MaterialIconButton("close", this.close.bind(this)));
    }
    close() {
        this.element.parentElement.removeChild(this.element);
    }
    /**
     * Closes warning before calling function (to prevent multiple warnings from popping up at once)
     * @param callback function to be called after closing warning
     */
    callFn(callback: Function) {
        this.close()
        callback();
    }
}
export class Span extends BasicElement {
    constructor(content?: string) {
        super("span");
        if(content) this.add(document.createTextNode(content));
    }
    update(content: string) {
        this.clear();
        this.add(document.createTextNode(content));
    }
}