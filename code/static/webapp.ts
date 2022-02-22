import {
    app
} from "./main.js";
import State, {
    ErrorOptions
} from "./state.js";
import {
    StateId
} from "./state.js";
import { errorState, home } from "./states.js";

export type JSONResponse = {
    success: boolean,
    data?:any,
    error?:any
}

export type Credentials = {
    username: string,
    token: string,
    tokenExpiration: number
}

export default class WebApp {
    states: {
        [key: StateId]: State
    } = {};
    versionHash: string;
    /**
     * Constructs a WebApp and renders in document.body if not told otherwise via parameter
     * @param renderTarget the target Element where the WebApp should put itself
     * @param debug whether the app should be started in debug mode or not
     */
    constructor(public renderTarget: HTMLElement = document.body, public debug: Boolean = false) {
        // render the page
        this.render();
        // tell the browser to render when the state changes
        window.addEventListener('popstate', (_event: PopStateEvent) => {
            this.render();
        });
        // custom css variable for vh for mobile (documented: https://allthingssmitty.com/2020/05/11/css-fix-for-100vh-in-mobile-webkit/)
        window.addEventListener("resize", ()=>{
            document.body.style.setProperty("--vh", `${window.innerHeight/100}px`);
        })
        window.dispatchEvent(new UIEvent("resize"));
        // check if the credentials are valid
        this.checkCredentials()
    }
    /**
     * figures out what state is supposed to be loaded with a given url
     * @param url url to load
     */
    loadStateByURL(url?:string){     
        this.log("loading state by url:", url);
        if(url == undefined) url = document.location.pathname;
        // find the matching state (if there are multiple, just take the first)
        let matchingStates = Object.values(app.states).filter(state => {
            // if the url matches the path
            console.log(state.url, state.regEx, url);
            if(state.url == url) return true;
            // if the regex matches the path
            if(state.regEx && state.regEx.test(url)) return true;
        });
        this.log(`found ${Object.values(matchingStates??{}).length} matching states:`, matchingStates)
        this.setState((matchingStates ?? [])[0] ?? errorState, url);
    }

    api(target: string, data = {}, sendToken = false): Promise < JSONResponse > {
        return new Promise((resolve, _reject) => {
            fetch(target, {
                    method: "post",
                    body: new URLSearchParams(Object.entries(data)).toString(),
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        ...(sendToken && this.credentials ? {
                            "Authorisation": `Bearer ${this.credentials.token}`
                        } : {})
                    }
                })
                .then(async response => {
                    if (!response.ok) {
                        resolve({
                            success: false,
                            error: response.statusText
                        });
                    }
                    let responseJson = await response.json();
                    // resolve with response if it is is parseable, else resolve with empty object
                    resolve(([null, undefined, NaN].indexOf(responseJson) != -1 ? {success:false} : responseJson) as JSONResponse);
                })
                .catch((reason) => {
                    resolve({
                        success: false,
                        error: reason
                    });
                });
        });
    }

    /**
     * adds a state tho the saved list of states, to be later remembered by its id
     * @param state state to be added to list
     */
    addState(state: State) {
        this.log(`adding state ${state.stateId}: ${state.url}`)
        this.states[state.stateId] = state;
    }
    /**
     * Changes the location of the url to a given states id
     * @param id Identifier of state desired to be changed to
     */
    public setState(state: State, url:string=document.location.pathname) {
        // save state
        this.log(`adding state`, state, `${url}`);
        this.states[state.stateId] = state;
        state.urlGetter = ()=>url;
        if (state.regEx) state.regExResult = url.match(state.regEx);
        // set state
        this.state = state;
        // set the title to the title of the state
        document.title = `${state.title} - TicTacToe`;
        // render it
        this.render();
    }
    /**
     * sets the state to a given state and renders it
     */
    private set state(state: State) {
        window.history.pushState(state.stateId, state.title, state.url);
    }
    /**
     * returns the current state
     */
    public getState() {
        return this.state
    }
    /**
     * gets the current state by the id saved in window.history 
     * using the id as index in this.states
     */
    private get state() {
        return this.states[window.history.state];
    }
    /**
     * asks the server for the version if not know, then returns
     * @returns git's version hash
     */
    async getVersionHash() {
        if (!this.versionHash) this.versionHash = (await this.api("/version")).data;
        return this.versionHash;
    }
    /**
     * returns the credentials from localStorage, false if not authenticated
     */
    public get credentials(): Credentials|false {
        // construct an object containing the credentials
        let cred: Credentials = {
            username: localStorage.getItem("username"),
            token: localStorage.getItem("token"),
            tokenExpiration: Number(localStorage.getItem("tokenExpiration"))
        };
        // if the username, the token, and an expiration date is set, and the token is still valid, return the crendentials. if not, return false
        if(cred.username && cred.token && cred.tokenExpiration && cred.tokenExpiration <= new Date().getTime()) return cred;
        else return false;
    }

    public set credentials(value:Credentials|false){
        if(!value) {
            localStorage.removeItem("token");
            localStorage.removeItem("tokenExpiration");
            localStorage.removeItem("username");
        }else{    
            localStorage.setItem("token", value.token);
            localStorage.setItem("tokenExpiration", String(value.tokenExpiration));
            localStorage.setItem("username", value.username);
            this.checkCredentials()
        }
    }

    async checkCredentials():Promise<boolean>{
        if(this.credentials){    
            let response = await this.api("/checkCredentials", {}, true);
            if(response.success && response.data == this.credentials.username) return true;
            else{
                this.signOut();
                return false;
            }
        }else{
            return false;
        }
    }

    signOut():void{
        app.credentials = false;
        app.setState(home);
        app.showError("You were signed out.");
    }
    /**
     * calls the render function of current state
     */
    render(): void {
        this.renderTarget.innerHTML = "";
        if (this.state) this.state.render(this);
        else this.log(`no state found to render`);
    }
    /**
     * delay a callback function to when the app is loaded
     * @param callback function to call when app has loaded
     */
    onReady(callback: Function) {
        setTimeout(callback, 20);
    }
    /**
     * logs data to console
     * @param content stuff to be logged
     */
    log(...content: any[]): void {
        console.log(...content);
    }
    showError(errorText: string, options?: ErrorOptions) {
        this.log(`showing error ${errorText}`, `opts:`, options);
        this.state.showError(errorText, options);
    }
}