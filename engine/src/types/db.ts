import {TRADE_ADDED, ORDER_UPDATE} from "../types/index";

export type dbMessage = {

    type : typeof TRADE_ADDED,
    data : {
        id : string,
        isBuyerMaker : boolean,
        price : string,
        quantity : string,
        quoteQuantity : string, 
        timestamp : number,
        market : string,
    }

} | {

    type : typeof ORDER_UPDATE,
    data : {
        orderId : string,
        executedQty : number,
        market? : string,
        price? : string,
        quantity? : string,
        side? : "buy" | "sell",
    }
}