import { useMemo, useState } from "react";
import Modal from "@/shared/ui/modal/Modal";
import "@/features/admin/modals/SellerAssignmentModal.css";

function sellerDisplayName(seller) {
  const full = [seller?.firstName, seller?.lastName].filter(Boolean).join(" ").trim();
  return full || seller?.email || `Seller #${seller?.id ?? "—"}`;
}

function SellerAssignmentModalBody({
  property,
  searching,
  searchError,
  results,
  saving,
  saveError,
  onClose,
  onSearch,
  onAssign,
  onUnassign,
}) {
  const [query, setQuery] = useState("");
  const [selectedSellerId, setSelectedSellerId] = useState(null);

  const hasResults = results.length > 0;

  const selectedSeller = useMemo(
    () => results.find((seller) => seller.id === selectedSellerId) ?? null,
    [results, selectedSellerId],
  );

  function handleSearchSubmit(e) {
    e.preventDefault();
    onSearch?.(query);
  }

  function handleAssign() {
    if (!selectedSeller) return;
    onAssign?.(selectedSeller.id);
  }

  return (
    <div className="sellerAssign">
      <div className="sellerAssign__meta">
        <div><span>Property:</span> #{property.id}</div>
        <div><span>Address:</span> {property.street1}, {property.city}, {property.state} {property.zip}</div>
        <div><span>Current Seller ID:</span> {property.sellerId ?? "Unassigned"}</div>
      </div>

      <form className="sellerAssign__search" onSubmit={handleSearchSubmit}>
        <input
          className="sellerAssign__input"
          type="search"
          placeholder="Search seller by name or email"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={searching || saving}
        />
        <button className="sellerAssign__btn sellerAssign__btn--primary" type="submit" disabled={searching || saving || !query.trim()}>
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {searchError ? <div className="sellerAssign__error">{searchError}</div> : null}
      {saveError ? <div className="sellerAssign__error">{saveError}</div> : null}

      {hasResults ? (
        <div className="sellerAssign__results">
          {results.map((seller) => (
            <label className="sellerAssign__row" key={seller.id}>
              <input
                type="radio"
                name="selectedSeller"
                value={seller.id}
                checked={selectedSellerId === seller.id}
                onChange={() => setSelectedSellerId(seller.id)}
                disabled={saving}
              />
              <span className="sellerAssign__name">{sellerDisplayName(seller)}</span>
              <span className="sellerAssign__detail">{seller.email || "—"}</span>
              <span className="sellerAssign__detail">{seller.companyName || "—"}</span>
            </label>
          ))}
        </div>
      ) : null}

      <div className="sellerAssign__actions">
        <button className="sellerAssign__btn" type="button" onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button className="sellerAssign__btn sellerAssign__btn--danger" type="button" onClick={onUnassign} disabled={saving}>
          {saving ? "Saving..." : "Unassign"}
        </button>
        <button
          className="sellerAssign__btn sellerAssign__btn--primary"
          type="button"
          onClick={handleAssign}
          disabled={saving || !selectedSeller}
        >
          {saving ? "Saving..." : "Assign Selected"}
        </button>
      </div>
    </div>
  );
}

export default function SellerAssignmentModal({
  open,
  property,
  searching = false,
  searchError = "",
  results = [],
  saving = false,
  saveError = "",
  onClose,
  onSearch,
  onAssign,
  onUnassign,
}) {
  return (
    <Modal open={open} onClose={onClose} title="Assign Seller" width={760}>
      {!property ? null : (
        <SellerAssignmentModalBody
          key={`seller-assign-${property.id}-${open ? "open" : "closed"}`}
          property={property}
          searching={searching}
          searchError={searchError}
          results={results}
          saving={saving}
          saveError={saveError}
          onClose={onClose}
          onSearch={onSearch}
          onAssign={onAssign}
          onUnassign={onUnassign}
        />
      )}
    </Modal>
  );
}
