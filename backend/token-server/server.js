import express from "express";
import cors from "cors";
import { AccessToken } from "livekit-server-sdk";

const app = express();
app.use(cors());
app.use(express.json());

const LIVEKIT_API_KEY = "APIwQsAcxj9CpkK"
const LIVEKIT_API_SECRET = "v1GIdAjh43jjd0PrwnwLddi0Dfu74k6nApnWoTh4SYM"
const LIVEKIT_URL = "wss://aura-7kmm4u7h.livekit.cloud"

app.get("/token", async (req, res) => {
  try {
    const identity = req.query.identity || "iphone";
    const room = req.query.room || "demo";

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity,
    });

    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
    });

    const jwt = await token.toJwt();
    res.json({
      token: jwt,
      url: LIVEKIT_URL
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Token server running at http://localhost:3000");
});
