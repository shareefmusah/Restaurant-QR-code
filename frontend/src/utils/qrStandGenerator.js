/* =========================================================
   Swiss Gardens — Table Stand & QR Card Generator
   Generates high-resolution, print-ready table tent stands
   ========================================================= */

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Creates a high-res 1000x1400 canvas of the complete printable table stand.
 */
export function generateStandCardCanvas(table, url, qrCanvas) {
  const canvas = document.createElement('canvas');
  const width = 1000;
  const height = 1420;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Crisp white paper background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);

  // Outer framing borders (Double hairline border for fine dining aesthetics)
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  ctx.strokeStyle = '#DDDDDD';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(46, 46, width - 92, height - 92);

  const centerX = width / 2;

  // Top Restaurant Crest Seal
  const crestY = 135;
  const crestRadius = 42;
  ctx.fillStyle = '#111111';
  ctx.beginPath();
  ctx.arc(centerX, crestY, crestRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 28px Inter, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SG', centerX, crestY);

  // Restaurant Name
  ctx.fillStyle = '#111111';
  ctx.font = '700 32px Inter, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SWISS GARDENS', centerX, 225);

  // Subtitle
  ctx.fillStyle = '#666666';
  ctx.font = '600 13px Inter, -apple-system, sans-serif';
  ctx.fillText('FINE DINING & TABLE SERVICE', centerX, 255);

  // Decorative hairline divider
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(centerX - 90, 280);
  ctx.lineTo(centerX + 90, 280);
  ctx.stroke();

  // Table Indicator Badge
  const tableY = 330;
  const pillWidth = 240;
  const pillHeight = 44;
  ctx.fillStyle = '#111111';
  roundRect(ctx, centerX - pillWidth / 2, tableY - pillHeight / 2, pillWidth, pillHeight, 22);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 18px Inter, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(table.name.toUpperCase(), centerX, tableY);

  // QR Code Container Box
  const qrBoxSize = 500;
  const qrBoxY = 385;
  ctx.fillStyle = '#FAFAFA';
  roundRect(ctx, centerX - qrBoxSize / 2, qrBoxY, qrBoxSize, qrBoxSize, 18);
  ctx.fill();
  ctx.strokeStyle = '#E2E2E2';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Draw High-Res QR code
  if (qrCanvas) {
    const qrSize = 440;
    const qrOffset = (qrBoxSize - qrSize) / 2;
    ctx.drawImage(qrCanvas, centerX - qrSize / 2, qrBoxY + qrOffset, qrSize, qrSize);
  }

  // Action Heading
  const textStartY = 935;
  ctx.fillStyle = '#111111';
  ctx.font = '700 28px Inter, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('SCAN TO BROWSE & ORDER', centerX, textStartY);

  // Clear step-by-step instructions
  ctx.fillStyle = '#444444';
  ctx.font = '500 17px Inter, -apple-system, sans-serif';
  ctx.fillText('1. Open your smartphone camera', centerX, textStartY + 45);
  ctx.fillText('2. Point at this QR code to detect the link', centerX, textStartY + 76);
  ctx.fillText('3. Tap the link to view the menu & order fresh', centerX, textStartY + 107);

  // Feature pill
  const featurePillY = textStartY + 160;
  ctx.fillStyle = '#F4F4F5';
  roundRect(ctx, centerX - 180, featurePillY - 16, 360, 32, 16);
  ctx.fill();
  ctx.fillStyle = '#555555';
  ctx.font = '600 12px Inter, -apple-system, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('NO APP REQUIRED  ·  INSTANT KITCHEN DISPATCH', centerX, featurePillY);

  // Bottom hairline divider
  ctx.strokeStyle = '#E8E8E8';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(90, height - 120);
  ctx.lineTo(width - 90, height - 120);
  ctx.stroke();

  // URL & Closing Hospitality Note
  ctx.fillStyle = '#888888';
  ctx.font = '13px JetBrains Mono, monospace';
  const cleanUrl = url.replace(/^https?:\/\//, '');
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(cleanUrl, centerX, height - 85);

  ctx.fillStyle = '#555555';
  ctx.font = '500 14px Inter, -apple-system, sans-serif';
  ctx.fillText('Swiss Gardens — Enjoy your dining experience', centerX, height - 55);

  return canvas;
}

/**
 * Download the complete stand card PNG (1000x1420 px).
 */
export function downloadStandCard(table, url, qrCanvas) {
  const standCanvas = generateStandCardCanvas(table, url, qrCanvas);
  const link = document.createElement('a');
  link.download = `swiss-gardens-${table.name.replace(/\s+/g, '-').toLowerCase()}-stand-card.png`;
  link.href = standCanvas.toDataURL('image/png');
  link.click();
}

/**
 * Download clean high-res QR code PNG (600x600 px).
 */
export function downloadCleanQr(table, qrCanvas) {
  if (!qrCanvas) return;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = 600;
  exportCanvas.height = 600;
  const ctx = exportCanvas.getContext('2d');

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 600, 600);
  ctx.drawImage(qrCanvas, 40, 40, 520, 520);

  const link = document.createElement('a');
  link.download = `swiss-gardens-${table.name.replace(/\s+/g, '-').toLowerCase()}-qr.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}

/**
 * Opens a print-friendly window with the stand card image.
 */
export function printStandCard(table, url, qrCanvas) {
  const standCanvas = generateStandCardCanvas(table, url, qrCanvas);
  const dataUrl = standCanvas.toDataURL('image/png');

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the table stand card.');
    return;
  }

  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Print Table Stand — ${table.name}</title>
        <style>
          @page {
            size: A5 portrait;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fff;
            min-height: 100vh;
            font-family: system-ui, sans-serif;
          }
          img {
            max-width: 96%;
            max-height: 96vh;
            height: auto;
            display: block;
            margin: auto;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          }
          @media print {
            body { min-height: auto; }
            img { max-width: 100%; max-height: 100vh; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <img src="${dataUrl}" alt="${table.name} Table Stand" />
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
