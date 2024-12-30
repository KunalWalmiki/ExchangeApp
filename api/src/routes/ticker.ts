import { Router } from "express";
import { getTicker } from "../controllers/ticker";

export const tickerRouter = Router();

tickerRouter.get("/", getTicker);
