import {createClient, RedisClientType} from "redis"
import { UserManager } from "./UserManager";
import { User } from "./User";
import { outgoingMessage } from "./types/out";

export class SubscriptionManager {

    private static instance : SubscriptionManager;
    private subscriptions : Map<string, string[]> = new Map();
    private reversedSubscription : Map<string, string[]> = new Map();
    private redisClient : RedisClientType;
    
    private constructor() {
        this.redisClient = createClient();
        this.redisClient.connect();
    }

    public static getInstance() {

        if(!this.instance) {
            this.instance = new SubscriptionManager();
        }

        return this.instance;

    }

    public subscribe(userId : string, subscription : string) {

        // check user already have subscribed to the same event
        if(this.subscriptions.get(userId)?.includes(subscription)) {
            return;
        }

        // store the user and their subscription
        this.subscriptions.set(userId, (this.subscriptions.get(userId) || []).concat(subscription));

        // store the subscription and its user who has subscribed to it
        this.reversedSubscription.set(subscription, (this.reversedSubscription.get(subscription) || []).concat(userId));
        
        // check if the user is first user to subscribe the market
        if(this.reversedSubscription.get(subscription)?.length == 1) {
            console.log("subscribed");
            console.log("subsription",subscription)
            this.redisClient.subscribe(subscription, this.redisCallBackHandler);
        }
        
    }

    public unSubscribe(userId : string, subscription : string) {

        // find user subscriptions 
        const subscriptions = this.subscriptions.get(userId);

        if(subscriptions) {

            // remove subscription from user subscription
            this.subscriptions.set(userId, subscriptions.filter(s => s !== subscription));

        }

        const reversedSubscriptions = this.reversedSubscription.get(subscription);

        if(reversedSubscriptions) {

            // remove the user from the reversed Subscription
            this.reversedSubscription.set(subscription, reversedSubscriptions.filter(u => u !== userId));
           
            // find if current subscription list of users is 0 
            if(this.reversedSubscription.get(subscription)?.length == 0) {

                 // remove the subscription from reversedSubscription if no user subscribed
                 this.reversedSubscription.delete(subscription);

                // unsubscribe to the redis pubsub if no user is subscribed 
                this.redisClient.unsubscribe(subscription);
            }
        }
    }

    private redisCallBackHandler = (message : string, channel : string) => {
        console.log("redis call back", message)
        const parsedMessage = JSON.parse(message);
        this.reversedSubscription.get(channel)?.forEach((u) => {
            const user = UserManager.getInstance().getUser(u) as unknown as User;
            user.emit(parsedMessage);
        })
    }
    
    public userLeft(userId : string) {
        this.subscriptions.get(userId)?.forEach(s => this.unSubscribe(userId, s));
    }

    public getSubscriptions(id : string) {
        return this.subscriptions.get(id) || [];
    }
}