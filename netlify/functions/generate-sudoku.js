const {
  SeededRandom,
  buildSingleSudokuPuzzle,
  exportPDF,
  VARIANTS,
} = require("./_lib/sudoku");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return respond(405, { error: "Method not allowed" });
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return respond(400, { error: "Invalid JSON" });
  }

  const {
    licenseKey,
    variant,
    difficulty,
    count,
    seed,
    ppp,
    bookSize,
    title,
    author,
  } = body;

  // 🔒 التحقق من كلمة السر الرئيسية
  const masterPassword = process.env.MASTER_PASSWORD;
  if (!masterPassword || licenseKey !== masterPassword) {
    return respond(401, { error: "unauthorized" });
  }

  if (!VARIANTS[variant]) return respond(400, { error: "Invalid variant" });
  if (!["Gentle", "Standard", "Fiendish"].includes(difficulty)) {
    return respond(400, { error: "Invalid difficulty" });
  }

  const n = Math.max(1, Math.min(200, parseInt(count, 10) || 6));
  const pppFinal = [1, 2, 4, 6].includes(parseInt(ppp, 10))
    ? parseInt(ppp, 10)
    : 6;
  const finalSeed = seed || String(Math.floor(100000 + Math.random() * 900000));

  try {
    const rng = new SeededRandom(parseInt(finalSeed, 10));
    const puzzles = [];
    const seen = new Set();

    for (let i = 0; i < n; i++) {
      let puzzle = null;
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = buildSingleSudokuPuzzle(difficulty, variant, rng);
        const h = JSON.stringify(candidate.puzzle);
        if (!seen.has(h)) {
          seen.add(h);
          puzzle = candidate;
          break;
        }
      }
      if (!puzzle) puzzle = buildSingleSudokuPuzzle(difficulty, variant, rng);
      puzzle.index = i + 1;
      puzzles.push(puzzle);
    }

    const pdfBuffer = exportPDF(puzzles, {
      variant,
      difficulty,
      variantLabel: puzzles[0].variantLabel,
      puzzlesPerPage: pppFinal,
      seed: finalSeed,
      title: title || "The Ultimate Sudoku Book",
      subtitle: "Puzzles for All Ages",
      author: author || "Your Name",
      bookSize: bookSize || "8.5 x 11 inches",
      filename: `sudoku-${variant}-${finalSeed}.pdf`,
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="sudoku-${variant}-${finalSeed}.pdf"`,
        "Cache-Control": "no-store",
      },
      body: pdfBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("Generation error:", err);
    return respond(500, { error: "generation_failed", message: err.message });
  }
};

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}