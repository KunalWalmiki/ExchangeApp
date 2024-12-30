import {WebSocket} from "ws";
import { outgoingMessage } from "./types/out";
import { IncomingMessage, SUBSCRIBE, UNSUBSCRIBE } from "./types/in";
import { SubscriptionManager } from "./SubscriptionManager";


export class User {

    private id : string;
    private ws : WebSocket;
    private subscriptions : string[] = [];

    constructor(id : string, ws: WebSocket) {

        this.id = id;
        this.ws = ws;
        this.addEventListner();

    }

    public subscribe(subscription : string) {
        this.subscriptions.push(subscription);
    } 

    public Unsubscribe(subscription : string) {
        this.subscriptions = this.subscriptions.filter(s => s !== subscription);
    }

    public emit(message : outgoingMessage) {
        console.log(message);
        this.ws.send(JSON.stringify(message));
    }

    private addEventListner() {
        this.ws.on('message', (message : string) => {

            const parsedMessage : IncomingMessage = JSON.parse(message);

            console.log(parsedMessage);

            if(parsedMessage.method === SUBSCRIBE) {
                parsedMessage.params.forEach(s => SubscriptionManager.getInstance().subscribe(this.id, s));
            }

            if(parsedMessage.method === UNSUBSCRIBE) {
                parsedMessage.params.forEach(s => SubscriptionManager.getInstance().subscribe(this.id, parsedMessage.params[0]));
            }
        })
    }
}