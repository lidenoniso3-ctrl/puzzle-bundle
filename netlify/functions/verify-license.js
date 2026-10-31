exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { ok: false, error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { ok: false, error: "Invalid JSON" });
  }

  const licenseKey = (body.licenseKey || "").trim();
  
  // جلب كلمة السر من إعدادات Netlify
  const masterPassword = process.env.MASTER_PASSWORD;

  if (!masterPassword) {
    return respond(500, { ok: false, error: "MASTER_PASSWORD not configured on server." });
  }

  // إذا كانت الكلمة مطابقة، افتح الموقع
  if (licenseKey === masterPassword) {
    return respond(200, { ok: true });
  }

  // إذا كانت خاطئة، ارفض
  return respond(200, { ok: false, reason: "invalid_key" });
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}