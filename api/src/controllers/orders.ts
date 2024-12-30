import { RedisManager } from "../RedisManager";
import { CREATE_ORDER, CANCEL_ORDER, GET_OPEN_ORDERS} from "../types";


export async function createOrder (req : any, res : any) {

    try {

          const {market, price, quantity, side, userId} = req.body;

          console.log(market, price, quantity, side, userId);
          
          if(!market || !price || !quantity || !side || !userId) {

            return res.status(401).json({
                success : false,
                message : "All Fields Are Required",
            })
          }

          const response = await RedisManager.getInstance().sendAndAwait({

            type  : CREATE_ORDER,
            data : {
                market : market,
                price : price,
                quantity : quantity,
                side : side,
                userId : userId,
            }

          });

          return res.status(200).json({
            success : true,
            message : "Order Created Successfuly",
            payload : response.payload,
          });


    } catch(error) {

        console.log(error);
        return res.status(500).json({
            success : false,
            message : "Internal server error"
        })
    }
}

export async function cancelOrder (req : any, res : any) {

    try {

          const {market, orderId} = req.body;

          if(!market || !orderId) {

            return res.status(401).json({
                success : false,
                message : "OrderId or Market is missing!",
            })
          }

          const response = await RedisManager.getInstance().sendAndAwait({
            type  : CANCEL_ORDER,
            data : {
                market: market,
                orderId : orderId,
            }

          });

          return res.status(200).json({
            success : true,
            message : "Order Cancelled Successfuly",
            payload : response.payload,
          });
          

    } catch(error) {

        console.log(error);
        return res.status(500).json({
            success : false,
            message : "Internal server error"
        })
    }
}

export async function getOpenOrders (req : any, res : any) {

    try {

          const response = await RedisManager.getInstance().sendAndAwait({
            type  : GET_OPEN_ORDERS,
            data : {
                userId : req.query.userId as string,
                market : req.query.market as string,
            }
          });

          return res.status(200).json({
            success : true,
            message : "Orders Fetched Successfuly",
            payload : response.payload,
          });
          

    } catch(error) {

        console.log(error);
        return res.status(500).json({
            success : false,
            message : "Internal server error"
        })
    }
}

