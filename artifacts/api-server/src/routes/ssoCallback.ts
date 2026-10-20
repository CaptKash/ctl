import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/sso-callback", (req, res) => {
  const params = new URLSearchParams(req.query as Record<string, string>);
  res.redirect(`car-logbook://sso-callback?${params.toString()}`);
});

export default router;
