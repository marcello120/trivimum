import React from 'react';
import { Quiz } from '@/lib/questions';
import { RefreshCw } from 'lucide-react';

interface CurrentQuizInfoProps {
  quiz: Quiz;
  operationInProgress: string | null;
  onClearQuizSelection: () => void;
}

export function CurrentQuizInfo({
  quiz,
  operationInProgress,
  onClearQuizSelection,
}: CurrentQuizInfoProps) {
  return (
    <div className="p-4 bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-t border-blue-500/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {quiz.title}
            </h3>
            <p className="text-blue-200 text-sm">
              {quiz.questions.length} questions • {quiz.description}
            </p>
          </div>
        </div>
        <button
          onClick={onClearQuizSelection}
          disabled={!!operationInProgress}
          className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200 flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}