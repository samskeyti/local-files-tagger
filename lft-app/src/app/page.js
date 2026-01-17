"use client";

import { useState, useEffect } from "react";
import {
  TextInput,
  Paper,
  Text,
  Stack,
  ScrollArea,
  Loader,
  Alert,
  Checkbox,
  Tabs,
  MultiSelect,
  Rating,
} from "@mantine/core";
import {
  IconFolder,
  IconFile,
  IconAlertCircle,
  IconPhoto,
  IconFileText,
} from "@tabler/icons-react";
import ReactMarkdown from "react-markdown";

export default function Home() {
  const [activeTab, setActiveTab] = useState("folder");
  const [folderPath, setFolderPath] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState([]);
  const [allTagsForFilter, setAllTagsForFilter] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [textContent, setTextContent] = useState("");
  const [fileTags, setFileTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [editingTagId, setEditingTagId] = useState(null);
  const [editingTagLabel, setEditingTagLabel] = useState("");
  const [fileRating, setFileRating] = useState(0);

  // Carica il percorso iniziale dalla configurazione
  useEffect(() => {
    fetch("/config.json")
      .then((res) => res.json())
      .then((data) => {
        setFolderPath(data.startFolder || "");
        if (data.startFolder) {
          loadFolder(data.startFolder);
        }
      })
      .catch((err) => console.error("Error loading config:", err));

    // Carica tutti i tag per il filtro
    loadAllTagsForFilter();
  }, []);

  const loadAllTagsForFilter = async () => {
    try {
      const response = await fetch("/api/tags");
      const data = await response.json();
      console.log("Tags loaded for filter:", data);
      if (response.ok) {
        setAllTagsForFilter(data.tags || []);
      }
    } catch (err) {
      console.error("Error loading tags for filter:", err);
    }
  };

  const loadFilesByTag = async (tagIds) => {
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    setTextContent("");
    try {
      const response = await fetch(`/api/files?tagIds=${tagIds.join(',')}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nel caricamento dei file");
      }

      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const loadFolder = async (path) => {
    setLoading(true);
    setError(null);
    setFolderPath(path);
    try {
      const response = await fetch(
        `/api/files?path=${encodeURIComponent(path)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nel caricamento dei file");
      }

      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const goToParentFolder = () => {
    const parentPath = folderPath.split("/").slice(0, -1).join("/");
    if (parentPath) {
      loadFolder(parentPath);
    }
  };

  const isImageFile = (filename) => {
    const imageExtensions = [
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".bmp",
      ".webp",
      ".svg",
    ];
    return imageExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  };

  const isTextFile = (filename) => {
    const textExtensions = [
      ".txt",
      ".md",
      ".json",
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".css",
      ".html",
      ".xml",
      ".log",
      ".csv",
    ];
    return textExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
  };

  const loadTextFile = async (path) => {
    try {
      const response = await fetch(
        `/api/text?path=${encodeURIComponent(path)}`
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Errore nel caricamento del file");
      }

      setTextContent(data.content);
    } catch (err) {
      setTextContent(`Errore: ${err.message}`);
    }
  };

  const loadFileTags = async (path) => {
    try {
      const response = await fetch(
        `/api/tags?filePath=${encodeURIComponent(path)}`
      );
      const data = await response.json();

      if (response.ok) {
        const tags = data.tags || [];
        setFileTags(tags);
        
        // Carica il rating se esiste
        const ratingTag = tags.find(tag => tag.type === "rating");
        setFileRating(ratingTag ? parseInt(ratingTag.label) : 0);
      }
    } catch (err) {
      console.error("Error loading tags:", err);
    }
  };

  const handleRatingChange = async (value) => {
    if (!selectedFile) return;

    setFileRating(value);

    try {
      // Rimuovi tutti i rating precedenti se esistono
      const oldRatingTags = fileTags.filter(tag => tag.type === "rating");
      for (const oldRatingTag of oldRatingTags) {
        await fetch("/api/tags", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: selectedFile.path,
            tagId: oldRatingTag.id,
          }),
        });
      }

      if (value > 0) {
        // Crea o ottieni il tag rating
        const createResponse = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "rating",
            label: value.toString(),
          }),
        });

        const createData = await createResponse.json();
        if (createResponse.ok && createData.tag) {
          // Associa il tag al file
          await fetch("/api/tags", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filePath: selectedFile.path,
              tagId: createData.tag.id,
            }),
          });
        }
      }

      // Ricarica i tag
      await loadFileTags(selectedFile.path);
      await loadAllTagsForFilter();
    } catch (err) {
      console.error("Error updating rating:", err);
    }
  };

  const loadAvailableTags = async (type) => {
    try {
      const response = await fetch(`/api/tags?type=${type}`);
      const data = await response.json();

      if (response.ok) {
        // Escludi i tag di tipo "rating" dalla lista
        const tags = (data.tags || []).filter(tag => tag.type !== "rating");
        setAvailableTags(tags);
      }
    } catch (err) {
      console.error("Error loading available tags:", err);
    }
  };

  const createNewTag = async () => {
    if (!newTagLabel.trim() || !selectedFile) return;

    const type = isImageFile(selectedFile.name) ? "image" : "text";

    try {
      const response = await fetch("/api/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, label: newTagLabel.trim() }),
      });

      if (response.ok) {
        setNewTagLabel("");
        loadAvailableTags(type);
      }
    } catch (err) {
      console.error("Error creating tag:", err);
    }
  };

  const toggleTag = async (tagId, isChecked) => {
    if (!selectedFile) return;

    try {
      if (isChecked) {
        // Aggiungi il tag al file
        const response = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filePath: selectedFile.path,
            tagId: tagId,
          }),
        });

        if (response.ok) {
          loadFileTags(selectedFile.path);
        }
      } else {
        // Rimuovi il tag dal file
        const response = await fetch(
          `/api/tags?filePath=${encodeURIComponent(
            selectedFile.path
          )}&tagId=${tagId}`,
          { method: "DELETE" }
        );

        if (response.ok) {
          loadFileTags(selectedFile.path);
        }
      }
    } catch (err) {
      console.error("Error toggling tag:", err);
    }
  };

  const startEditingTag = (tag) => {
    setEditingTagId(tag.id);
    setEditingTagLabel(tag.label);
  };

  const saveTagEdit = async () => {
    if (!editingTagId) return;

    const type = isImageFile(selectedFile.name) ? "image" : "text";

    try {
      const response = await fetch("/api/tags", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tagId: editingTagId,
          label: editingTagLabel.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEditingTagId(null);
        setEditingTagLabel("");

        // Se il tag è stato cancellato, ricarica anche i tag del file
        if (data.deleted) {
          loadFileTags(selectedFile.path);
        }

        loadAvailableTags(type);
      }
    } catch (err) {
      console.error("Error updating tag:", err);
    }
  };

  const cancelEditingTag = () => {
    setEditingTagId(null);
    setEditingTagLabel("");
  };

  const handleFileClick = async (item) => {
    // In modalità tag, non permettere navigazione in directory
    if (item.isDirectory) {
      if (activeTab === "folder") {
        loadFolder(item.path);
      }
    } else if (isImageFile(item.name)) {
      setSelectedFile(item);
      setTextContent("");
      setLoadingTags(true);
      await Promise.all([loadFileTags(item.path), loadAvailableTags("image")]);
      setLoadingTags(false);
    } else if (isTextFile(item.name)) {
      setSelectedFile(item);
      loadTextFile(item.path);
      setLoadingTags(true);
      await Promise.all([loadFileTags(item.path), loadAvailableTags("text")]);
      setLoadingTags(false);
    }
  };

  const getImageFiles = () => {
    return items.filter((item) => !item.isDirectory && isImageFile(item.name));
  };

  const getTextFiles = () => {
    return items.filter((item) => !item.isDirectory && isTextFile(item.name));
  };

  const navigateImage = async (direction) => {
    if (!selectedFile) return;

    const isImage = isImageFile(selectedFile.name);
    const isText = isTextFile(selectedFile.name);

    if (!isImage && !isText) return;

    const files = isImage ? getImageFiles() : getTextFiles();
    const currentIndex = files.findIndex((f) => f.path === selectedFile.path);

    if (currentIndex === -1) return;

    let nextIndex;
    if (direction === "next") {
      nextIndex = (currentIndex + 1) % files.length;
    } else {
      nextIndex = (currentIndex - 1 + files.length) % files.length;
    }

    const nextFile = files[nextIndex];
    setSelectedFile(nextFile);

    if (isText) {
      loadTextFile(nextFile.path);
    }

    // Carica i tag per il nuovo file
    const fileType = isImage ? "image" : "text";
    setLoadingTags(true);
    await Promise.all([
      loadFileTags(nextFile.path),
      loadAvailableTags(fileType),
    ]);
    setLoadingTags(false);
  };

  // Gestione tasti freccia
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowRight") {
        navigateImage("next");
      } else if (e.key === "ArrowLeft") {
        navigateImage("prev");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedFile, items]);

  const handlePathChange = (value) => {
    setFolderPath(value);
  };

  const handlePathSubmit = (e) => {
    if (e.key === "Enter" && folderPath) {
      loadFolder(folderPath);
    }
  };

  return (
    <Stack
      p="md"
      gap="md"
      style={{ height: "100vh", backgroundColor: "white" }}
    >
      {/* Tabs per scegliere modalità di visualizzazione */}
      <div style={{ maxWidth: "calc((100% - 2rem) / 4)" }}>
        <Tabs value={activeTab} onChange={(value) => {
          setActiveTab(value);
          setSelectedFile(null);
          setTextContent("");
          setItems([]);
          // Quando si torna al tab folder, ricarica la cartella corrente
          if (value === "folder" && folderPath) {
            loadFolder(folderPath);
          }
        }}>
          <Tabs.List>
            <Tabs.Tab value="folder">Percorso folder</Tabs.Tab>
            <Tabs.Tab value="tag">Tag</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="folder" pt="sm">
            <TextInput
              placeholder="Inserisci il percorso della cartella"
              value={folderPath}
              onChange={(e) => handlePathChange(e.currentTarget.value)}
              onKeyDown={handlePathSubmit}
              size="md"
            />
          </Tabs.Panel>

          <Tabs.Panel value="tag" pt="sm">
            <MultiSelect
              placeholder="Seleziona uno o più tag per filtrare i file"
              value={selectedTagFilter}
              onChange={(value) => {
                setSelectedTagFilter(value);
                if (value && value.length > 0) {
                  loadFilesByTag(value);
                } else {
                  setItems([]);
                  setSelectedFile(null);
                }
              }}
              data={allTagsForFilter
                .sort((a, b) => {
                  // Ordina alfabeticamente per label
                  return a.label.localeCompare(b.label);
                })
                .map((tag) => {
                  // Per i tag di tipo rating, mostra le stelline invece del valore
                  let displayLabel;
                  if (tag.type === "rating") {
                    const stars = "★".repeat(parseInt(tag.label));
                    displayLabel = `${stars} - ${tag.count} file`;
                  } else {
                    displayLabel = `${tag.label} - ${tag.count} file`;
                  }

                  return {
                    value: tag.id.toString(),
                    label: displayLabel,
                  };
                })}
              searchable
              clearable
              size="md"
              nothingFoundMessage="Nessun tag disponibile - crea dei tag prima di usare questa funzione"
            />
          </Tabs.Panel>
        </Tabs>
      </div>

      {/* Tre colonne */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr 1fr",
          gap: "1rem",
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Colonna sinistra - Elenco file e cartelle */}
        <Paper
          shadow="sm"
          p="md"
          withBorder
          style={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Text size="lg" fw={700} mb="md">
            File e Cartelle
          </Text>

          {/* Riepilogo contenuto cartella */}
          {!loading && !error && (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1rem",
              }}
            >
              <Paper
                p="xs"
                withBorder
                style={{ cursor: "pointer", flex: 1 }}
                onClick={async () => {
                  const imageFiles = getImageFiles();
                  if (imageFiles.length > 0) {
                    setSelectedFile(imageFiles[0]);
                    setTextContent("");
                    setLoadingTags(true);
                    await Promise.all([
                      loadFileTags(imageFiles[0].path),
                      loadAvailableTags("image"),
                    ]);
                    setLoadingTags(false);
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <IconPhoto size={20} color="#E24A90" />
                  <Text size="sm">
                    {getImageFiles().length}{" "}
                    {getImageFiles().length === 1 ? "immagine" : "immagini"}
                  </Text>
                </div>
              </Paper>
              <Paper
                p="xs"
                withBorder
                style={{ cursor: "pointer", flex: 1 }}
                onClick={async () => {
                  const textFiles = getTextFiles();
                  if (textFiles.length > 0) {
                    setSelectedFile(textFiles[0]);
                    loadTextFile(textFiles[0].path);
                    setLoadingTags(true);
                    await Promise.all([
                      loadFileTags(textFiles[0].path),
                      loadAvailableTags("text"),
                    ]);
                    setLoadingTags(false);
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <IconFileText size={20} color="#4AE290" />
                  <Text size="sm">
                    {getTextFiles().length}{" "}
                    {getTextFiles().length === 1
                      ? "file testuale"
                      : "file testuali"}
                  </Text>
                </div>
              </Paper>
            </div>
          )}

          {loading && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                padding: "2rem",
              }}
            >
              <Loader />
            </div>
          )}

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
              {error}
            </Alert>
          )}

          {!loading && !error && (
            <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
              <Stack gap="xs">
                {/* Cartella parent - solo in modalità folder */}
                {activeTab === "folder" && (
                  <Paper
                    p="xs"
                    withBorder
                    style={{ cursor: "pointer" }}
                    onClick={goToParentFolder}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <IconFolder size={20} color="#4A90E2" />
                      <Text size="sm" style={{ flex: 1 }}>
                        ..
                      </Text>
                    </div>
                  </Paper>
                )}

                {items.length === 0 ? (
                  <Text c="dimmed" size="sm">
                    {activeTab === "tag" 
                      ? "Nessun file trovato per questo tag"
                      : "Nessun file o cartella trovato"}
                  </Text>
                ) : (
                  items.map((item, index) => (
                    <Paper
                      key={index}
                      p="xs"
                      withBorder
                      style={{ cursor: "pointer" }}
                      onClick={() => handleFileClick(item)}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        {item.isDirectory ? (
                          <IconFolder size={20} color="#4A90E2" />
                        ) : isImageFile(item.name) ? (
                          <IconPhoto size={20} color="#E24A90" />
                        ) : isTextFile(item.name) ? (
                          <IconFileText size={20} color="#4AE290" />
                        ) : (
                          <IconFile size={20} color="#888" />
                        )}
                        <div style={{ flex: 1 }}>
                          <Text
                            size="sm"
                            style={{ wordBreak: "break-all" }}
                          >
                            {item.name}
                          </Text>
                          {activeTab === "tag" && item.folder && (
                            <Text
                              size="xs"
                              c="dimmed"
                              style={{ wordBreak: "break-all" }}
                            >
                              {item.folder}
                            </Text>
                          )}
                        </div>
                      </div>
                    </Paper>
                  ))
                )}
              </Stack>
            </ScrollArea>
          )}
        </Paper>

        {/* Colonna centrale - File */}
        <Paper
          shadow="sm"
          p="md"
          withBorder
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <Text size="lg" fw={700} mb="md">
            {selectedFile &&
              isImageFile(selectedFile.name) &&
              (() => {
                const imageFiles = getImageFiles();
                const currentIndex = imageFiles.findIndex(
                  (img) => img.path === selectedFile.path
                );
                return `Immagine (${currentIndex + 1}/${imageFiles.length})`;
              })()}
            {selectedFile &&
              isTextFile(selectedFile.name) &&
              (() => {
                const textFiles = getTextFiles();
                const currentIndex = textFiles.findIndex(
                  (f) => f.path === selectedFile.path
                );
                return `File di testo (${currentIndex + 1}/${
                  textFiles.length
                })`;
              })()}
            {!selectedFile ||
            (!isImageFile(selectedFile.name) && !isTextFile(selectedFile.name))
              ? "File"
              : ""}
          </Text>
          {selectedFile && isImageFile(selectedFile.name) ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                overflow: "auto",
              }}
            >
              <img
                src={`/api/image?path=${encodeURIComponent(selectedFile.path)}`}
                alt={selectedFile.name}
                style={{
                  maxWidth: "100%",
                  maxHeight: "100%",
                  objectFit: "contain",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                }}
              />
            </div>
          ) : selectedFile && isTextFile(selectedFile.name) ? (
            <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
              {selectedFile.name.toLowerCase().endsWith(".md") ? (
                <div
                  style={{
                    padding: "1rem",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                >
                  <ReactMarkdown>{textContent}</ReactMarkdown>
                </div>
              ) : (
                <pre
                  style={{
                    fontFamily: "monospace",
                    fontSize: "14px",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    margin: 0,
                    padding: "1rem",
                    backgroundColor: "#f5f5f5",
                    borderRadius: "4px",
                    border: "1px solid #ddd",
                  }}
                >
                  {textContent}
                </pre>
              )}
            </ScrollArea>
          ) : (
            <Text c="dimmed" size="sm">
              {selectedFile
                ? "Seleziona un'immagine o un file di testo per visualizzarlo"
                : "Nessun file selezionato"}
            </Text>
          )}
        </Paper>

        {/* Colonna destra - Tags */}
        <Paper
          shadow="sm"
          p="md"
          withBorder
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <Text size="lg" fw={700} mb="md">
            Tags
          </Text>

          {selectedFile ? (
            <>
              {/* Rating a stelle */}
              <div style={{ marginBottom: "1rem" }}>
                <Text size="sm" fw={500} mb="xs">
                  Rating
                </Text>
                <Rating
                  value={fileRating}
                  onChange={handleRatingChange}
                  size="lg"
                />
              </div>

              {/* Campo per aggiungere nuovo tag */}
              <div style={{ marginBottom: "1rem" }}>
                <TextInput
                  placeholder="Aggiungi un nuovo tag..."
                  value={newTagLabel}
                  onChange={(e) => setNewTagLabel(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      createNewTag();
                    }
                  }}
                  size="sm"
                  rightSection={
                    newTagLabel.trim() && (
                      <span
                        onClick={createNewTag}
                        style={{
                          cursor: "pointer",
                          color: "#4A90E2",
                          fontWeight: "bold",
                        }}
                      >
                        +
                      </span>
                    )
                  }
                />
              </div>

              {/* Lista tutti i tag disponibili con checkbox */}
              {loadingTags ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    padding: "1rem",
                  }}
                >
                  <Loader size="sm" />
                </div>
              ) : (
                <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px",
                    }}
                  >
                    {availableTags.length === 0 ? (
                      <Text c="dimmed" size="sm">
                        Nessun tag disponibile per questo tipo di file
                      </Text>
                    ) : (
                      (() => {
                        // Ordina i tag: prima quelli associati, poi gli altri in ordine alfabetico
                        const fileTagIds = fileTags.map((t) => t.id);
                        const associatedTags = availableTags
                          .filter((tag) => fileTagIds.includes(tag.id))
                          .sort((a, b) => a.label.localeCompare(b.label));
                        const otherTags = availableTags
                          .filter((tag) => !fileTagIds.includes(tag.id))
                          .sort((a, b) => a.label.localeCompare(b.label));
                        const sortedTags = [...associatedTags, ...otherTags];

                        return sortedTags.map((tag) => {
                          const isChecked = fileTagIds.includes(tag.id);
                          const isEditing = editingTagId === tag.id;

                          return (
                            <div
                              key={tag.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <Checkbox
                                checked={isChecked}
                                onChange={(e) =>
                                  toggleTag(tag.id, e.currentTarget.checked)
                                }
                                size="sm"
                                disabled={isEditing}
                              />
                              {isEditing ? (
                                <TextInput
                                  value={editingTagLabel}
                                  onChange={(e) =>
                                    setEditingTagLabel(e.currentTarget.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      saveTagEdit();
                                    } else if (e.key === "Escape") {
                                      cancelEditingTag();
                                    }
                                  }}
                                  onBlur={saveTagEdit}
                                  size="xs"
                                  style={{ flex: 1 }}
                                  autoFocus
                                />
                              ) : (
                                <Text
                                  size="sm"
                                  style={{
                                    flex: 1,
                                    cursor: "pointer",
                                  }}
                                  onClick={() => startEditingTag(tag)}
                                >
                                  {tag.label} {tag.count > 0 && `(${tag.count})`}
                                </Text>
                              )}
                            </div>
                          );
                        });
                      })()
                    )}
                  </div>
                </ScrollArea>
              )}
            </>
          ) : (
            <Text c="dimmed" size="sm">
              Seleziona un file per visualizzare i tag
            </Text>
          )}
        </Paper>
      </div>
    </Stack>
  );
}
