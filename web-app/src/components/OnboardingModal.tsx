import React, { useState } from 'react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreateShow: () => void;
  onInviteTeam: () => void;
  onAddProp: () => void;
  onOpenBoard: () => void;
};

export const OnboardingModal: React.FC<Props> = ({ isOpen, onClose, onCreateShow, onInviteTeam, onAddProp, onOpenBoard }) => {
  const [step, setStep] = useState(0);
  if (!isOpen) return null;
  const next = () => setStep(s => Math.min(s + 1, 3));
  const prev = () => setStep(s => Math.max(s - 1, 0));
  const done = () => { localStorage.setItem('onboarded', '1'); onClose(); };

  const steps = [
    {
      title: 'Create your first show',
      body: 'A show is the workspace where you add props, containers, and tasks.',
      cta: { label: 'Create Show', action: onCreateShow }
    },
    {
      title: 'Invite your team',
      body: 'Add collaborators so they can view and edit the show.',
      cta: { label: 'Invite Team', action: onInviteTeam }
    },
    {
      title: 'Add your first prop',
      body: 'Start your inventory by adding a prop. You can add images and notes.',
      cta: { label: 'Add Prop', action: onAddProp }
    },
    {
      title: 'Explore the task board',
      body: 'Use the Kanban board to plan, assign, and track work.',
      cta: { label: 'Open Task Board', action: onOpenBoard }
    }
  ];

  const s = steps[step];

  return (
    <div className="fixed inset-0 z-[1000] bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-pb-darker/90 border border-pb-primary/20 rounded-2xl p-6 text-white">
        <div className="text-xl font-bold mb-2">{s.title}</div>
        <div className="text-pb-gray mb-4">{s.body}</div>
        <div className="flex gap-2 mb-6">
          <button className="px-4 py-2 rounded bg-pb-primary hover:bg-pb-accent" onClick={() => { s.cta.action(); done(); }}>
            {s.cta.label}
          </button>
          <button className="px-4 py-2 rounded bg-pb-darker/60 border border-pb-primary/20" onClick={done}>Skip</button>
        </div>
        <div className="flex items-center justify-between">
          <button className="text-pb-gray" disabled={step === 0} onClick={prev}>Back</button>
          <div className="text-sm text-pb-gray">Step {step + 1} of {steps.length}</div>
          <button className="text-pb-gray" disabled={step === steps.length - 1} onClick={next}>Next</button>
        </div>
      </div>
    </div>
  );
};


