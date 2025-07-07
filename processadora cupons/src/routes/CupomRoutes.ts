import { Router } from "express";
import CupomController from "../controllers/CupomController";

const router = Router();

router.post("/create", CupomController.create);

export default router;
