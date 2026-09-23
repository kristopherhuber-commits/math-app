// The parent's settings for every screen (R-PAR-5), loaded by App and reloaded after the parent area.
import { createContext, useContext } from 'react';
import type { Settings } from '../data/db';
import { defaultSettings } from '../data/settings';

const SettingsContext = createContext<Settings>(defaultSettings());
export const SettingsProvider = SettingsContext.Provider;
export const useSettings = (): Settings => useContext(SettingsContext);
