type Props = {
  query: string;
  onQueryChange: (v: string) => void;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: (v: boolean) => void;
  count: number;
  disabled?: boolean;
};

export default function DocumentsToolbar({
  query,
  onQueryChange,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  count,
  disabled,
}: Props) {
  return (
    <div className="search-row">
      <input
        type="text"
        placeholder="Search title, category, summary, content..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        disabled={disabled}
      />

      <label className="favorites-toggle">
        <input
          type="checkbox"
          checked={showFavoritesOnly}
          onChange={(e) => onToggleFavoritesOnly(e.target.checked)}
        />
        Favorites only
      </label>

      <div className="count">{count} items</div>
    </div>
  );
}
