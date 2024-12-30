import express from "express";
import cors from "cors";
import {orderRouter} from "./routes/orders";
import {depthRouter} from "./routes/depth";
import {klineRouter} from "./routes/Kline";
import {tickerRouter} from "./routes/ticker";
import {tradesRouter} from "./routes/trades";

const app = express();

app.use(cors());
app.use(express.json());

// mounting routes 
app.use("/api/v1/order", orderRouter);
app.use("/api/v1/depth", depthRouter);
app.use("/api/v1/trades", tradesRouter);
app.use("/api/v1/klines", klineRouter);
app.use("/api/v1/tickers", tickerRouter);

app.listen(3000, () => {

    console.log(`Your Server is Up and Running at PORT ${3000}`);
    
})