exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return respond(405, { ok: false, error: "Method not allowed" });

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return respond(400, { ok: false, error: "Invalid JSON" }); }

  const licenseKey = (body.licenseKey || "").trim();
  const increment = body.increment === true;

  if (!licenseKey) return respond(400, { ok: false, error: "License key required" });

  const productId = process.env.GUMROAD_PRODUCT_ID;
  const maxUses = parseInt(process.env.MAX_USES_PER_LICENSE || "5", 10);

  if (!productId) return respond(500, { ok: false, error: "GUMROAD_PRODUCT_ID not configured" });

  try {
    // الاتصال الرسمي بـ Gumroad API
    const response = await fetch("https://api.gumroad.com/v2/licenses/verify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        product_id: productId,
        license_key: licenseKey,
        increment_uses_count: increment ? "true" : "false"
      })
    });

    const data = await response.json();
    const purchase = data.purchase || {};

    // شروط الرفض الصارمة
    if (data.success !== true) return respond(200, { ok: false, reason: "invalid_key" });
    if (purchase.refunded) return respond(200, { ok: false, reason: "refunded" });
    if (purchase.chargebacked) return respond(200, { ok: false, reason: "chargebacked" });
    if (purchase.disputed && !purchase.dispute_won) return respond(200, { ok: false, reason: "disputed" });

    const uses = data.uses || 0;
    if (increment && uses > maxUses) {
      return respond(200, { ok: false, reason: "too_many_devices", uses });
    }

    return respond(200, { ok: true, uses });
  } catch (err) {
    return respond(502, { ok: false, error: "Gumroad request failed" });
  }
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(body),
  };
}