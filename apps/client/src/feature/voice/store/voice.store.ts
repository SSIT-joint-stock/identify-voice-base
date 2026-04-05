import { create } from 'zustand';
import { VOICE_TABS } from '@/constants';
import type {
  IdentifyTwoVoiceResponse,
  IdentifyVoiceResponse,
  UploadVoiceResponse,
  VoiceErrorDialogState,
  VoiceIdentifyTwoItem,
} from '../types/voice.types';

type VoiceTabValue = (typeof VOICE_TABS)[keyof typeof VOICE_TABS];

interface VoiceState {
  activeTab: VoiceTabValue;
  uploadResult: UploadVoiceResponse | null;
  identifyResult: IdentifyVoiceResponse | null;
  identifyTwoResult: IdentifyTwoVoiceResponse | null;
  errorDialog: VoiceErrorDialogState;

  setActiveTab: (tab: VoiceTabValue) => void;
  setUploadResult: (payload: UploadVoiceResponse | null) => void;
  setIdentifyResult: (payload: IdentifyVoiceResponse | null) => void;
  setIdentifyTwoResult: (payload: IdentifyTwoVoiceResponse | null) => void;

  resetUploadResult: () => void;
  resetIdentifyResult: () => void;
  resetIdentifyTwoResult: () => void;

  openErrorDialog: (title: string, description: string) => void;
  closeErrorDialog: () => void;
  resetAllResults: () => void;
  updateIdentifyTwoSpeaker: (index: number, item: VoiceIdentifyTwoItem) => void;
}

const initialErrorDialog: VoiceErrorDialogState = {
  open: false,
  title: '',
  description: '',
};

export const useVoiceStore = create<VoiceState>((set) => ({
  activeTab: VOICE_TABS.ENROLL,
  uploadResult: null,
  identifyResult: null,
  identifyTwoResult: null,
  errorDialog: initialErrorDialog,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setUploadResult: (payload) => set({ uploadResult: payload }),
  setIdentifyResult: (payload) => set({ identifyResult: payload }),
  setIdentifyTwoResult: (payload) => set({ identifyTwoResult: payload }),

  resetUploadResult: () => set({ uploadResult: null }),
  resetIdentifyResult: () => set({ identifyResult: null }),
  resetIdentifyTwoResult: () => set({ identifyTwoResult: null }),

  openErrorDialog: (title, description) =>
    set({
      errorDialog: {
        open: true,
        title,
        description,
      },
    }),

  closeErrorDialog: () =>
    set({
      errorDialog: initialErrorDialog,
    }),

  resetAllResults: () =>
    set({
      uploadResult: null,
      identifyResult: null,
      identifyTwoResult: null,
      errorDialog: initialErrorDialog,
    }),
  updateIdentifyTwoSpeaker: (index, item) =>
    set((state) => {
      if (!state.identifyTwoResult) return state;
      const newItems = [...state.identifyTwoResult.items];
      newItems[index] = item;
      return {
        identifyTwoResult: {
          ...state.identifyTwoResult,
          items: newItems,
        },
      };
    }),
}));
