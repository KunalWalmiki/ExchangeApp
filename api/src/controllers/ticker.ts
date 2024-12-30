
export const getTicker = (req : any, res : any) => {

    try {

        res.json({});

    } catch(error) {

        console.log(error);
        return res.status(500).json({
            success : false,
            message : "Internal server error"
        })
        
    }
}
