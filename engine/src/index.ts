import { Engine } from "./trade/Engine";
import { createClient } from "redis";
import { OrderBook } from "./trade/OrderBook";

async function main() {

    const engine = new Engine();
    const redisClient = createClient();
    await redisClient.connect();
    console.log("Redis is connected");

    while(true) {

        const response = await redisClient.rPop("message" as string);

        if(!response) {

        } else {

            engine.process(JSON.parse(response));

        }
    }
}

main();