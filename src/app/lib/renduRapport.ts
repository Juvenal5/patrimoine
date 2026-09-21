import type { DonneesRapport } from "./generateurRapport";

// ─── CSV ─────────────────────────────────────────────────────────────────────
export function rendreCsv(data: DonneesRapport): Buffer {
  const headers = data.colonnes.map((c) => c.label);
  const rows = data.lignes.map((l) => data.colonnes.map((c) => `"${String(l[c.cle] ?? "").replace(/"/g, "'")}"`));
  const csv = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  return Buffer.from("\uFEFF" + csv, "utf-8");
}

// ─── Excel (nécessite `npm install exceljs`) ────────────────────────────────
export async function rendreExcel(data: DonneesRapport): Promise<Buffer> {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Patrimoine Pro";
  const sheet = workbook.addWorksheet(data.titre.slice(0, 31));

  sheet.columns = data.colonnes.map((c) => ({ header: c.label, key: c.cle, width: 22 }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0E7490" } };
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  for (const ligne of data.lignes) sheet.addRow(ligne);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

// ─── PDF (nécessite `npm install pdfkit` + `npm install -D @types/pdfkit`) ──
export async function rendrePdf(data: DonneesRapport): Promise<Buffer> {
  const PDFDocument = (await import("pdfkit")).default;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4", layout: "landscape" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(16).fillColor("#0e7490").text(data.titre, { align: "left" });
    doc.fontSize(9).fillColor("#666").text(`Généré le ${new Date().toLocaleString("fr-FR")}`);
    doc.moveDown(1);

    const largeurPage = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const largeurColonne = largeurPage / data.colonnes.length;
    let y = doc.y;

    const dessinerLigne = (valeurs: string[], estEntete: boolean) => {
      let x = doc.page.margins.left;
      doc.fontSize(8).fillColor(estEntete ? "#ffffff" : "#1e293b");
      if (estEntete) {
        doc.rect(x, y - 2, largeurPage, 18).fill("#0e7490");
        doc.fillColor("#ffffff");
      }
      for (let i = 0; i < valeurs.length; i++) {
        doc.text(valeurs[i], x + 4, y + 3, { width: largeurColonne - 6, ellipsis: true });
        x += largeurColonne;
      }
      y += 20;
      if (y > doc.page.height - doc.page.margins.bottom - 20) {
        doc.addPage({ margin: 40, size: "A4", layout: "landscape" });
        y = doc.page.margins.top;
      }
    };

    dessinerLigne(data.colonnes.map((c) => c.label), true);
    for (const ligne of data.lignes) {
      dessinerLigne(data.colonnes.map((c) => String(ligne[c.cle] ?? "—")), false);
    }

    if (data.lignes.length === 0) {
      doc.fontSize(10).fillColor("#94a3b8").text("Aucune donnée pour les filtres sélectionnés.", doc.page.margins.left, y + 10);
    }

    doc.end();
  });
}

export const MIME_TYPES: Record<string, string> = {
  csv: "text/csv; charset=utf-8",
  excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
};

export const EXTENSIONS: Record<string, string> = { csv: "csv", excel: "xlsx", pdf: "pdf" };