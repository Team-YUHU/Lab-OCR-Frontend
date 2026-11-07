"use client";

import { useState, type FormEvent } from "react";

type InventoryCategory = {
  id: string;
  name: string;
};

type InventoryFile = {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  previewTitle: string;
  previewMessage: string;
  categoryId: string;
};

const initialCategories: InventoryCategory[] = [
  { id: "lab-work", name: "Lab work" },
  { id: "prescriptions", name: "Prescriptions" },
];

const initialFiles: InventoryFile[] = [
  {
    id: "lab-results",
    title: "Lab results",
    date: "Nov 08, 2029",
    time: "12:00 PM",
    description: "Lab results and notes from your recent visit.",
    previewTitle: "Lab results scan",
    previewMessage: "Sample document · PDF",
    categoryId: "lab-work",
  },
  {
    id: "blood-test",
    title: "Blood test",
    date: "Nov 06, 2029",
    time: "9:42 AM",
    description: "Blood work report with a complete blood count.",
    previewTitle: "Blood test report",
    previewMessage: "Sample document · PDF",
    categoryId: "lab-work",
  },
  {
    id: "prescription",
    title: "Prescription",
    date: "Nov 02, 2029",
    time: "4:18 PM",
    description: "Prescription instructions from your care provider.",
    previewTitle: "Prescription scan",
    previewMessage: "Sample document · Image",
    categoryId: "prescriptions",
  },
];

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3h14v-3" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m7 10 5 5 5-5" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20v-1.5a7 7 0 0 1 14 0V20" />
    </svg>
  );
}

export default function InventoryPage() {
  const [categories, setCategories] = useState(initialCategories);
  const [files, setFiles] = useState(initialFiles);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(
    () => new Set(initialCategories.map((category) => category.id)),
  );
  const [selectedFileId, setSelectedFileId] = useState(initialFiles[0].id);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryError, setCategoryError] = useState("");
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? files[0];

  function addCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();

    if (!name) {
      setCategoryError("Enter a category name.");
      return;
    }

    if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
      setCategoryError("A category with that name already exists.");
      return;
    }

    const id = `category-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;
    setCategories((current) => [...current, { id, name }]);
    setExpandedCategoryIds((current) => new Set(current).add(id));
    setCategoryName("");
    setCategoryError("");
    setIsAddingCategory(false);
  }

  function moveFile(fileId: string, categoryId: string) {
    setFiles((current) =>
      current.map((file) => (file.id === fileId ? { ...file, categoryId } : file)),
    );
  }

  function toggleCategory(categoryId: string) {
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  return (
    <main className="app-page">
      <header className="topbar">
        <a className="brand" href="#inventory" aria-label="Inventory Files home">
          <span className="brand-mark" aria-hidden="true">I</span>
          <span>Inventory<span className="brand-divider">-</span>Files</span>
        </a>
        <span className="topbar-note">Your documents, in one place</span>
        <a className="topbar-profile" href="#profile">
          <UserIcon />
          <span>My profile</span>
        </a>
      </header>

      <div className="workspace" id="inventory">
        <aside className="inventory-panel" aria-labelledby="inventory-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR LIBRARY</p>
              <h1 id="inventory-heading">Inventory</h1>
            </div>
            <span className="file-count">
              {files.length.toString().padStart(2, "0")} files
            </span>
            <button
              className="add-category-button"
              type="button"
              aria-label={isAddingCategory ? "Cancel adding category" : "Add category"}
              aria-expanded={isAddingCategory}
              onClick={() => {
                setIsAddingCategory((isOpen) => !isOpen);
                setCategoryError("");
              }}
            >
              <PlusIcon />
              <span>Add category</span>
            </button>
          </div>

          {isAddingCategory && (
            <form className="category-form" onSubmit={addCategory}>
              <label className="visually-hidden" htmlFor="new-category-name">
                New category name
              </label>
              <input
                autoFocus
                id="new-category-name"
                value={categoryName}
                onChange={(event) => {
                  setCategoryName(event.target.value);
                  setCategoryError("");
                }}
                placeholder="Category name"
                aria-describedby={categoryError ? "category-error" : undefined}
              />
              <button type="submit">Add</button>
              {categoryError && (
                <p className="category-error" id="category-error" role="alert">
                  {categoryError}
                </p>
              )}
            </form>
          )}

          <div className="category-list">
            {categories.map((category) => {
              const categoryFiles = files.filter((file) => file.categoryId === category.id);
              const isExpanded = expandedCategoryIds.has(category.id);
              const contentId = `${category.id}-content`;

              return (
                <section className="category-card" key={category.id} aria-label={category.name}>
                  <div className="category-heading">
                    <button
                      className="category-toggle"
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={contentId}
                      onClick={() => toggleCategory(category.id)}
                    >
                      <span className="category-name">{category.name}</span>
                      <span className="category-count">{categoryFiles.length}</span>
                      <ChevronIcon />
                    </button>
                  </div>
                  <div
                    className="category-content"
                    id={contentId}
                    hidden={!isExpanded}
                  >
                    {categoryFiles.length > 0 ? (
                      <div className="file-list">
                        {categoryFiles.map((file) => (
                          <button
                            className={`file-card${file.id === selectedFile.id ? " is-active" : ""}`}
                            key={file.id}
                            type="button"
                            aria-pressed={file.id === selectedFile.id}
                            onClick={() => setSelectedFileId(file.id)}
                          >
                            <span className="file-thumbnail" aria-hidden="true">
                              <span />
                              <span />
                              <span />
                            </span>
                            <span className="file-card-copy">
                              <strong>{file.title}</strong>
                              <span>{file.date}</span>
                              <span>{file.time}</span>
                            </span>
                            {file.id === selectedFile.id && (
                              <span className="active-indicator" aria-hidden="true" />
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-category">No files in this category yet.</p>
                    )}
                  </div>
                  <button
                    className="export-button"
                    type="button"
                    disabled
                    title="CSV export is coming soon."
                  >
                    <DownloadIcon />
                    <span>Export CSV</span>
                  </button>
                </section>
              );
            })}
          </div>

          <a className="add-file-link" href="#add-file">
            <span className="add-file-icon"><PlusIcon /></span>
            <span>
              <strong>Add a new file</strong>
              <small>Keep everything together</small>
            </span>
          </a>
        </aside>

        <section className="document-panel" id="preview" aria-labelledby="document-title">
          <div className="document-header">
            <div>
              <p className="eyebrow">DOCUMENT PREVIEW</p>
              <h2 id="document-title">{selectedFile.title}</h2>
            </div>
            <span className="date-pill">
              {selectedFile.date} <span>·</span> {selectedFile.time}
            </span>
          </div>

          <div className="document-content">
            <div
              className="preview-sheet"
              role="img"
              aria-label={`Preview placeholder for ${selectedFile.title}`}
            >
              <div className="preview-icon">
                <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
                  <rect x="8" y="4.5" width="24" height="31" rx="4" />
                  <path d="M14 13h12M14 19h12M14 25h7" />
                </svg>
              </div>
              <strong>{selectedFile.previewTitle}</strong>
              <span>{selectedFile.previewMessage}</span>
            </div>
            <div className="description">
              <div>
                <p className="eyebrow">NOTES</p>
                <h3>Description</h3>
              </div>
              <div className="document-details">
                <p>{selectedFile.description}</p>
                <label className="category-select-label" htmlFor="file-category">
                  Category
                </label>
                <select
                  id="file-category"
                  value={selectedFile.categoryId}
                  onChange={(event) => moveFile(selectedFile.id, event.target.value)}
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        <a className="nav-item is-current" href="#inventory" aria-current="page">
          <ClockIcon />
          <span>Inventory</span>
        </a>
        <a className="nav-item nav-add" href="#add-file">
          <PlusIcon />
          <span>Add file</span>
        </a>
        <a className="nav-item" href="#profile">
          <UserIcon />
          <span>Profile</span>
        </a>
      </nav>
      <span className="page-end" id="add-file" />
      <span className="page-end" id="profile" />
    </main>
  );
}
