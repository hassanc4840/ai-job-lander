// src/lib/exportPdf.ts
// Uses html2canvas + jspdf (already in package.json) to export resume to styled PDF.

export async function exportResumePDF(resumeText: string, fileName: string = 'resume'): Promise<void> {
  // Dynamically import to avoid SSR issues
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  // Build a hidden styled resume div
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: -9999px;
    left: -9999px;
    width: 794px;
    background: #ffffff;
    color: #1a1a1a;
    font-family: 'Georgia', serif;
    font-size: 13px;
    line-height: 1.6;
    padding: 60px;
    box-sizing: border-box;
  `;

  // Convert plain text sections to styled HTML
  const lines = resumeText.split('\n');
  const htmlLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '<div style="height:8px"></div>';

    // Section headers (ALL CAPS lines or lines ending with colon)
    if (/^[A-Z][A-Z\s&]{3,}$/.test(trimmed) || (trimmed === trimmed.toUpperCase() && trimmed.length > 4)) {
      return `<h2 style="font-family:'Arial',sans-serif;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#2c3e50;border-bottom:2px solid #3498db;padding-bottom:4px;margin:20px 0 8px;">${trimmed}</h2>`;
    }
    // Bullet points
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      return `<div style="padding-left:16px;margin:3px 0;">• ${trimmed.replace(/^[•\-\*]\s*/, '')}</div>`;
    }
    // First line — treat as name
    if (line === lines[0] && trimmed.length < 50) {
      return `<h1 style="font-family:'Arial',sans-serif;font-size:24px;font-weight:700;color:#1a1a1a;margin:0 0 4px;">${trimmed}</h1>`;
    }
    return `<p style="margin:3px 0;">${trimmed}</p>`;
  });

  container.innerHTML = htmlLines.join('');
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;

    // Scale to fit page width, paginate if needed
    const ratio = pdfWidth / imgWidth;
    const scaledHeight = imgHeight * ratio;
    const pageHeightPx = pdfHeight / ratio;

    let yOffset = 0;
    while (yOffset < imgHeight) {
      if (yOffset > 0) pdf.addPage();

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = imgWidth;
      sliceCanvas.height = Math.min(pageHeightPx, imgHeight - yOffset);
      const ctx = sliceCanvas.getContext('2d')!;
      ctx.drawImage(canvas, 0, -yOffset);

      const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(sliceData, 'JPEG', 0, 0, pdfWidth, sliceCanvas.height * ratio);
      yOffset += pageHeightPx;
    }

    pdf.save(`${fileName.replace(/\.pdf$/i, '')}_optimized.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}

export async function exportTextPDF(text: string, title: string, fileName: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);

  const margin = 20;
  const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2;
  const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2;
  const lineHeight = 6;

  // Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, margin, margin + 6);

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  let y = margin + 18;
  const lines = pdf.splitTextToSize(text, pageWidth);

  for (const line of lines) {
    if (y + lineHeight > pageHeight + margin) {
      pdf.addPage();
      y = margin + 6;
    }
    pdf.text(line, margin, y);
    y += lineHeight;
  }

  pdf.save(`${fileName}.pdf`);
}
