/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import InterviewSession from './components/InterviewSession';
import ErrorBoundary from './components/ErrorBoundary';

export default function App() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <ErrorBoundary>
        <InterviewSession />
      </ErrorBoundary>
    </div>
  );
}
