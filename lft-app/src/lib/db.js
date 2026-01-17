import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Percorso del database
const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "tags.db");

// Assicurati che la directory data esista
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

// Crea o apri il database
const db = new Database(DB_PATH);

// Abilita foreign keys
db.pragma("foreign_keys = ON");

// Inizializza le tabelle
function initDatabase() {
  // Tabella tags
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      label TEXT NOT NULL,
      count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(type, label)
    )
  `);

  // Indice per type
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_tags_type ON tags(type)
  `);

  // Tabella files
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL UNIQUE,
      folder TEXT NOT NULL,
      filename TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Indici per files
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_hash ON files(hash)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_filename ON files(filename)
  `);

  // Tabella files_tags (relazione many-to-many)
  db.exec(`
    CREATE TABLE IF NOT EXISTS files_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fileId INTEGER NOT NULL,
      tagId INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE,
      UNIQUE(fileId, tagId)
    )
  `);

  // Indici per files_tags
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_tags_fileId ON files_tags(fileId)
  `);
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_tags_tagId ON files_tags(tagId)
  `);

  // Aggiungi colonna count se non esiste (per database esistenti)
  try {
    db.exec(`ALTER TABLE tags ADD COLUMN count INTEGER DEFAULT 0`);
  } catch (err) {
    // La colonna esiste già, ignora l'errore
  }
}

// Inizializza il database
initDatabase();

// ==================== FUNZIONI PER TAGS ====================

/**
 * Crea un nuovo tag
 */
export function createTag(type, label) {
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO tags (type, label) VALUES (?, ?)"
  );
  const result = stmt.run(type, label);
  if (result.changes > 0) {
    return result.lastInsertRowid;
  }
  // Se già esiste, recupera l'ID
  const existing = db
    .prepare("SELECT id FROM tags WHERE type = ? AND label = ?")
    .get(type, label);
  return existing?.id;
}

/**
 * Ottieni tutti i tag
 */
export function getAllTags(type = null) {
  let stmt;
  if (type) {
    stmt = db.prepare("SELECT * FROM tags WHERE type = ? ORDER BY label");
    return stmt.all(type);
  } else {
    stmt = db.prepare("SELECT * FROM tags ORDER BY type, label");
    return stmt.all();
  }
}

/**
 * Ottieni un tag per ID
 */
export function getTagById(id) {
  const stmt = db.prepare("SELECT * FROM tags WHERE id = ?");
  return stmt.get(id);
}

/**
 * Elimina un tag
 */
export function deleteTag(id) {
  const stmt = db.prepare("DELETE FROM tags WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

/**
 * Aggiorna l'etichetta di un tag
 */
export function updateTag(id, newLabel) {
  const stmt = db.prepare("UPDATE tags SET label = ? WHERE id = ?");
  const result = stmt.run(newLabel, id);
  return result.changes > 0;
}

// ==================== FUNZIONI PER FILES ====================

/**
 * Calcola hash SHA256 per il contenuto di un file
 */
function calculateHashFromContent(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
  } catch (error) {
    // Se non riesce a leggere il file, usa il path come fallback
    return crypto.createHash("sha256").update(filePath).digest("hex");
  }
}

/**
 * Crea o ottieni un file
 */
export function createOrGetFile(filePath) {
  const hash = calculateHashFromContent(filePath);
  const folder = path.dirname(filePath);
  const filename = path.basename(filePath);

  // Prova a inserire
  const insertStmt = db.prepare(
    "INSERT OR IGNORE INTO files (hash, folder, filename) VALUES (?, ?, ?)"
  );
  const result = insertStmt.run(hash, folder, filename);

  if (result.changes > 0) {
    return result.lastInsertRowid;
  }

  // Se già esiste, recupera l'ID
  const existing = db.prepare("SELECT id FROM files WHERE hash = ?").get(hash);
  return existing?.id;
}

/**
 * Ottieni un file per ID
 */
export function getFileById(id) {
  const stmt = db.prepare("SELECT * FROM files WHERE id = ?");
  return stmt.get(id);
}

/**
 * Ottieni un file per path
 */
export function getFileByPath(filePath) {
  const hash = calculateHashFromContent(filePath);
  const stmt = db.prepare("SELECT * FROM files WHERE hash = ?");
  return stmt.get(hash);
}

/**
 * Ottieni tutti i file
 */
export function getAllFiles() {
  const stmt = db.prepare("SELECT * FROM files ORDER BY folder, filename");
  return stmt.all();
}

/**
 * Elimina un file
 */
export function deleteFile(id) {
  const stmt = db.prepare("DELETE FROM files WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

// ==================== FUNZIONI PER FILES_TAGS ====================

/**
 * Aggiungi un tag a un file
 */
export function addTagToFile(filePath, tagId) {
  const fileId = createOrGetFile(filePath);
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO files_tags (fileId, tagId) VALUES (?, ?)"
  );
  const result = stmt.run(fileId, tagId);

  // Se il tag è stato effettivamente aggiunto, aggiorna il count
  if (result.changes > 0) {
    const countStmt = db.prepare(`
      UPDATE tags 
      SET count = (SELECT COUNT(*) FROM files_tags WHERE tagId = ?) 
      WHERE id = ?
    `);
    countStmt.run(tagId, tagId);
  }

  return result.changes > 0;
}

/**
 * Rimuovi un tag da un file
 */
export function removeTagFromFile(filePath, tagId) {
  const file = getFileByPath(filePath);
  if (!file) return false;

  const stmt = db.prepare(
    "DELETE FROM files_tags WHERE fileId = ? AND tagId = ?"
  );
  const result = stmt.run(file.id, tagId);

  // Se il tag è stato effettivamente rimosso, aggiorna il count
  if (result.changes > 0) {
    const countStmt = db.prepare(`
      UPDATE tags 
      SET count = (SELECT COUNT(*) FROM files_tags WHERE tagId = ?) 
      WHERE id = ?
    `);
    countStmt.run(tagId, tagId);
  }

  return result.changes > 0;
}

/**
 * Ottieni tutti i tag per un file
 */
export function getTagsForFile(filePath) {
  const file = getFileByPath(filePath);
  if (!file) return [];

  const stmt = db.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN files_tags ft ON ft.tagId = t.id
    WHERE ft.fileId = ?
    ORDER BY t.label
  `);
  return stmt.all(file.id);
}

/**
 * Ottieni tutti i file per un tag
 */
export function getFilesForTag(tagId) {
  const stmt = db.prepare(`
    SELECT f.* FROM files f
    INNER JOIN files_tags ft ON ft.fileId = f.id
    WHERE ft.tagId = ?
    ORDER BY f.folder, f.filename
  `);
  return stmt.all(tagId);
}

/**
 * Ottieni tutti i file che hanno TUTTI i tag specificati
 */
export function getFilesForAllTags(tagIds) {
  if (!Array.isArray(tagIds) || tagIds.length === 0) {
    return [];
  }

  // Se c'è solo un tag, usa la funzione esistente
  if (tagIds.length === 1) {
    return getFilesForTag(tagIds[0]);
  }

  // Crea placeholders per i tag (?, ?, ?)
  const placeholders = tagIds.map(() => "?").join(",");

  // Query che trova i file che hanno TUTTI i tag specificati
  const stmt = db.prepare(`
    SELECT f.* FROM files f
    WHERE (
      SELECT COUNT(DISTINCT ft.tagId)
      FROM files_tags ft
      WHERE ft.fileId = f.id
        AND ft.tagId IN (${placeholders})
    ) = ?
    ORDER BY f.folder, f.filename
  `);

  // Passa i tagIds e poi il count atteso
  return stmt.all(...tagIds, tagIds.length);
}

/**
 * Ottieni tutti i file con i loro tag
 */
export function getAllFilesWithTags() {
  const stmt = db.prepare(`
    SELECT 
      f.*,
      GROUP_CONCAT(t.id || ':' || t.label, '||') as tags_data
    FROM files f
    LEFT JOIN files_tags ft ON ft.fileId = f.id
    LEFT JOIN tags t ON t.id = ft.tagId
    GROUP BY f.id
    ORDER BY f.folder, f.filename
  `);

  return stmt.all().map((row) => ({
    ...row,
    tags: row.tags_data
      ? row.tags_data.split("||").map((t) => {
          const [id, label] = t.split(":");
          return { id: parseInt(id), label };
        })
      : [],
  }));
}

/**
 * Rimuovi tutti i tag da un file
 */
export function removeAllTagsFromFile(filePath) {
  const file = getFileByPath(filePath);
  if (!file) return 0;

  const stmt = db.prepare("DELETE FROM files_tags WHERE fileId = ?");
  const result = stmt.run(file.id);
  return result.changes;
}

export default db;
