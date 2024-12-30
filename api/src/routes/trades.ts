import { Router } from "express";
import { getTrades }  from "../controllers/trades";

export const tradesRouter = Router();

tradesRouter.get("/", getTrades);

