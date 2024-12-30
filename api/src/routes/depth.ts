import { Router } from "express";
import { getDepth } from "../controllers/depth";

export const depthRouter = Router();

depthRouter.get("/", getDepth);

