import fs from "fs";
import {RedisManager} from "../RedisManager";
import {ORDER_UPDATE, TRADE_ADDED} from "../types/index";
import {order, Fill} from  "../types/order";
import {UserBalance} from "../types/balance";
import { BASE_CURRENCY } from "../types/currency";
import { OrderBook } from "./OrderBook";
import { GET_OPEN_ORDERS, messageFromApi } from "../types/fromAPI";
import { CANCEL_ORDER, CREATE_ORDER, GET_DEPTH, ON_RAMP } from "../types/toApi";


export class Engine {

    private orderBooks : OrderBook[] = [];
    private balances : Map<string, UserBalance> = new Map();

    constructor() {

        let snapshot = null;
        const newOrderBook = new OrderBook("TATA",[], [], 0, 0);
        this.orderBooks.push(newOrderBook);

        this.balances.set("1", {
            "INR" : {
                available : 10000,
                locked  : 0,
            }
        })

        try {

            if(process.env.WITH_SNAPSHOT) {

                snapshot = fs.readFileSync('./snapshot.json');
            }

        } catch(e) {
            console.log(e);
        }

        if(snapshot) {
            
            const snapshotsSnap = JSON.parse(snapshot.toString());
            
            if(snapshotsSnap.orderBooks && snapshotsSnap.balances) {

                this.orderBooks = snapshotsSnap.orderBooks.map((o : OrderBook) => new OrderBook(o.baseAsset, o.bids, o.asks, o.lastTradeId, o.currentPrice));
                this.balances = new Map(snapshotsSnap.balance);

            } else {

                this.orderBooks = [new OrderBook(`TATA`, [], [], 0, 0)];
                // this.setBaseBalancees();

            }
            
            setInterval(() => {
                this.saveSnapShot();
            }, 1000 * 3)

        }
    }

    saveSnapShot() {

        const snapShot = {
            orderBooks : this.orderBooks.map((o : OrderBook) => o.getsnapshot()),
            balances : Array.from(this.balances.entries()),
        }

        fs.writeFileSync("./snapshot.json", JSON.stringify(snapShot));
    }

    process({message , clientId} : {
        message : messageFromApi,
        clientId : string
    }) {

        switch(message.type) {

            case CREATE_ORDER :
                
                try {
                    
                    const {executedQty, fills, orderId} = this.createOrder(message.data.market, message.data.price, message.data.quantity, message.data.side, message.data.userId);
                    console.log("orderId", orderId);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type : "ORDER_PLACED",
                        payload : {
                            orderId : orderId,
                            executedQty,
                            fills,
                        }
                    });

                } catch(error) {

                    console.log(error);
                    RedisManager.getInstance().sendToApi(clientId, {
                        type : "ORDER_CANCELLED",
                        payload : {
                            orderId : "",
                            executedQty : 0,
                            remainingQty : 0,
                        }
                    })
                }
                break;
            
            case CANCEL_ORDER : 

            try {

                const orderId = message.data.orderId;
                const cancelMarket = message.data.market;
                const cancelOrderbook = this.orderBooks.find(o => o.ticker() === cancelMarket);
                const quoteAsset = cancelMarket.split("_")[1];

                if(!cancelOrderbook) {

                    throw new Error("No orderbook found");

                }

                const order = cancelOrderbook.asks.find(o => o.orderId === orderId) || cancelOrderbook.bids.find(o => o.orderId === orderId);

                if(!order) {
                    console.log("No order Found");
                    throw new Error("No order found");
                }

                if(order.side === "buy") {

                    const price = cancelOrderbook.cancelBid(order);
                    const leftQuantity = (order.quantity - order.filled) * order.price;

                    // @ts-ignore
                    this.balances.get(order.userId)[BASE_CURRENCY].available += leftQuantity;

                     // @ts-ignore
                     this.balances.get(order.userId)[BASE_CURRENCY].locked -= leftQuantity;

                     if(price) {

                        this.sendUpdatedDepthAt(price.toString(), cancelMarket);

                     }
                    

                } else {

                    const price = cancelOrderbook.cancelAsk(order);
                    const leftQuantity = (order.quantity - order.filled) * order.price;

                    // @ts-ignore
                    this.balances.get(order.userId)[BASE_CURRENCY].available += leftQuantity;

                     // @ts-ignore
                     this.balances.get(order.userId)[BASE_CURRENCY].locked -= leftQuantity;

                     if(price) {

                        this.sendUpdatedDepthAt(price.toString(), cancelMarket);

                     }
                    
                }

                RedisManager.getInstance().sendToApi(clientId, {
                    type : "ORDER_CANCELLED",
                    payload : {
                        orderId,
                        executedQty : 0,
                        remainingQty : 0,
                    }
                })

            } catch(error) {

                console.log("Error while cancelling order");
                console.log(error);

            }
            break;

            case GET_OPEN_ORDERS : 

            try {

                const openOrderBook = this.orderBooks.find((o) => o.ticker() === message.data.market);

                if(!openOrderBook) {

                    throw new Error("No Orderbook found");

                }

                const openOrders = openOrderBook.getOpenOrders(message.data.userId);

                if(openOrders.length < 0) {

                    RedisManager.getInstance().sendToApi(clientId, {
                        type : "OPEN_ORDERS",
                        payload : [],
                    })

                } else {

                    RedisManager.getInstance().sendToApi(clientId, {
                        type : "OPEN_ORDERS",
                        payload : openOrders,
                    })

                }

            } catch(error) {

                console.log(error);

            }
            break;

            case ON_RAMP : 

            const userId = message.data.userId;
            const amount = Number(message.data.amount);
            this.onRamp(userId, amount);
            break;

            case GET_DEPTH : 

            try {

                const market = message.data.market;
                const orderBook = this.orderBooks.find((o) => o.ticker() === market);

                if(!orderBook) {

                    throw new Error("OrderBook not found");

                }

                RedisManager.getInstance().sendToApi(clientId, {
                    type : "DEPTH",
                    payload : orderBook.getDepth()
                });

            } catch(error) {

                console.log(error);
                RedisManager.getInstance().sendToApi(clientId, {
                    type: "DEPTH",
                    payload: {
                        bids: [],
                        asks: []
                    }
                });

            }
            break;
        }
    }

    addOrderBook(orderBooks : OrderBook) {

        this.orderBooks.push(orderBooks);

    }

    createOrder(market : string, price : string, quantity : string, side : "buy" | "sell", userId : string) {

        const orderBook = this.orderBooks.find(o => o.ticker() === market);
        const baseAsset = market.split("_")[0];
        const quoteAsset = market.split("_")[1];

        if(!orderBook) {

            throw new Error("No orderbook found");
        }

        this.checkAndLockFunds(baseAsset, quoteAsset, side, userId, quoteAsset, price, quantity);

        const order : order = {
            price : Number(price),
            quantity : Number(quantity),
            orderId : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
            filled : 0,
            side,
            userId,
        }

        const {fills, executedQty} = orderBook.addOrder(order);
        this.updateBalance(userId, baseAsset, quoteAsset, fills, side, executedQty);
        this.createDbTrades(fills, market, userId);
        this.updateDbOrders(order, executedQty, fills, market);
        this.publishWsDepthUpdates(fills, price, side, market);
        this.publishWsTrade(fills, userId, market);
        return {executedQty, fills, orderId : order.orderId};

    }

    updateDbOrders(order : order, executedQty : number, fills : Fill[], market : string) {

        RedisManager.getInstance().pushMessage({
            type : ORDER_UPDATE,
            data : {
                orderId : order.orderId,
                executedQty : executedQty,
                market : market,
                price : order.price.toString(),
                quantity : order.quantity.toString(),
                side : order.side,
            }
        })

        fills.forEach((fill) => {

            RedisManager.getInstance().pushMessage({
                type : ORDER_UPDATE,
                data : {
                    orderId : fill.markerOrderId,
                    executedQty : fill.qty,
                }
        })
        })
    }

    createDbTrades(fills : Fill[], userId : string, market : string) {

        fills.forEach(fill => {

            RedisManager.getInstance().pushMessage({
                type : "TRADE_ADDED",
                data : {
                    market : market,
                    id : fill.tradeId.toString(),
                    isBuyerMaker : fill.otherUserId === userId,
                    price : fill.price,
                    quantity : fill.qty.toString(),
                    quoteQuantity : (fill.qty * Number(fill.price)).toString(),
                    timestamp : Date.now(),
                }
            })
        })
    }

    publishWsTrade(fills : Fill[], userId : string, market : string) {

        fills.forEach((fill) => {

            RedisManager.getInstance().publishMessage(`trade@${market}`, {
                stream : `trade@${market}`,
                data : {
                    e : "trade",
                    t : fill.tradeId,
                    m : fill.otherUserId === userId, //todo is this right way
                    p : fill.price,
                    q : fill.qty.toString(),
                    s : market,
                }
            })
        })
    }

    sendUpdatedDepthAt(price : string, market : string) {

        const orderBook = this.orderBooks.find((o : OrderBook) => o.ticker() === market);

        if(!orderBook) {
            return;
        }

        const depth = orderBook.getDepth();
        const updatedAsks = depth?.asks?.filter(a => a[0] === price);
        const updatedBids = depth?.bids.filter(b => b[0] === price);

        RedisManager.getInstance().publishMessage(`depth@${market}`, {
            stream : `depth@${market}`,
            data : {
                a : updatedAsks.length ? updatedAsks : [[price , "0"]],
                b : updatedBids.length ? updatedBids : [[price , "0"]],
                e : "depth",
            }
        })

    }

    publishWsDepthUpdates(fill : Fill[], price : string, side : "buy" | "sell", market : string) {

        // finding order book belong to same market
        const orderBook  = this.orderBooks.find((o : OrderBook) => o.ticker() === market);

        // if order book is not present
        if(!orderBook) {
            return;
        }

        const depth = orderBook.getDepth();

        if(side === "buy") {

            const updatedAsks = depth.asks.filter(a => fill.map((f) => f.price).includes(a[0].toString()));
            const updatedBids = depth.bids.find(b => b[0] === price);

            console.log("publish ws depth updates");

            RedisManager.getInstance().publishMessage(`depth@${market}`, {
                stream : `depth@${market}`,
                data : {
                    a : updatedAsks,
                    b : updatedBids ? [updatedBids] : [],
                    e : "depth"
                }
            })
        }

        if(side === "sell") {

            const updatedBids = depth.bids.filter((b) => fill.map((f) => f.price).includes(b[0].toString()));
            const updatedAsks = depth.asks.find(a => a[0] === price);

            console.log("publish ws depth updates");
            RedisManager.getInstance().publishMessage(`depth@${market}`, {
                stream : `depth@${market}`,
                data : {
                    a : updatedAsks ? [updatedAsks] : [],
                    b : updatedBids,
                    e : "depth"
                }
            })
        }

    }

    updateBalance(userId : string, baseAsset : string, quoteAsset : string, fills : Fill[], side : "buy" | "sell", executedQty : number) {

        if(side === 'buy') {

            fills.forEach((fill) => {

                // update quote asset balance
                // @ts-ignore
                this.balances.get(fill.otherUserId)?.[quoteAsset]?.available = this.balances.get(fill.otherUserId)?.[quoteAsset]?.available + (fill.qty * fill.price );

                // @ts-ignore
                this.balances.get(userId)?.[quoteAsset]?.locked = this.balances.get(userId)?.[quoteAsset]?.locked - ( fill.qty * fill.price );

                // update base asset balance
                // @ts-ignore
                this.balances.get(fill.otherUserId)?.[baseAsset]?.locked = this.balances.get(fill.otherUserId)?.[baseAsset]?.locked - (fill.qty);

                //@ts-ignore
                this.balances.get(userId)?.[baseAsset]?.available =  this.balances.get(userId)?.[baseAsset]?.available + fill.qty;
            })

        } else {

            fills.forEach((fill) => {

                // update quote asset 
                // @ts-ignore
                this.balances.get(fill.otherUserId)?.[quoteAsset]?.locked = this.balances.get(fill.otherUserId)?.[quoteAsset]?.locked - (fill.qty * fill.price);

                //@ts-ignore
                this.balances.get(userId)?.[quoteAsset]?.available =  this.balances.get(userId)?.[quoteAsset]?.available + (fill.price * fill.qty);

                // update base asset balance
                // @ts-ignore
                this.balances.get(fill.otherUserId)?.[baseAsset]?.available = this.balances.get(fill.otherUserId)?.[baseAsset]?.available + (fill.qty);

                // @ts-ignore
                this.balances.get(userId)?.[baseAsset]?.locked = this.balances.get(userId)?.[baseAsset]?.locked - (fill.qty);
            })
        }
    }

    checkAndLockFunds(baseAsset : string, quoteAsset : string, side : "buy" | "sell", userId : string, asset : string, price : string, quantity : string,) {

        if(side === 'buy') {

            // check if user has enough balance to buy 
            if((this.balances.get(userId)?.[quoteAsset]?.available || 0) < Number(quantity) * Number(price)) {

                throw new Error("Insufficient Funds");

            }

            // if have, then reduce the balance 
            // @ts-ignore
            this.balances.get(userId)?.[quoteAsset]?.available = this.balances.get(userId)?.[quoteAsset]?.available - Number(price) * Number(quantity);

            // lock the amount
            // @ts-ignore
            this.balances.get(userId)?.[quoteAsset]?.locked = this.balances.get(userId)?.[quoteAsset]?.locked + (Number(price) * Number(quantity));

        } else {

             // if user wants to sell
             if((this.balances.get(userId)?.[quoteAsset].available || 0) < Number(quantity)) {
                throw new Error("Insuficient Funds");
             } 

             //if your have enough quantity to sell then reduce the quantity   
             // @ts-ignore
             this.balances.get(userId)?.[quoteAsset]?.available = this.balances.get(userId)?.[quoteAsset].available - Number(quantity);

            //  lock the quantity which is in process
            // @ts-ignore
             this.balances.get(userId)?.[quoteAsset]?.locked = this.balances.get(userId)?.[quoteAsset].locked + Number(quantity);
        }
    }

    onRamp(userId : string, amount : number) {

        const userBalance = this.balances.get(userId);

        if(!userBalance) {

            this.balances.set(userId, {
                [BASE_CURRENCY] : {
                    available : amount,
                    locked : 0,
                }
            });

        } else {

            userBalance[BASE_CURRENCY].available += amount;

        }
    }

    setBaseBalances() {

        this.balances.set("1", {
            [BASE_CURRENCY] : {
                available : 10000000,
                locked : 0,
            },
            "TATA" : {
                available : 10000000,
                locked : 0,
            }
        });

        this.balances.set("2", {
            [BASE_CURRENCY] : {
                available : 10000000,
                locked : 0,
            },
            "TATA" : {
                available : 10000000,
                locked : 0,
            }
        })

        this.balances.set("5", {
            [BASE_CURRENCY] : {
                available : 10000000,
                locked : 0,
            },
            "TATA" : {
                available : 10000000,
                locked : 0,
            }
        });
    }

}