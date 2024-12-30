import {CREATE_ORDER, CANCEL_ORDER, GET_OPEN_ORDERS, GET_DEPTH, ON_RAMP} from ".";

export type messageToEngine = {

    type : typeof CREATE_ORDER,
    data : {
        market : string,
        price : string,
        quantity : number,
        side : "buy" | "sell",
        userId : string,
    }
} | {
    
    type : typeof CANCEL_ORDER,
    data : {
        orderId : string,
        market : string,
    }

} | {

    type : typeof ON_RAMP,
    data : {
        amount : string,
        userId : string,
        txnId : string,
    }

} | {

    type : typeof GET_DEPTH,
    data : {
        market : string,

    }

} | {

    type : typeof GET_OPEN_ORDERS,
    data : {
        userId : string,
        market : string,
    }
}