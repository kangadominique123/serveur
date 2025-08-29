import express from "express";
import bodyParser from "body-parser";
import {
  createClientContext,
  createOrUpdateInstallation,
  sendNotification,
} from "@azure/notification-hubs/api";
import {
  createAppleInstallation,
  createFcmV1Installation,
  createAppleNotification,
  createFcmV1Notification,
} from "@azure/notification-hubs/models";
import { randomUUID } from "@azure/core-util";

const app = express();
app.use(bodyParser.json());

const connectionString =
  process.env.NOTIFICATIONHUBS_CONNECTION_STRING ||
  "Endpoint=sb://sbx-montreal-pushnotification.servicebus.windows.net/;SharedAccessKeyName=infoneige_pushnotification;SharedAccessKey=gfZoFM1iGe6GHwQ4NKykgGe4CxZ7ChvLruHqUDYIpag=";

const hubName = process.env.NOTIFICATION_HUB_NAME || "info-neige";

const context = createClientContext(connectionString, hubName);

// -------- REGISTER DEVICE ----------
app.post("/register", async (req, res) => {
  try {
    const { token, platform } = req.body;

    if (!token || !platform) {
      return res.status(400).json({ error: "token and platform are required" });
    }

    let installation;
    if (platform === "apns") {
      installation = createAppleInstallation({
        installationId: randomUUID(),
        pushChannel: token,
        tags: ["user:demo"],
      });
    } else if (platform === "fcm") {
      installation = createFcmV1Installation({
        installationId: randomUUID(),
        pushChannel: token,
        tags: ["user:demo"],
      });
    } else {
      return res.status(400).json({ error: "Unsupported platform" });
    }

    const result = await createOrUpdateInstallation(context, installation);

    res.json({ success: true, trackingId: result.trackingId });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------- SEND NOTIFICATION ----------
app.post("/send", async (req, res) => {
  try {
    const { title, message, platform } = req.body;

    if (!title || !message || !platform) {
      return res.status(400).json({ error: "title, message and platform are required" });
    }

    let notification;

    if (platform === "apns") {
      notification = createAppleNotification({
        body: JSON.stringify({
          aps: {
            alert: { title, body: message },
            sound: "default",
          },
        }),
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
        },
      });
    } else if (platform === "fcm") {
      notification = createFcmV1Notification({
        body: JSON.stringify({
          notification: { title, body: message },
        }),
      });
    } else {
      return res.status(400).json({ error: "Unsupported platform" });
    }

    const result = await sendNotification(context, notification, {
      tags: ["user:demo"], // envoie uniquement aux installations avec ce tag
    });

    res.json({
      success: true,
      trackingId: result.trackingId,
      location: result.location,
    });
  } catch (err) {
    console.error("Erreur envoi push:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () =>
  console.log("Backend démarré sur http://localhost:3000")
);
