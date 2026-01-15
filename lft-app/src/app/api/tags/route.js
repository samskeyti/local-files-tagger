import { NextResponse } from "next/server";
import {
  createTag,
  getAllTags,
  getTagById,
  deleteTag,
  updateTag,
  getTagsForFile,
  addTagToFile,
  removeTagFromFile,
  getFilesForTag,
} from "@/lib/db";

// GET - Ottieni tag
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("filePath");
  const type = searchParams.get("type");
  const tagId = searchParams.get("tagId");

  try {
    if (filePath) {
      // Ottieni tag per un file specifico
      const tags = getTagsForFile(filePath);
      return NextResponse.json({ tags });
    } else if (tagId) {
      // Ottieni file per un tag
      const files = getFilesForTag(parseInt(tagId));
      return NextResponse.json({ files });
    } else {
      // Ottieni tutti i tag (opzionalmente filtrati per type)
      const tags = getAllTags(type);
      return NextResponse.json({ tags });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Crea un nuovo tag o aggiungi un tag a un file
export async function POST(request) {
  try {
    const body = await request.json();

    if (body.type && body.label) {
      // Crea un nuovo tag
      const tagId = createTag(body.type, body.label);
      const tag = getTagById(tagId);
      return NextResponse.json({ success: true, tag });
    } else if (body.filePath && body.tagId) {
      // Aggiungi un tag a un file
      const success = addTagToFile(body.filePath, body.tagId);
      return NextResponse.json({
        success,
        message: success ? "Tag added to file" : "Tag already exists on file",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Aggiorna un tag
export async function PUT(request) {
  try {
    const body = await request.json();

    if (body.tagId && body.label !== undefined) {
      // Se la label è "-", elimina il tag
      if (body.label === "-") {
        const success = deleteTag(body.tagId);
        return NextResponse.json({
          success,
          deleted: true,
          message: success ? "Tag deleted" : "Tag not found",
        });
      } else {
        // Altrimenti aggiorna la label
        const success = updateTag(body.tagId, body.label);
        return NextResponse.json({
          success,
          message: success ? "Tag updated" : "Tag not found",
        });
      }
    } else {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Rimuovi un tag o rimuovi un tag da un file
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tagId");
    const filePath = searchParams.get("filePath");

    if (filePath && tagId) {
      // Rimuovi un tag da un file
      const success = removeTagFromFile(filePath, parseInt(tagId));
      return NextResponse.json({
        success,
        message: success ? "Tag removed from file" : "Tag not found on file",
      });
    } else if (tagId) {
      // Elimina un tag completamente
      const success = deleteTag(parseInt(tagId));
      return NextResponse.json({
        success,
        message: success ? "Tag deleted" : "Tag not found",
      });
    } else {
      return NextResponse.json(
        { error: "Invalid parameters" },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
