import {createClient, RedisClientType} from "redis";
import {DEPTH_UPDATE, TICKER_UPDATE} from "./trade/events";
import { dbMessage } from "./types/db";
import { WsMessage } from "./types/toWs";
import { MessageToApi } from "./types/toApi";


export class RedisManager {

    private client : RedisClientType;
    private static instance : RedisManager;

    constructor() {
        this.client = createClient();
        this.client.connect();
    }

    public static getInstance() {

        if(!this.instance) {

            this.instance = new RedisManager();

        }

        return this.instance;
    }

    public pushMessage(message : dbMessage) {

        this.client.lPush("db_processor", JSON.stringify(message));

    }

    public publishMessage(channel : string, message : WsMessage) {

        this.client.publish(channel, JSON.stringify(message));

    }

    public sendToApi(clientId : string, message : MessageToApi) {

        this.client.publish(clientId, JSON.stringify(message));
    }

}
