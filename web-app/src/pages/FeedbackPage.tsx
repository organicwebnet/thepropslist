import React, { useState } from 'react';
import DashboardLayout from '../PropsBibleHomepage';

const FeedbackPage: React.FC = () => {
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feedback'>('bug');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setFeedback('');
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl mx-auto py-10">
        <h1 className="text-2xl font-bold mb-6 text-white">Send Feedback or Report a Bug</h1>
        <form onSubmit={handleSubmit} className="bg-pb-darker/60 rounded-xl p-6 border border-pb-primary/20">
          <div className="mb-4">
            <label className="block text-pb-gray text-xs mb-1">Type</label>
            <select
              className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
              value={feedbackType}
              onChange={e => setFeedbackType(e.target.value as 'bug' | 'feedback')}
            >
              <option value="bug">Bug</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-pb-gray text-xs mb-1">Message</label>
            <textarea
              className="w-full p-2 rounded bg-pb-darker text-white border border-pb-gray focus:outline-none focus:border-pb-primary"
              rows={4}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-pb-primary text-white font-semibold shadow hover:bg-pb-secondary transition-colors"
            disabled={submitted || !feedback.trim()}
          >
            {submitted ? 'Submitted!' : 'Submit'}
          </button>
          {submitted && <div className="mt-2 text-green-400 font-semibold">Thank you for your {feedbackType}!</div>}
        </form>
      </div>
    </DashboardLayout>
  );
};

export default FeedbackPage; 