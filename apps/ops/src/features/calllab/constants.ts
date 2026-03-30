import type { CallStage, Scenario } from './types';

export const suggestedPrompts: Scenario[] = [
  {
    id: 'book',
    label: 'Book in',
    subtitle: 'Ask for the next appointment.',
    prompt: 'Hi, I need to book an appointment for lower back pain this week.',
  },
  {
    id: 'reschedule',
    label: 'Move a booking',
    subtitle: 'Shift an existing appointment.',
    prompt: 'I need to move my appointment tomorrow because I have a meeting.',
  },
  {
    id: 'late',
    label: 'Running late',
    subtitle: 'Let the clinic know you are behind.',
    prompt: 'I am running about ten minutes late for my physio appointment.',
  },
  {
    id: 'routing',
    label: 'Who should I see?',
    subtitle: 'Ask who is the best fit.',
    prompt: 'I am not sure whether I should see the physio or the chiro.',
  },
];

export const initialStatusCopy: Record<CallStage, string> = {
  idle: 'Ready to ring the clinic.',
  connecting: 'Connecting the call.',
  live: 'Listening now.',
  responding: 'Replying now.',
  ended: 'Call finished.',
  error: 'Something went wrong.',
};

export const waveformProfile = [0.42, 0.68, 0.52, 0.84, 0.48, 0.72, 0.4, 0.9, 0.55, 0.76];
