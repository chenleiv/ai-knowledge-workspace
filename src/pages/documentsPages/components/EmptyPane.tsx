import React from "react";

type Props = {
  hasDocs: boolean;
};

export const EmptyPane: React.FC<Props> = ({ hasDocs }) => {
  return (
    <div className="doc-pane">
      <div className="doc-pane-empty">
        {hasDocs ? (
          <div className="doc-pane-empty-title">Select a document</div>
        ) : (
          <>
            <div className="doc-pane-empty-title">No documents yet</div>
            <div className="doc-pane-empty-sub">
              Create your first document to get started.
            </div>
          </>
        )}
      </div>
    </div>
  );
};
