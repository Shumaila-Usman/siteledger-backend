/**
 * Send an Expo push notification.
 * Silently fails — never crashes the request if push fails.
 */
const sendPushNotification = async (expoPushToken, title, body, data = {}) => {
  if (!expoPushToken?.startsWith('ExponentPushToken')) return;

  try {
    const payload = {
      to: expoPushToken,
      sound: 'default',
      title,
      body,
      data,
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Silent — push failure should never break the API
  }
};

module.exports = { sendPushNotification };
