import {createClient} from 'redis';
import pg from 'pg'; 
import { dbMessage } from './types/db';

const pgClient = new pg.Client({
    user: 'postgres',
    database: 'ExchangeApp_Db',
    port: 5432,
    host: 'localhost',
    password: 'Kwalmiki@15',
});
pgClient.connect();


async function main() {

    const client = createClient();
    await client.connect();

    console.log("Connected to Redis");

    while (true) {

        const response = client.rPop("db_processor" as string);

        if(!response) {

        } else {

            // @ts-ignore
            const data : dbMessage = JSON.parse(response);

            if(data?.type === 'TRADE_ADDED') {
                console.log("data Added");
                console.log(data);
                const price = data.data.price;
                const timestamp = new Date(data.data.timestamp);
                const query = "INSERT INTO tata_price (time, price) VALUES ($1, $2)";
                 // TODO: How to add volume?
                 const values = [price, timestamp];
                 await pgClient.query(query, values);
                 
            }

        }
    }
}

main();