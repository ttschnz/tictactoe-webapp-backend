import WebApp from "./webapp.js";
import { BasicElement, Warning } from "./elements.js";
// type for State.stateId
export type  StateId = string|number;

export interface ErrorOptions{
    retry?:Function|undefined,
    cancel?:Function|undefined,
    ok?:Function|undefined
};

export default class State{
    renderTarget:WebApp["renderTarget"] = document.body;
    stateSetter:WebApp["setState"]= ()=>{};
    stateGetter:WebApp["getState"]=()=>this;
    log:WebApp["log"] = console.log;
    app:WebApp;
    /**
     * 
     * @param stateId unique id of the state
     * @param title title of the state (not used in most browsers)
     * @param url url to be shown
     */
    constructor(public stateId:StateId, public title:string, public url: string){
    }
    /**
     * calls the render function with the parameters relevant to the webAppInstance given
     * @param webAppInstance Instance of WebApp which the state should be rendered to
     */
    render(webAppInstance):void{
        this.renderTarget = webAppInstance.renderTarget;
        this.stateGetter = webAppInstance.getState;
        this.stateSetter = webAppInstance.setState;
        this.log = webAppInstance.log;
        webAppInstance.log(`rendering State "${this.title}" (id=${this.stateId})`, this);
        this.renderFunction(this.addElement.bind(this), webAppInstance);
    }
    /**
     * Add an Element to the screen
     * @param elmnt a BasicElement that will be added to the target element
     */
    addElement(elmnt:BasicElement){
        this.renderTarget.appendChild(elmnt.element);
    }

    /**
     * 
     * @param renderTarget the target to render the app to
     * @param stateSetter function setting the state
     * @param stateGetter function returning the state
     * @param log function for logging
     */
    renderFunction(addElement:Function, app:WebApp){
        this.log(`empty renderFunction called`, this);
    }
    /**
     * Function to show an error to the user
     * @param errorText 
     * @param options 
     */
    showError(errorText:string, options:ErrorOptions){
        this.addElement(new Warning(errorText, options));
    }
}