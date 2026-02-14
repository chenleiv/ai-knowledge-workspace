import React, { createContext, useContext, useState, useCallback } from "react";
import { listDocuments, type DocumentItem } from "../api/documentsClient";

interface DocumentsContextType {
    docs: DocumentItem[];
    loading: boolean;
    error: string | null;
    isReady: boolean;
    loadDocuments: (force?: boolean) => Promise<void>;
    setDocs: React.Dispatch<React.SetStateAction<DocumentItem[]>>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export function DocumentsProvider({ children }: { children: React.ReactNode }) {
    const [docs, setDocs] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isReady, setIsReady] = useState(false);

    const loadDocuments = useCallback(async (force = false) => {
        // If not forced and already loaded once, don't fetch again
        if (!force && isReady) return;

        setLoading(true);
        setError(null);
        try {
            const data = await listDocuments();
            setDocs(data);
            setIsReady(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load documents");
        } finally {
            setLoading(false);
        }
    }, [isReady]);

    return (
        <DocumentsContext.Provider
            value={{
                docs,
                loading,
                error,
                isReady,
                loadDocuments,
                setDocs,
            }}
        >
            {children}
        </DocumentsContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDocuments() {
    const context = useContext(DocumentsContext);
    if (!context) {
        throw new Error("useDocuments must be used within a DocumentsProvider");
    }
    return context;
}
