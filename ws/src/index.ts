import {WebSocketServer, WebSocket} from "ws";
import { UserManager } from "./UserManager";

const ws = new WebSocketServer({port : 3001});

ws.on('connection', (ws) => {
    UserManager.getInstance().addUser(ws);
})