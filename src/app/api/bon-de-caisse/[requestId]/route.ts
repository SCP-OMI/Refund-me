import { generateBonDeCaisse } from "@/actions/bon-de-caisse";
import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> } // Updated for Next.js 15+
) {
  try {
    const { requestId } = await params;

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      );
    }

    // Generate the HTML content with filled data
    const htmlContent = await generateBonDeCaisse(requestId);

    // Launch puppeteer and generate PDF
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
      ]
    });

    const page = await browser.newPage();
    
    // Set the HTML content
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0'
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A5',
      landscape: true,
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm'
      }
    });

    await browser.close();

    // Convert to Buffer for NextResponse
    const buffer = Buffer.from(pdfBuffer);

    // Return the PDF
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="bon-de-caisse-${requestId}.pdf"`,
      },
    });

  } catch (error) {
    console.error("Error generating bon de caisse PDF:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate bon de caisse", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  args: { params: Promise<{ requestId: string }> }
) {
  // Alternative POST endpoint if needed for more complex parameters
  return GET(request, args);
}
