const overlay   = document.getElementById("license-overlay");
const dashboard = document.getElementById("dashboard");
const input     = document.getElementById("license-key-input");
const message   = document.getElementById("status-message");
const btn       = document.getElementById("activate-btn");

const STORAGE_KEY = "puzzle_license_key";

function showLock(msg = "") {
  if (overlay) overlay.style.display = "flex";
  if (dashboard) dashboard.style.display = "none";
  if (message) {
    message.className = "";
    message.textContent = msg;
  }
}

function showApp() {
  if (overlay) overlay.style.display = "none";
  if (dashboard) dashboard.style.display = "block";
}

async function activateLicense() {
  const key = input.value.trim();
  
  // 1. التحقق من أن الحقل ليس فارغاً
  if (!key) {
    message.className = "error";
    message.textContent = "Please enter the password first.";
    return;
  }

  btn.disabled = true;
  message.className = "";
  message.textContent = "Verifying...";

  try {
    const response = await fetch("/.netlify/functions/verify-license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey: key }),
    });

    const data = await response.json().catch(() => ({}));
    
    // 2. إذا نجح الدخول
    if (data.ok) {
      localStorage.setItem(STORAGE_KEY, key);
      message.className = "success";
      message.textContent = "Access granted.";
      setTimeout(showApp, 600);
      return;
    }

    // 3. إذا فشل الدخول (هنا نطبع رسالة الخطأ الحقيقية من الخادم)
    message.className = "error";
    message.textContent = data.error || data.reason || "Invalid password.";

  } catch (err) {
    message.className = "error";
    message.textContent = "Verification failed: " + err.message;
  } finally {
    btn.disabled = false;
  }
}

function logoutLicense() {
  localStorage.removeItem(STORAGE_KEY);
  if (input) input.value = "";
  showLock("Logged out successfully.");
}

document.addEventListener("DOMContentLoaded", async () => {
  const savedKey = localStorage.getItem(STORAGE_KEY);
  if (!savedKey) {
    showLock();
    return;
  }

  try {
    const response = await fetch("/.netlify/functions/verify-license", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey: savedKey }),
    });
    const data = await response.json().catch(() => ({}));
    
    if (data.ok) {
      showApp();
    } else {
      localStorage.removeItem(STORAGE_KEY);
      showLock("Session expired. Please enter your password again.");
    }
  } catch {
    showLock("Could not verify. Check your internet connection.");
  }
});