import React from "react";
import type { DocumentItem } from "../../../api/documentsClient";

type Props = {
  doc: DocumentItem;
};

export const DocumentView: React.FC<Props> = ({ doc }) => {
  return (
    <div key={doc.id} className="doc-pane-body doc-pane-anim">
      <div className="doc-pane-section">
        <div className="doc-pane-label">Summary</div>
        <div className="doc-pane-text">{doc.summary}</div>
      </div>

      <div className="doc-pane-section">
        <div className="doc-pane-label">Content</div>
        <div className="doc-pane-text prewrap">{doc.content}</div>
      </div>
    </div>
  );
};
