import ws, {WebSocket} from "ws";
import { User } from "./User";
import { SubscriptionManager } from "./SubscriptionManager";

export class UserManager {

    private static instance : UserManager;
    private users : Map<string, User> = new Map();

    private constructor() {

    }

    public static getInstance() {

        if(!this.instance) {

            this.instance = new UserManager;
        }

        return this.instance;
    }

    public addUser(ws : WebSocket) {

        console.log("user Added");
        
        const id = this.generateId();
        const user = new User(id, ws);
        this.users.set(id, user);
        this.registerOnClose(ws, id);
        return user;
    }

   
     
    private registerOnClose(ws : WebSocket, id : string) {
        ws.on('close', () => {
            this.users.delete(id);
            SubscriptionManager.getInstance().userLeft(id);
        })
    }

    public getUser(id : string) {

        return this.users.get(id);

    }
    public generateId() {

        return Math.random().toString(36).substring(2,15) + Math.random().toString(36).substring(2,15);
    }
}