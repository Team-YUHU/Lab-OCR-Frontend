"use client";

import { useState } from "react";

type HistoryFile = {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  previewTitle: string;
  previewMessage: string;
};

const files: HistoryFile[] = [
  {
    id: "lab-results",
    title: "Lab results",
    date: "Nov 08, 2029",
    time: "12:00 PM",
    description: "Lab results and notes from your recent visit.",
    previewTitle: "Lab results scan",
    previewMessage: "Sample document · PDF",
  },
  {
    id: "blood-test",
    title: "Blood test",
    date: "Nov 06, 2029",
    time: "9:42 AM",
    description: "Blood work report with a complete blood count.",
    previewTitle: "Blood test report",
    previewMessage: "Sample document · PDF",
  },
  {
    id: "prescription",
    title: "Prescription",
    date: "Nov 02, 2029",
    time: "4:18 PM",
    description: "Prescription instructions from your care provider.",
    previewTitle: "Prescription scan",
    previewMessage: "Sample document · Image",
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

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="7.5" r="3.5" />
      <path d="M5 20v-1.5a7 7 0 0 1 14 0V20" />
    </svg>
  );
}

export default function Home() {
  const [selectedFileId, setSelectedFileId] = useState(files[0].id);
  const selectedFile = files.find((file) => file.id === selectedFileId) ?? files[0];

  return (
    <main className="app-page">
      <header className="topbar">
        <a className="brand" href="#history" aria-label="History Files home">
          <span className="brand-mark" aria-hidden="true">H</span>
          <span>History<span className="brand-divider">-</span>Files</span>
        </a>
        <span className="topbar-note">Your documents, in one place</span>
        <a className="topbar-profile" href="#profile">
          <UserIcon />
          <span>My profile</span>
        </a>
      </header>

      <div className="workspace" id="history">
        <aside className="history-panel" aria-labelledby="history-heading">
          <div className="section-heading">
            <div>
              <p className="eyebrow">YOUR LIBRARY</p>
              <h1 id="history-heading">History</h1>
            </div>
            <span className="file-count">
              {files.length.toString().padStart(2, "0")} files
            </span>
          </div>

          <div className="file-list">
            {files.map((file) => (
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
              <p>{selectedFile.description}</p>
            </div>
          </div>
        </section>
      </div>

      <nav className="bottom-nav" aria-label="Main navigation">
        <a className="nav-item is-current" href="#history" aria-current="page">
          <ClockIcon />
          <span>History</span>
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
