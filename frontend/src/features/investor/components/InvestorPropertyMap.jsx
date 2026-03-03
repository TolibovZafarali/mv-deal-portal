import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "@/features/investor/components/InvestorPropertyMap.css";

const DEFAULT_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const DEFAULT_PLACE_LABEL_TILE_URL =
  "https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const DEFAULT_MAX_ZOOM = 18;
const DEFAULT_MIN_ZOOM = 4;
const DEFAULT_CENTER = [39.5, -98.35];
const DEFAULT_ZOOM = 4;
const SINGLE_PROPERTY_ZOOM = 15;
const FIT_BOUNDS_MAX_ZOOM = 14;

const configuredMaxZoom = Number.parseInt(
  String(import.meta.env.VITE_MAP_MAX_ZOOM ?? ""),
  10,
);
const configuredMinZoom = Number.parseInt(
  String(import.meta.env.VITE_MAP_MIN_ZOOM ?? ""),
  10,
);

const MAP_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || DEFAULT_TILE_URL;
const MAP_PLACE_LABEL_TILE_URL =
  import.meta.env.VITE_MAP_PLACE_LABEL_TILE_URL || DEFAULT_PLACE_LABEL_TILE_URL;
const MAP_MAX_ZOOM = Number.isFinite(configuredMaxZoom)
  ? configuredMaxZoom
  : DEFAULT_MAX_ZOOM;
const MAP_MIN_ZOOM = Math.min(
  Number.isFinite(configuredMinZoom)
    ? configuredMinZoom
    : DEFAULT_MIN_ZOOM,
  MAP_MAX_ZOOM,
);

function toCoordinate(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function compactPriceLabel(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "N/A";

  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const rounded = Math.round(millions * 10) / 10;
    return `${String(rounded).replace(/\\.0$/, "")}M`;
  }

  if (amount >= 1_000) {
    return `${Math.round(amount / 1_000)}K`;
  }

  return String(Math.round(amount));
}

function toMapPoints(properties) {
  return (Array.isArray(properties) ? properties : [])
    .map((property) => {
      const lat = toCoordinate(property?.latitude);
      const lng = toCoordinate(property?.longitude);
      const id = property?.id;
      const priceLabel = compactPriceLabel(property?.askingPrice);

      if (lat === null || lng === null || id === null || id === undefined) {
        return null;
      }

      return { id, lat, lng, priceLabel };
    })
    .filter(Boolean);
}

export default function InvestorPropertyMap({
  properties,
  selectedPropertyId,
  onSelectProperty,
  onVisiblePropertyIdsChange,
  loading,
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerLayerRef = useRef(null);

  const points = useMemo(() => toMapPoints(properties), [properties]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      minZoom: MAP_MIN_ZOOM,
    });
    const markerLayer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markerLayerRef.current = markerLayer;

    map.createPane("labelPane");
    const labelPane = map.getPane("labelPane");
    if (labelPane) {
      labelPane.style.zIndex = "450";
      labelPane.style.pointerEvents = "none";
    }

    L.tileLayer(MAP_TILE_URL, {
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
    }).addTo(map);
    L.tileLayer(MAP_PLACE_LABEL_TILE_URL, {
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
      pane: "labelPane",
      opacity: 0.95,
    }).addTo(map);

    map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    const handleWindowResize = () => {
      map.invalidateSize();
    };

    window.addEventListener("resize", handleWindowResize);
    requestAnimationFrame(handleWindowResize);

    return () => {
      window.removeEventListener("resize", handleWindowResize);
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    if (!map || !markerLayer) return;

    markerLayer.clearLayers();

    points.forEach((point) => {
      const latLng = [point.lat, point.lng];
      const isSelected = point.id === selectedPropertyId;
      const marker = L.marker(latLng, {
        icon: L.divIcon({
          className: "",
          html: `
            <span class="invMap__pricePin ${isSelected ? "invMap__pricePin--selected" : ""}">
              ${point.priceLabel}
            </span>
          `,
        }),
        keyboard: true,
      }).addTo(markerLayer);

      marker.setZIndexOffset(isSelected ? 1000 : 0);

      marker.off("click");
      marker.on("click", () => {
        onSelectProperty?.(point.id);
      });
    });
  }, [onSelectProperty, points, selectedPropertyId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || points.length === 0) return;

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));

    if (points.length === 1) {
      map.setView(bounds.getCenter(), Math.min(SINGLE_PROPERTY_ZOOM, MAP_MAX_ZOOM), {
        animate: true,
      });
    } else {
      map.fitBounds(bounds.pad(0.2), {
        animate: true,
        maxZoom: Math.min(FIT_BOUNDS_MAX_ZOOM, MAP_MAX_ZOOM),
      });
    }

    requestAnimationFrame(() => map.invalidateSize());
  }, [points]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    function emitVisiblePropertyIds() {
      const bounds = map.getBounds();
      const visibleIds = points
        .filter((point) => bounds.contains([point.lat, point.lng]))
        .map((point) => point.id);
      onVisiblePropertyIdsChange?.(visibleIds);
    }

    emitVisiblePropertyIds();
    map.on("moveend zoomend", emitVisiblePropertyIds);

    return () => {
      map.off("moveend zoomend", emitVisiblePropertyIds);
    };
  }, [onVisiblePropertyIdsChange, points]);

  useEffect(() => {
    if (selectedPropertyId === null || selectedPropertyId === undefined) return;

    const map = mapRef.current;
    if (!map) return;

    const selectedPoint = points.find((point) => point.id === selectedPropertyId);
    if (!selectedPoint) return;

    map.panTo([selectedPoint.lat, selectedPoint.lng], {
      animate: true,
      duration: 0.35,
    });
  }, [points, selectedPropertyId]);

  const hasProperties = Array.isArray(properties) && properties.length > 0;
  const hasCoordinates = points.length > 0;

  return (
    <div className="invMap" aria-label="Property map">
      <div className="invMap__canvas" ref={mapContainerRef} />

      {!loading && !hasProperties ? (
        <div className="invMap__empty">
          <span className="material-symbols-outlined">map</span>
          <p>No properties to display on map.</p>
        </div>
      ) : null}

      {!loading && hasProperties && !hasCoordinates ? (
        <div className="invMap__empty">
          <span className="material-symbols-outlined">location_off</span>
          <p>Properties loaded, but map coordinates are unavailable.</p>
        </div>
      ) : null}
    </div>
  );
}
