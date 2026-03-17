import type { EventCategory, NoteColor } from '../types';

export const CATEGORY_COLORS: Record<EventCategory, { bg: string; text: string }> = {
  work: { bg: '#E6F1FB', text: '#0C447C' },
  personal: { bg: '#EAF3DE', text: '#27500A' },
  milestone: { bg: '#FCEBEB', text: '#791F1F' },
  design: { bg: '#EEEDFE', text: '#3C3489' },
  review: { bg: '#FAEEDA', text: '#633806' },
  deadline: { bg: '#FAECE7', text: '#712B13' },
  meeting: { bg: '#FBEAF0', text: '#72243E' },
  other: { bg: '#F1EFE8', text: '#444441' },
};

export const NOTE_COLORS: Record<NoteColor, { bg: string; text: string }> = {
  yellow: { bg: '#FAEEDA', text: '#633806' },
  blue: { bg: '#E6F1FB', text: '#0C447C' },
  green: { bg: '#EAF3DE', text: '#27500A' },
  pink: { bg: '#FBEAF0', text: '#72243E' },
};
