
import fs from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';

// Mock data
const mockData = {
    "{{DATE}}": "30/01/2026",
    "{{RECEIPT_NUMBER}}": "BC-2026-01-123456",
    "{{FULL_NAME}}": "John Doe",
    "{{CIN_NUMBER}}": "AB123456",
    "{{AMOUNT}}": "1234.56",
    "{{AMOUNT_WORDS}}": "mille deux cent trente-quatre dirhams et cinquante-six centimes",
    "{{OBJECT}}": "Remboursement Équipement - Clavier Mécanique",
    "{{DESCRIPTION}}": "Remboursement pour l'achat d'un clavier mécanique pour le projet."
};

async function generateTestPdf() {
    try {
        console.log('Reading template...');
        const templatePath = path.join(process.cwd(), 'src', 'templates', 'bon-de-caisse.html');
        let htmlContent = await fs.readFile(templatePath, 'utf-8');

        console.log('Injecting mock data...');
        for (const [placeholder, value] of Object.entries(mockData)) {
            htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
        }

        console.log('Launching browser...');
        const browser = await puppeteer.launch({
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
            headless: true
        });

        const page = await browser.newPage();

        console.log('Setting content...');
        await page.setContent(htmlContent, {
            waitUntil: 'networkidle0'
        });

        console.log('Generating PDF...');
        await page.pdf({
            path: '/tmp/test-bon-de-caisse.pdf',
            format: 'A5',
            landscape: true,
            printBackground: true,
            margin: {
                top: '0mm', // Zero margin because the HTML has fixed size/positioning
                right: '0mm',
                bottom: '0mm',
                left: '0mm'
            }
        });

        await browser.close();
        console.log('PDF generated successfully: test-bon-de-caisse.pdf');

    } catch (error) {
        console.error('Error generating PDF:', error);
        process.exit(1);
    }
}

generateTestPdf();
