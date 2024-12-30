import { Router } from "express";
import { cancelOrder, createOrder, getOpenOrders } from "../controllers/orders";


export const orderRouter = Router();

orderRouter.post("/", createOrder);
orderRouter.delete("/", cancelOrder);
orderRouter.get("/open", getOpenOrders);

 