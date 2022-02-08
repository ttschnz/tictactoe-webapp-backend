import State, {
    ErrorOptions
} from "./state.js";
import {
    StateId
} from "./state.js";

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
    }

    api(target: string, data = {}): Promise < any > {
        return new Promise((resolve, _reject) => {
            
            fetch(target, {
                    method: "post",
                    body: new URLSearchParams(Object.entries(data)).toString(),
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
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

                    resolve([null, undefined, NaN].indexOf(responseJson) != -1 ? {} : responseJson);
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
        this.states[state.stateId] = state;
    }
    /**
     * Changes the location of the url to a given states id
     * @param id Identifier of state desired to be changed to
     */
    public setState(state: State) {
        this.state = state;
    }
    /**
     * sets the state to a given state and renders it
     */
    public set state(state: State) {
        // save state
        this.states[state.stateId] = state
        // set state
        window.history.pushState(state.stateId, state.title, state.url);
        // render it
        this.render();
    }
    /**
     * returns the current state
     */
    public getState(state: State) {
        return this.state
    }
    /**
     * gets the current state by the id saved in window.history 
     * using the id as index in this.states
     */
    public get state() {
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
    showError(errorText: string, options: ErrorOptions) {
        this.state.showError(errorText, options);
    }
}