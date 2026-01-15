import { NextResponse } from "next/server";
import fs from "fs";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json(
      { error: "Path parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Verifica che il file esista
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: "File does not exist" },
        { status: 404 }
      );
    }

    // Leggi il file come testo
    const content = fs.readFileSync(filePath, "utf-8");

    return NextResponse.json({ content });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
