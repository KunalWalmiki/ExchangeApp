import { Router } from "express";
import { getKline } from "../controllers/Kline";

export const klineRouter = Router();

klineRouter.get("/", getKline);

