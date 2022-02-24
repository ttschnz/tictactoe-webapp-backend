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
    UserBrowserTable
} from "./game.js";
export type SortingOptions = "ASC" | "DESC" | "NONE";
// basic element on which all other elements should be extended 
export class BasicElement {
    element: HTMLElement;
    children: BasicElement[] = [];
    constructor(altTagName ? : string) {
        this.element = document.createElement(altTagName ?? this.tagName);
        this.element["instance"] = this;
    }
    get tagName(): string {
        return "div";
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
            else if (element) this.element.appendChild(element.element);
            if (element instanceof BasicElement && this.children.indexOf(element) < 0) this.children.push(element);
        }
    }
    /**
     * clears content of element, if you like only certain class
     * @param className class to remove
     * @param recurse true if on all levels (also grand-children etc.), false if only direct children
     */
    clear(className ? : Function, recurse ? : boolean): void {
        if (className) {
            let children = this.findChildren(className, recurse ?? true)
            for (let child of children) {
                if (child.element.parentElement) child.element.parentElement.removeChild(child.element);
            }
        } else {
            while (this.element.childNodes.length > 0) {
                this.element.removeChild(this.element.childNodes[0]);
            }
        }
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
    constructor(public label: string | HTMLElement | BasicElement, public action: State | Function | string | false) {
        super();
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
        if (this.action != false) {
            if (this.action instanceof State) this.app.setState(this.action);
            else if (typeof (this.action) == "string") this.app.loadStateByURL(this.action);
            else this.action();
        }
    }
}
// HTML Button Element
export class Button extends ClickableElmnt {
    /**
     * 
     * @param label Label (innerText) of button
     * @param action State or function which a click event should trigger
     */
    get tagName(): string {
        return "button";
    }
    constructor(public label: string | HTMLElement | BasicElement, public action: State | Function | string) {
        super(label, action);
        this.addClass("button");
    }
}
export class PrimaryButton extends Button {
    constructor(public label: string | HTMLElement | BasicElement, public action: State | Function | string) {
        super(label, action);
        this.addClass("primaryAction");
    }
}

export class UserSpan extends ClickableElmnt {
    constructor(public username: string) {
        super(new Span(username ? `@${username}` : "Guest"), username ? `/users/@${username}` : false);
        this.app.log(`userspan for`, username);
        this.addClass("userSpan");
        if (username) this.addClass("underlined");
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
    constructor(...children: BasicElement[]) {
        super();
        for (let child of children) {
            this.add(child);
        }
    }
    addHomeLink(): Container {
        this.add(new HomeLink());
        return this;
    }
}
export class Image extends BasicElement {
    get tagName(): string {
        return "img";
    }
    constructor(public src: string, public alt ? : string) {
        super();
        this.element.setAttribute("src", this.src);
        if (this.alt) this.element.setAttribute("alt", this.alt);
    }
}

export class Link extends Container {
    get tagName(): string {
        return "a"
    };
    constructor({
        href,
        action
    }: {
        href ? : string;action ? : Function
    }, ...children: BasicElement[]) {
        super(...children);
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
        this.addClass("referralBadgeContainer");
    }
}

export class VersionInfo extends Link {
    constructor(versionHash ? : string) {
        super({
            href: "#"
        }, new Span());
        this.addClass("versionHash");
        this.update(versionHash);
    }
    update(versionHash) {
        (this.findChildren(Span)[0] as Span).update(versionHash ? versionHash : "source");
        this.element.setAttribute("href", versionHash ? `https://github.com/ttschnz/tictactoe_webapp/tree/${versionHash}` : "https://github.com/ttschnz/tictactoe_webapp/");
    }
}

export class Main extends Container {
    get tagName(): string {
        return "main";
    }
    constructor(...children: BasicElement[]) {
        super(...children);
    }
}
export class Footer extends BasicElement {
    get tagName(): string {
        return "footer";
    }
    constructor() {
        super();
        this.add(new VersionInfo());
        this.add(new ReferralBadge());
        app.api("/version").then((response) => {
            if (response.success) {
                let versionInfo = (this.findChildren(VersionInfo)[0] as VersionInfo)
                versionInfo.update(response.data.versionHash);
                if (!response.data.upToDate) versionInfo.addClass("behind");
                else versionInfo.addClass("upToDate");
            }
        })
    }
}
export class Header extends BasicElement {
    get tagName(): string {
        return "header";
    }
    constructor(showLogin: boolean = true, showLogo: boolean = true) {
        super();
        app.log(app);
        if (showLogo) this.add(new TicTacToeLogo());
        if (app.credentials) this.add(new FlexContainer(new UserSpan(app.credentials.username), new Button("Sign out", app.signOut)).addClass("centered"));
        else if (showLogin) this.add(new Button("Log in", login));
    }
}
export class FlexContainer extends Container {
    constructor(...children: BasicElement[]) {
        super(...children);
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
export class Tile extends FlexContainerColumn {
    constructor(...children: BasicElement[]) {
        super(...children);
        this.addClass("tile");
    }
}
export class SmallTile extends Tile {
    constructor(...children: BasicElement[]) {
        super(...children);
        this.addClass("small");
    }
}
export class Heading extends BasicElement {
    constructor(headingLevel: 1 | 2 | 3 | 4 | 5 | 6, content: string | BasicElement) {
        super(`h${headingLevel}`);
        if (content instanceof BasicElement) this.add(content);
        else this.add(document.createTextNode(content));
    }
}

export class HorizontalLine extends BasicElement {
    get tagName(): string {
        return "hr";
    }
    constructor(label: string = "") {
        super();
        this.addClass("labelledHr");
        this.element.dataset.label = label;
    }
}

export class Input extends BasicElement {
    input: HTMLInputElement;
    constructor(public name: string, public label: string, public type: string = "text", public required ? : boolean, value ? : string | undefined, public autocomplete ? : string | undefined, public validator ? : RegExp, public validatorErrorMessage ? : string) {
        super();
        this.addClass("labeled", "input");

        this.input = document.createElement("input");
        this.input.name = name;
        this.input.type = type;
        this.input.placeholder = label;
        if (value != undefined) this.value = value;
        if (autocomplete != undefined) this.input.setAttribute("autocomplete", autocomplete);
        if (required) this.input.setAttribute("required", "");
        this.add(this.input);

        let labelElement = document.createElement("label");
        labelElement.setAttribute("for", name);
        labelElement.appendChild(document.createTextNode(label));
        this.add(labelElement);

        if (this.validator) this.input.addEventListener("change", (_e) => {
            if (!this.validator.test(this.value)) this.input.setCustomValidity(this.validatorErrorMessage ?? "please enter a valid value.");
            else this.input.setCustomValidity("");
        });
    }
    get value() {
        return this.input.value;
    }
    set value(data) {
        this.input.value = data;
    }
}
export class Form extends Container {
    get tagName(): string {
        return "form";
    }
    constructor(...children: BasicElement[]) {
        super(...children);
        this.element.addEventListener("submit", (event) => {
            event.preventDefault();
        })
    }
}

export class Span extends BasicElement {
    constructor(content ? : string) {
        super("span");
        if (content) this.add(document.createTextNode(content));
    }
    update(...content: Array < string | BasicElement > ) {
        this.clear();
        for (let item of content) {
            if (typeof (item) == "string") this.add(document.createTextNode(item));
            else this.add(item);
        }
    }
}

export class MaterialIcon extends Span {
    constructor(iconName: string) {
        super(iconName);
        this.addClass("material-icons");
    }
}
export class MaterialIconButton extends Button {
    constructor(public label: string | HTMLElement | BasicElement, public action: State | Function) {
        super(label, action);
        this.addClass("material-icons");
    }
}
export class Warning extends FlexContainer {
    constructor(errorText: string, options ? : ErrorOptions) {
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
export class TinySpan extends Span {
    constructor(content ? : string) {
        super(content);
        this.addClass("tinySpan");
    }
}

export class Popup extends FlexContainerRow {
    constructor(...children: BasicElement[]) {
        super();
        this.add(new SmallTile(
            new FlexContainerColumn(
                new MaterialIconButton("clear", () => {
                    this.close()
                }).addClass("closeButton"),
                ...children)
        ).addClass("fixedWidth"))
        this.addClass("hidden", "popup", "centered");
        // close on click if the primary target of the click was the Popup (and not its content)
        this.element.addEventListener("click", (evt: PointerEvent) => {
            if (evt.target == this.element) this.close()
        });
        setTimeout(this.fadeIn.bind(this), 20);
    }
    fadeIn(): Promise < true > {
        this.removeClass("hidden");
        return new Promise((resolve, _reject) => {
            setTimeout((() => {
                resolve(true);
            }).bind(this), 330);
        });
    }
    fadeOut(): Promise < true > {
        this.addClass("hidden");
        return new Promise((resolve, _reject) => {
            setTimeout((() => {
                resolve(true);
            }).bind(this), 330);
        });
    }
    async close() {
        await this.fadeOut();
        this.element.parentElement.removeChild(this.element);
    }
}

export class HomeLink extends FlexContainerRow {
    constructor() {
        super(
            new MaterialIconButton("home", home),
            ...document.location.pathname.split("/")
            .filter(value => value != "")
            .map((value, index, arr) => new FlexContainerRow(
                new Span("/"),
                new ClickableElmnt(new Span(value), () => {
                    app.loadStateByURL("/" + arr.filter((_v, index2) => index >= index2).join("/"))
                })
            ))
        );

        this.addClass("homeLink");
    }
}

export class InfoTile extends Container {
    constructor(...children: BasicElement[]) {
        super(new MaterialIcon("info").addClass("infoIcon"), new Container(...children));
        this.addClass("infoTile")
    }
}

export class Table extends Container {
    get tagName(): string {
        return "table";
    }
    constructor(heading ? : TableHeadingRow) {
        super(heading);
    }
}

export class TableData extends Container {
    get tagName(): string {
        return "td";
    }
    constructor(value: string | BasicElement) {
        super();
        if (value instanceof BasicElement) this.add(value);
        else this.add(new Span(value));
    }
}

export class TableHeading extends TableData {
    get tagName(): string {
        return "th";
    }
    constructor(value: string | BasicElement) {
        super(value);
    }
}

export class SortableTableHeading extends TableHeading {
    _currentSorting: SortingOptions = "NONE";
    constructor(public key: string, public onClick: (this: any, args: SortableTableHeading) => any, private tableManager: any, content ? : BasicElement) {
        super(content ?? key);
        this.addClass("clickable");
        this.addClass("sortableTableHeading");
        this.element.addEventListener("click", this.sort.bind(this));
    }
    sort() {
        let parent = this.element.parentElement["instance"] as SortableTableHeadingRow;
        (parent.findChildren(SortableTableHeading) as SortableTableHeading[]).forEach((sortableTableHeading) => {
            if (sortableTableHeading != this) sortableTableHeading.currentSorting = "NONE";
        })
        this.onClick(this);
    }
    set currentSorting(value: SortingOptions) {
        this._currentSorting = value;
        this.element.dataset.currentSorting = value;
    }
    get currentSorting() {
        return this._currentSorting;
    }
}

export class TableRow extends Container {
    get tagName(): string {
        return "tr"
    };
    constructor(...values: (string | BasicElement)[]) {
        super();
        for (let value of values) {
            this.add(new TableData(value))
        }
    }
}
export class TableHeadingRow extends Container {
    get tagName(): string {
        return "tr";
    }
    constructor(...keys: (string | BasicElement)[]) {
        super();
        for (let key of keys) {
            this.add(new TableHeading(key));
        }
    }
}

export class SortableTableHeadingRow extends Container {
    get tagName(): string {
        return "tr";
    }
    constructor(onClick: (this: any, args: MouseEvent | any) => any, tableManager: any, ...keys: (string | {
        key: string,
        content: BasicElement
    })[]) {
        super();
        for (let key of keys) {
            if (typeof key == "string") this.add(new SortableTableHeading(key, onClick, tableManager));
            else this.add(new SortableTableHeading(key.key, onClick, key.content))
        }
    }
}