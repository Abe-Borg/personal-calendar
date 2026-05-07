import type { NoteColor } from '../types';

export const NOTE_COLORS: Record<NoteColor, { bg: string; text: string }> = {
  yellow: { bg: '#FAEEDA', text: '#633806' },
  blue: { bg: '#E6F1FB', text: '#0C447C' },
  green: { bg: '#EAF3DE', text: '#27500A' },
  pink: { bg: '#FBEAF0', text: '#72243E' },
};
