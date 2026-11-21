import React, { useEffect, useMemo, useState } from 'react';
import { Check, MapPin, Search, Trash2, Bookmark } from 'lucide-react';
import type { LocationInfo, SavedRecommendation, UserProfile } from '../types/freshair';
import { formatTimestamp } from '../utils/aqi';

interface ProfileViewProps {
  profile: UserProfile;
  onUpdateProfile: (next: UserProfile) => void;
  activeLocation: LocationInfo;
  onOpenLocationPicker: () => void;
  savedItems: SavedRecommendation[];
  onRemoveSavedItem: (id: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  onUpdateProfile,
  activeLocation,
  onOpenLocationPicker,
  savedItems,
  onRemoveSavedItem,
}) => {
  const [draft, setDraft] = useState<UserProfile>(profile);
  const [savedNotice, setSavedNotice] = useState(false);
  const [filterCategory, setFilterCategory] = useState<'all' | SavedRecommendation['category']>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(draft);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2600);
  };

  const handleSetActiveAsDefault = () => {
    const next = { ...draft, defaultLocation: activeLocation };
    setDraft(next);
    onUpdateProfile(next);
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2600);
  };

  const filteredSaved = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return savedItems.filter((item) => {
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q) ||
        item.locationName.toLowerCase().includes(q)
      );
    });
  }, [savedItems, filterCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Preferences & Lifestyle Form */}
      <form
        onSubmit={handleSavePreferences}
        className="bg-white border border-[#E2E8E4] rounded-xl p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EDF1EE]">
          <div>
            <h2 className="font-display text-lg font-semibold text-[#0F1F1C]">
              User Profile &amp; Personalization
            </h2>
            <p className="text-xs sm:text-sm text-[#526460] mt-0.5">
              These preferences personalize your Gemini AI recommendations, daily planner routines, and indoor air tips.
            </p>
          </div>
          {savedNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
              <Check className="h-4 w-4" />
              Preferences saved
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <label className="block text-xs font-medium text-[#445652]">
            Display Name
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1.5 w-full px-3.5 py-2.5 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F766E]"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-[#445652]">
              Preferred Language
              <select
                value={draft.language}
                onChange={(e) => setDraft({ ...draft, language: e.target.value as 'en' | 'hi' })}
                className="mt-1.5 w-full px-3 py-2.5 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F766E]"
              >
                <option value="en">English</option>
                <option value="hi">हिन्दी (Hindi)</option>
              </select>
            </label>

            <label className="block text-xs font-medium text-[#445652]">
              Temperature Unit
              <select
                value={draft.temperatureUnit}
                onChange={(e) => setDraft({ ...draft, temperatureUnit: e.target.value as 'C' | 'F' })}
                className="mt-1.5 w-full px-3 py-2.5 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F766E]"
              >
                <option value="C">Celsius (°C)</option>
                <option value="F">Fahrenheit (°F)</option>
              </select>
            </label>
          </div>

          <label className="block text-xs font-medium text-[#445652]">
            Household Composition
            <select
              value={draft.householdGroup}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  householdGroup: e.target.value as UserProfile['householdGroup'],
                })
              }
              className="mt-1.5 w-full px-3 py-2.5 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F766E]"
            >
              <option value="general">General Adult Household</option>
              <option value="children">Household with Young Children</option>
              <option value="seniors">Household with Older Adults (60+)</option>
              <option value="mixed_family">Multi-Generational Family (Kids &amp; Seniors)</option>
            </select>
          </label>

          <label className="block text-xs font-medium text-[#445652]">
            Respiratory Sensitivity Level
            <select
              value={draft.respiratorySensitivity}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  respiratorySensitivity: e.target.value as UserProfile['respiratorySensitivity'],
                })
              }
              className="mt-1.5 w-full px-3 py-2.5 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F766E]"
            >
              <option value="none">No known sensitivity</option>
              <option value="mild">Mild seasonal allergy / smog irritation</option>
              <option value="high">High sensitivity (asthma / chronic respiratory care)</option>
            </select>
          </label>

          <label className="block text-xs font-medium text-[#445652]">
            Primary Daily Commute
            <select
              value={draft.commuteMode}
              onChange={(e) =>
                setDraft({ ...draft, commuteMode: e.target.value as UserProfile['commuteMode'] })
              }
              className="mt-1.5 w-full px-3 py-2.5 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F766E]"
            >
              <option value="public_transit">Metro / Bus Public Transit</option>
              <option value="car">Personal Car</option>
              <option value="two_wheeler">Two-Wheeler / Scooter</option>
              <option value="cycle_walk">Walking / Cycling</option>
              <option value="remote">Work / Study from Home</option>
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-[#445652]">
              Daily Commute (km)
              <input
                type="number"
                min={0}
                max={200}
                value={draft.dailyCommuteKm}
                onChange={(e) =>
                  setDraft({ ...draft, dailyCommuteKm: Math.max(0, Number(e.target.value) || 0) })
                }
                className="mt-1.5 w-full px-3 py-2.5 text-sm font-mono tabular-nums bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F766E]"
              />
            </label>

            <label className="block text-xs font-medium text-[#445652]">
              Primary Cooking Fuel
              <select
                value={draft.cookingFuel}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    cookingFuel: e.target.value as UserProfile['cookingFuel'],
                  })
                }
                className="mt-1.5 w-full px-3 py-2.5 text-sm bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:bg-white focus:border-[#0F766E]"
              >
                <option value="lpg_png">LPG / Piped Natural Gas</option>
                <option value="induction">Electric / Induction</option>
                <option value="mixed_solid">Mixed / Solid Fuel</option>
              </select>
            </label>
          </div>
        </div>

        <label className="inline-flex items-center gap-2.5 text-sm text-[#0F1F1C] cursor-pointer">
          <input
            type="checkbox"
            checked={draft.hasAirPurifier}
            onChange={(e) => setDraft({ ...draft, hasAirPurifier: e.target.checked })}
            className="h-4 w-4 accent-[#0F766E] rounded"
          />
          <span>I have a True HEPA air purifier at home</span>
        </label>

        {/* Location Settings Sub-section */}
        <div className="pt-5 border-t border-[#EDF1EE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-[#526460]">Default Home Location</p>
            <p className="text-sm font-medium text-[#0F1F1C] flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#0F766E]" />
              {draft.defaultLocation.name}
              {draft.defaultLocation.region ? `, ${draft.defaultLocation.region}` : ''}
              {draft.defaultLocation.country ? `, ${draft.defaultLocation.country}` : ''}
            </p>
            <p className="font-mono tabular-nums text-[11px] text-[#647571]">
              {draft.defaultLocation.latitude.toFixed(4)}°, {draft.defaultLocation.longitude.toFixed(4)}°
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {activeLocation.id !== draft.defaultLocation.id && (
              <button
                type="button"
                onClick={handleSetActiveAsDefault}
                className="px-3.5 py-2 text-xs font-medium text-[#0F766E] bg-[#0F766E]/8 hover:bg-[#0F766E]/15 rounded-lg transition-colors whitespace-nowrap"
              >
                Set &ldquo;{activeLocation.name}&rdquo; as Default
              </button>
            )}
            <button
              type="button"
              onClick={onOpenLocationPicker}
              className="px-3.5 py-2 text-xs font-medium text-[#445652] bg-[#F4F7F5] hover:bg-[#EAEFEA] border border-[#DCE3DF] rounded-lg transition-colors whitespace-nowrap"
            >
              Change Active City
            </button>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#0F766E] hover:bg-[#115E59] rounded-lg transition-colors whitespace-nowrap"
          >
            Save Preferences
          </button>
        </div>
      </form>

      {/* Saved Recommendations Library */}
      <section className="bg-white border border-[#E2E8E4] rounded-xl p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-base font-semibold text-[#0F1F1C]">
              Saved Recommendations
            </h3>
            <p className="text-xs text-[#647571] mt-0.5">
              Guidance bookmarked from Dashboard, AI Assistant, Daily Planner, and Indoor Air Guide.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-[#647571] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search saved tips..."
                className="pl-8 pr-3 py-1.5 text-xs bg-[#F7F9F8] border border-[#DCE3DF] rounded-lg focus:outline-none focus:border-[#0F766E]"
              />
            </div>

            <div className="inline-flex items-center gap-1 p-1 bg-[#F2F5F3] rounded-lg">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'dashboard', label: 'Dashboard' },
                  { id: 'assistant', label: 'Assistant' },
                  { id: 'planner', label: 'Planner' },
                  { id: 'indoor', label: 'Indoor' },
                ] as const
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFilterCategory(cat.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    filterCategory === cat.id
                      ? 'bg-white text-[#0F1F1C] shadow-xs'
                      : 'text-[#526460] hover:text-[#0F1F1C]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredSaved.length === 0 ? (
          <div className="border border-dashed border-[#DCE3DF] rounded-lg py-10 px-6 text-center">
            <Bookmark className="h-5 w-5 text-[#94A39F] mx-auto mb-2" />
            <p className="text-sm font-medium text-[#0F1F1C]">
              {savedItems.length === 0 ? 'No saved recommendations yet' : 'No matching saved items'}
            </p>
            <p className="text-xs text-[#647571] mt-1 max-w-md mx-auto">
              {savedItems.length === 0
                ? 'Click Save on any AI recommendation, Assistant answer, Daily Routine, or Indoor Room Plan to keep it here for quick reference.'
                : 'Try clearing your search query or switching the category filter.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#EDF1EE]">
            {filteredSaved.map((item) => (
              <article key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#647571]">
                    <span className="font-medium text-[#0F766E] capitalize">{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.locationName}</span>
                    {item.aqiAtSave !== null && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">US AQI {Math.round(item.aqiAtSave)}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{formatTimestamp(item.savedAt)}</span>
                  </div>
                  <h4 className="font-display text-sm font-semibold text-[#0F1F1C]">{item.title}</h4>
                  <p className="text-xs sm:text-sm text-[#445652] whitespace-pre-wrap leading-relaxed">
                    {item.body}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveSavedItem(item.id)}
                  aria-label={`Remove saved recommendation ${item.title}`}
                  className="p-2 text-[#647571] hover:text-[#B91C1C] rounded-md shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
