import WebApp, {
    JSONResponse
} from "./webapp.js";
import {
    Authenticator
} from "./game.js";
// TODO: comments

export type listener = {
    resolve: Function,
    reject: Function
};
export type messageListener = {
    [key: string]: listener
};

export type SocketResponse = JSONResponse & {
    action: string,
    msgId: string
}
const forge = window["forge"];

export default class WebSocketConnection {
    socket: WebSocket;
    open: boolean = false;
    openListeners: listener[] = [];
    messageListeners: messageListener = {};
    constructor(public app: WebApp) {
        this.createSocket();
    }

    createSocket() {
        console.log("creating socket");
        this.socket = new WebSocket(`${this.socketProtocol}${document.location.host}/ws`);
        this.socket.onopen = () => {
            while (this.openListeners.length > 0) {
                let pair = this.openListeners.pop();
                this.open = true;
                pair.resolve(true);
            }
        }

        this.socket.onclose = () => {
            console.log("socket closed");
            while (this.openListeners.length > 0) {
                let pair = this.openListeners.pop();
                pair.resolve(false);
            }
            setTimeout(() => {
                this.createSocket();
            }, 200);
            this.open = false;
        }

        this.socket.onmessage = (ev: MessageEvent) => {
            let message: SocketResponse = JSON.parse(ev.data);
            let pair = this.messageListeners[message.msgId];
            if (pair) {
                pair.resolve(message);
            }
        }
    }

    get socketProtocol(): String {
        if (document.location.protocol == "https://") return "wss://";
        else return "ws://";
    }

    async awaitOpen(): Promise < boolean > {
        return new Promise((resolve, reject) => {
            if (this.socket.readyState == this.socket.OPEN) resolve(true);
            else this.openListeners.push({
                resolve,
                reject
            });
        })
    }
    /**
     * awaits a response for a message
     * @param action 
     * @returns 
     */
    async awaitMessage(msgId: string): Promise < SocketResponse > {
        return new Promise((resolve, reject) => {
            this.messageListeners[msgId] = {
                resolve,
                reject
            }
        });
    }

    /**
     * 
     * @param action action to preform on the server
     * @param args arguments required for the action
     * @returns the response from the server
     */
    send(action: string, args ? : any, sendCredentials: boolean = false, gameKey ? : Authenticator["gameKey"]): Promise < SocketResponse > {
        return new Promise(async (resolve, _reject) => {
            await this.awaitOpen();
            let msgId = forge.util.bytesToHex(forge.random.getBytes(36))
            this.socket.send(JSON.stringify({
                action,
                arguments: args,
                msgId,
                ...(this.app.credentials && sendCredentials ? this.app.credentials : {}),
                ...(gameKey ? {gameKey} : {})
            }));
            resolve(await this.awaitMessage(msgId));
        });
    }

    /**
     * Ping the server over WebSocket and find out how fast the connection is
     * @returns ping in ms
     */
    async ping(): Promise < number > {
        let startTime = new Date().getTime();
        await this.send("ping");
        let endTime = new Date().getTime();
        return endTime - startTime
    }
}