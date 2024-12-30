import { BASE_CURRENCY } from "../types/currency";
import { Fill, order } from "../types/order";


export class OrderBook {

    bids : order[];
    asks : order[];
    baseAsset : string;
    quoteAsset : string = BASE_CURRENCY;
    lastTradeId : number;
    currentPrice : number;

    constructor(baseAsset : string,asks : order[], bids : order[], lastTradeId : number, currencyPrice : number) {

        this.bids = bids;
        this.asks = asks;
        this.baseAsset = baseAsset;
        this.lastTradeId = lastTradeId || 0;
        this.currentPrice = currencyPrice || 0;
    }

    ticker() {
        return `${this.baseAsset}_${this.quoteAsset}`;
    }

    getsnapshot() {

        return {
            baseAsset : this.baseAsset,
            bids : this.bids,
            asks : this.asks,
            lastTradeId : this.lastTradeId,
            currentPrice : this.currentPrice,
        }

    }

    addOrder(order : order) : {
        executedQty : number,
        fills : Fill[]
    } {

        if(order.side === "buy") {

            const {executedQty, fills} = this.matchBid(order);
            order.filled = executedQty;

            if(executedQty === order.quantity) {

                return {
                    executedQty,
                    fills
                }
            }

            this.bids.push(order);
            return {
                executedQty,
                fills,
            }
        }
        else {

            const {executedQty, fills} = this.matchAsk(order);
            order.filled = executedQty;

            if(executedQty === order.quantity) {

                return {
                    executedQty,
                    fills,
                }
            }
            this.asks.push(order);  
            return {
                executedQty,
                fills,
            }      
        }
    }

    matchBid(order : order) : {
        fills : Fill[], 
        executedQty : number,  
    } {

        const fills : Fill[] = [];
        let executedQty = 0;

        for(let i = 0; i < this.asks.length; i++) {

            if(this.asks[i].price <= order.price && executedQty < order.quantity) {

                const filledQty = Math.min((order.quantity - executedQty), this.asks[i].quantity);
                executedQty += filledQty;
                this.asks[i].filled += filledQty;
                fills.push({
                    price : this.asks[i].price.toString(),
                    qty : filledQty,
                    tradeId : this.lastTradeId++,
                    otherUserId : this.asks[i].userId,
                    markerOrderId : this.asks[i].orderId,
                })
            }
        }

        for(let i = 0; i < this.asks.length; i++) {

            if(this.asks[i].filled === this.asks[i].quantity) {
                this.asks.splice(i, 1);
                i--;
            }
        }

        return {
            fills,
            executedQty,
        }
    }

    matchAsk(order : order) : {
        fills : Fill[],
        executedQty : number,
    } {

        const fills : Fill[] = [];
        let executedQty = 0;

        for(let i = 0; i < this.bids.length; i++) {

            if(order.price <= this.bids[i].price && executedQty < order.quantity) {

                const amountRemaining = Math.min((order.quantity - executedQty), this.bids[i].quantity);
                executedQty += amountRemaining;
                this.bids[i].filled += amountRemaining;
                fills.push({
                    price : this.bids[i].price.toString(),
                    qty : amountRemaining,
                    tradeId : this.lastTradeId++,
                    otherUserId : this.bids[i].userId,
                    markerOrderId : this.bids[i].orderId,
                })
            }
        }

        for(let i = 0; i < this.bids.length; i++) {

            if(this.bids[i].filled === this.bids[i].quantity) {
                this.bids.splice(i, 1);
                i--;
            }
        }

        return {
            fills,
            executedQty,
        }
    }

    getDepth() {

        const bids : [string, string][] = [];
        const asks : [string, string][] = [];

        const bidsObj : {[key : string] : number} = {};
        const asksObj : {[key : string] : number} = {};

        for(let i = 0; i < this.bids.length; i++) {

            const order = this.bids[i];

            if(!bidsObj[order.price]) {
                bidsObj[order.price] = 0;
            }

            bidsObj[order.price] += order.quantity;
        }

        for(let i = 0; i < this.asks.length; i++) {

            const order = this.asks[i];

            if(!asksObj[order.price]) {
                asksObj[order.price] = 0;
            }

            asksObj[order.price] += order.quantity;
        }

        for(const price in bidsObj) {

            bids.push([price, bidsObj[price].toString()]);

        }

        for(const price in asksObj) {

            asks.push([price, asksObj[price].toString()]);

        }

        return {
            bids,
            asks,
        }

    }

    getOpenOrders(userId : string) : order[] {

        const asks = this.asks.filter((x) => x.userId === userId);
        const bids = this.bids.filter((x) => x.userId === userId);

        return [...asks, ...bids];
    }

    cancelBid(order : order) {

        const index = this.bids.findIndex((o) => o.orderId === order.orderId);

        if(index !== -1) {

            const price = this.bids[index].price;
            this.bids.splice(index, 1);
            return price;
            
        }
    }

    cancelAsk(order : order) {

        const index = this.asks.findIndex((o) => o.orderId === order.orderId);

        if(index != -1) {

            const price = this.asks[index].price;
            this.asks.splice(index, 1);
            return price;
        }

    }

}