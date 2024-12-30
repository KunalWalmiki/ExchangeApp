import { RedisManager } from "../RedisManager";
import { GET_DEPTH } from "../types";

export async function getDepth (req : any, res : any) {

    try {

        const {symbol} = req.query;

        if(!symbol) {

            return res.status(401).json({
                success : false,
                message : "Symbol is Required",
            })

        }
       
        const response = await RedisManager.getInstance().sendAndAwait({
            type : GET_DEPTH,
            data : {
                market : symbol as string,
            }
        })

        return res.status(200).json({
            success : true,
            message : "Depth Fetched Successfuly",
            payload : response.payload,
        })

    } catch(error) {

        console.log(error);
        return res.status(500).json({
            success : false,
            message : "Internal server error"
        })
    }
}