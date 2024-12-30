

export interface order {
    
    price : number;
    quantity : number;
    orderId : string;
    filled : number;
    side : "buy" | "sell";
    userId : string;
}

export interface Fill {

    price : string,
    qty : number,
    tradeId : number,
    otherUserId : string,
    markerOrderId : string,

}