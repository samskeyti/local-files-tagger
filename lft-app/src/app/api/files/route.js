import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const folderPath = searchParams.get("path");

  if (!folderPath) {
    return NextResponse.json(
      { error: "Path parameter is required" },
      { status: 400 }
    );
  }

  try {
    // Verifica che il percorso esista
    if (!fs.existsSync(folderPath)) {
      return NextResponse.json(
        { error: "Path does not exist" },
        { status: 404 }
      );
    }

    // Verifica che sia una directory
    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { error: "Path is not a directory" },
        { status: 400 }
      );
    }

    // Leggi il contenuto della directory
    const items = fs.readdirSync(folderPath);

    // Ottieni informazioni su ogni item
    const itemsWithInfo = items.map((item) => {
      const itemPath = path.join(folderPath, item);
      try {
        const itemStats = fs.statSync(itemPath);
        return {
          name: item,
          isDirectory: itemStats.isDirectory(),
          path: itemPath,
          size: itemStats.size,
          modified: itemStats.mtime,
        };
      } catch (error) {
        return {
          name: item,
          isDirectory: false,
          path: itemPath,
          error: "Cannot access",
        };
      }
    });

    // Ordina: prima le cartelle, poi i file
    itemsWithInfo.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ items: itemsWithInfo });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
