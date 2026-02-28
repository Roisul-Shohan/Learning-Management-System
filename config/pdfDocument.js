const PDFDocument = require("pdfkit");

function generateCertificatePDF({ userName, courseTitle, instructorName, directorName, certificateId, date, completionPercent, averageQuizScore }) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: "A4", margin: 50 });

            let buffers = [];
            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => {
                const pdfBuffer = Buffer.concat(buffers);
                const base64 = pdfBuffer.toString("base64");
                resolve(base64);
            });

            // ******** HEADER BORDER ********
            doc.rect(10, 10, doc.page.width - 20, doc.page.height - 20)
               .lineWidth(6).strokeColor("#4A90E2").stroke();

            // ******** LOGO ********
            const logoPath = 'public/images/logo.png';
            doc.image(logoPath, (doc.page.width - 100) / 2, 40, { width: 100 });

            // ******** TITLE ********
            doc.moveDown(3);
            doc.fontSize(30).fillColor("#2C3E50").font("Helvetica-Bold")
               .text("Certificate of Completion", { align: "center" });

            doc.moveDown(1);
            doc.fontSize(14).fillColor("#555").font("Helvetica")
               .text("This certifies that", { align: "center" });

            doc.moveDown(0.5);
            doc.fontSize(28).fillColor("#5B42F3").font("Helvetica-Bold")
               .text(userName, { align: "center" });

            doc.moveDown(0.5);
            doc.fontSize(14).fillColor("#555").font("Helvetica")
               .text("has successfully completed the course", { align: "center" });

            doc.moveDown(1);

            // ******** COURSE TITLE BOX ********
            const boxWidth = 475;
            const boxHeight = 40;
            const boxX = (doc.page.width - boxWidth) / 2;
            const boxY = doc.y;

            doc.rect(boxX, boxY, boxWidth, boxHeight).fill("#E9F1FF");
            doc.fillColor("#222").font("Helvetica-Bold").fontSize(18)
               .text(courseTitle, boxX, boxY + 10, { width: boxWidth, align: "center" });

            doc.y = boxY + boxHeight + 20; // controlled spacing

            // ******** COMPLETION AND QUIZ BOXES ********
            const boxHeightSmall = 50;
            const gap = 20;
            const smallBoxWidth = 180;
            const startX = (doc.page.width - (smallBoxWidth * 2 + gap)) / 2;
            const startY = doc.y;

            // Completion box
            doc.rect(startX, startY, smallBoxWidth, boxHeightSmall).fill("#D4EDDA");
            doc.fillColor("#2C3E50").font("Helvetica-Bold").fontSize(12)
               .text(`Completion: ${completionPercent}%`, startX, startY + 15, { width: smallBoxWidth, align: "center" });

            // Quiz box
            const quizX = startX + smallBoxWidth + gap;
            doc.rect(quizX, startY, smallBoxWidth, boxHeightSmall).fill("#FFE0B2");
            doc.fillColor("#2C3E50").font("Helvetica-Bold").fontSize(12)
               .text(`Avg Quiz Score: ${averageQuizScore}%`, quizX, startY + 15, { width: smallBoxWidth, align: "center" });

            doc.y = startY + boxHeightSmall + 40;

            // ******** DATE AND INSTRUCTOR ********
            const infoY = doc.y;
            doc.fontSize(12).fillColor("#2C3E50").font("Helvetica-Bold");
            doc.text(`Date: ${date}`, 70, infoY);
            doc.text(`Instructor: ${instructorName}`, doc.page.width - 220, infoY);

            doc.y = infoY + 60;

            // ******** CERTIFICATE ID ********
            const certIdX = doc.page.margins.left;
            const certIdY = doc.y;

            doc.fontSize(11).fillColor("#000").font("Helvetica")
               .text("Certificate ID: ", certIdX, certIdY, { continued: true });

            doc.fillColor("#0000FF").font("Helvetica-Bold")
               .text(certificateId, { continued: false });

            doc.y = certIdY + 60;

            // ******** SIGNATURES ********
            const sigY = doc.y;
            const sigWidth = 140;
            const sigGap = 50;

            // Lines
            doc.moveTo(100, sigY).lineTo(100 + sigWidth, sigY).stroke("#555");
            doc.moveTo(doc.page.width - 100 - sigWidth, sigY).lineTo(doc.page.width - 100, sigY).stroke("#555");

            // Titles
            doc.fontSize(12).fillColor("#000")
               .text("Course Instructor", 100, sigY + 5, { width: sigWidth, align: "center" });
            doc.text("Academic Director", doc.page.width - 100 - sigWidth, sigY + 5, { width: sigWidth, align: "center" });

            // ******** FOOTER ********
            const footerHeight = 50;
            const footerY = doc.page.height - footerHeight - doc.page.margins.bottom;

            doc.rect(10, footerY, doc.page.width - 20, footerHeight).fill("#1F2937");
            doc.fillColor("#FFF").fontSize(11)
               .text("This certificate is awarded in recognition of outstanding achievement and dedication to learning.", 10, footerY + 15, { width: doc.page.width - 20, align: "center" });

            doc.end();

        } catch (err) {
            reject(err);
        }
    });
}

module.exports = generateCertificatePDF;