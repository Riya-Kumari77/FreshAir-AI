import React, { useEffect, useState } from 'react';
import { Search, MapPin, Navigation, X, Loader2 } from 'lucide-react';
import { PRESET_LOCATIONS } from '../data/constants';
import { searchLocationsApi } from '../services/api';
import type { LanguageCode, LocationInfo } from '../types/freshair';

interface LocationSelectorModalProps {
  open: boolean;
  onClose: () => void;
  currentLocation: LocationInfo;
  onSelectLocation: (loc: LocationInfo) => void;
  language: LanguageCode;
}

export const LocationSelectorModal: React.FC<LocationSelectorModalProps> = ({
  open,
  onClose,
  currentLocation,
  onSelectLocation,
  language,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locatingGps, setLocatingGps] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const found = await searchLocationsApi(trimmed);
        setResults(found);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to search cities.');
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [query, open]);

  if (!open) return null;

  const handleUseCurrentGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    setLocatingGps(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        onSelectLocation({
          id: `gps-${lat}-${lon}`,
          name: 'Current Location',
          region: 'GPS Coordinates',
          country: '',
          latitude: lat,
          longitude: lon,
        });
        onClose();
      },
      (geoErr) => {
        setLocatingGps(false);
        setError(geoErr.message || 'Location permission was declined.');
      },
      { timeout: 8000 },
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-[#0F1F1C]/45 backdrop-blur-[1px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select monitoring location"
        className="relative z-10 w-full max-w-lg bg-white rounded-xl border border-[#DCE3DF] shadow-xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8E4]">
          <div>
            <h2 className="font-display text-base font-semibold text-[#0F1F1C]">
              {language === 'hi' ? 'स्थान चुनें' : 'Select Location'}
            </h2>
            <p className="text-xs text-[#647571] mt-0.5">
              {language === 'hi'
                ? 'Open-Meteo से रीयल-टाइम AQI और मौसम के लिए शहर खोजें'
                : 'Search any city worldwide via Open-Meteo Geocoding'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#526460] hover:text-[#0F1F1C] rounded-md"
            aria-label="Close location modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="relative">
            <Search className="h-4 w-4 text-[#647571] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                language === 'hi'
                  ? 'शहर का नाम लिखें (जैसे: Delhi, Pune, Jaipur)...'
                  : 'Search city name (e.g., Delhi, Pune, Noida, Tokyo)...'
              }
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F766E] focus:ring-2 focus:ring-[#0F766E]/15"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleUseCurrentGps}
              disabled={locatingGps}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#0F766E] bg-[#0F766E]/8 hover:bg-[#0F766E]/15 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
            >
              {locatingGps ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Navigation className="h-3.5 w-3.5" />
              )}
              <span>{language === 'hi' ? 'मेरा वर्तमान GPS स्थान उपयोग करें' : 'Use Current GPS Location'}</span>
            </button>
            <span className="text-xs text-[#647571] truncate">
              Active: <strong className="font-medium text-[#0F1F1C]">{currentLocation.name}</strong>
            </span>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-xs text-[#B91C1C]">
              {error}
            </div>
          )}

          {query.trim().length >= 2 ? (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="flex items-center gap-2 py-6 justify-center text-xs text-[#647571]">
                  <Loader2 className="h-4 w-4 animate-spin text-[#0F766E]" />
                  <span>Searching cities...</span>
                </div>
              ) : results.length === 0 ? (
                <p className="py-6 text-center text-xs text-[#647571]">
                  No matching cities found for &ldquo;{query}&rdquo;. Try another spelling.
                </p>
              ) : (
                results.map((loc) => (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      onSelectLocation(loc);
                      onClose();
                    }}
                    className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border border-[#EAEFEA] hover:border-[#0F766E]/40 hover:bg-[#F5FAF8] text-left transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#0F1F1C] truncate">{loc.name}</p>
                      <p className="text-xs text-[#647571] truncate">
                        {[loc.region, loc.country].filter(Boolean).join(', ')}
                      </p>
                    </div>
                    <span className="font-mono tabular-nums text-[11px] text-[#647571] shrink-0">
                      {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div>
              <p className="text-xs font-medium text-[#526460] mb-2">
                {language === 'hi' ? 'प्रमुख शहर' : 'Quick-Select Cities'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {PRESET_LOCATIONS.map((loc) => {
                  const selected =
                    loc.name === currentLocation.name &&
                    Math.abs(loc.latitude - currentLocation.latitude) < 0.05;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        onSelectLocation(loc);
                        onClose();
                      }}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border text-left transition-colors ${
                        selected
                          ? 'border-[#0F766E] bg-[#0F766E]/8 text-[#0F1F1C]'
                          : 'border-[#E2E8E4] hover:border-[#0F766E]/40 hover:bg-[#F6FAF8]'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{loc.name}</p>
                        <p className="text-xs text-[#647571] truncate">{loc.country}</p>
                      </div>
                      <MapPin className="h-3.5 w-3.5 text-[#0F766E] shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
