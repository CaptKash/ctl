import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import privacyRouter from "./routes/privacy";

const app: Express = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/", privacyRouter);
app.use("/api", router);

export default app;
