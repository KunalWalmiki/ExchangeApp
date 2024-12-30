import { Request, Response } from "express";

export async function getTrades (req : any, res : any) {

    try {

        const {market} = req.query;

        if(!market) {

            return res.status(401).json({
                success : false,
                message : "Market is Required",
            })

        }
        // get from db
           return res.json({});

    } catch(error) {

        console.log(error);
        return res.status(500).json({
            success : false,
            message : "Internal server error"
        })
    }
}