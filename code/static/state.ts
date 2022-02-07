import WebApp from "./webapp.js";

// type for State.stateId
export type  StateId = string|number;

export default class State{
    renderTarget:WebApp["renderTarget"] = document.body;
    stateSetter:WebApp["setState"]= ()=>{};
    stateGetter:WebApp["getState"]=()=>this;
    log:WebApp["log"] = console.log;
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
        this.renderFunction();
    }
    /**
     * 
     * @param renderTarget the target to render the app to
     * @param stateSetter function setting the state
     * @param stateGetter function returning the state
     * @param log function for logging
     */
    renderFunction():void{
        this.log(`empty renderFunction called`, this);
    }
}