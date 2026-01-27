import React from "react";

type Props = {
    title: string;
    category?: string;
    active: boolean;
    isDragging?: boolean;
    onClick: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void;
    actions: React.ReactNode;
};

export default function DocumentListItem({
    title,
    category,
    active,
    isDragging,
    onClick,
    onKeyDown,
    actions,
}: Props) {
    return (
        <div
            className={[
                "doc-row",
                active ? "is-active" : "",
                isDragging ? "is-dragging" : "",
            ].join(" ")}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={onKeyDown}
        >
            <div className="doc-row-main">
                <div className="doc-row-title" title={title}>
                    {title}
                </div>
                {/* {category ? <div className="doc-row-meta">{category}</div> : null} */}
            </div>

            <div className="doc-row-actions" onClick={(e) => e.stopPropagation()}>
                {actions}
            </div>
        </div>
    );
}