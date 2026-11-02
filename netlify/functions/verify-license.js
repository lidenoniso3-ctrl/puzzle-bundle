exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let body;
  try { body = JSON.parse(event.body || "{}"); } catch { return { statusCode: 400, body: "Invalid JSON" }; }

  const licenseKey = (body.licenseKey || "").trim();
  const increment = body.increment === true;
  const productId = process.env.GUMROAD_PRODUCT_ID;

  if (!productId) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "GUMROAD_PRODUCT_ID is missing in Netlify settings!" })
    };
  }

  try {
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

    // إذا رفض جومرود المفتاح، سنطبع السبب الحقيقي!
    if (data.success !== true) {
      return {
        statusCode: 200,
        body: JSON.stringify({ 
            ok: false, 
            reason: "gumroad_rejected", 
            gumroad_error: data.message || data.error || "Unknown error from Gumroad" 
        })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, uses: data.uses })
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: "Network error: " + err.message })
    };
  }
};