import React from 'react';
import { Quiz } from '@/lib/questions';
import { Eye, MessageSquare, Edit3, Plus } from 'lucide-react';

interface QuizSelectionProps {
  availableQuizzes: Quiz[];
  operationInProgress: string | null;
  onSelectQuiz: (quizId: string) => void;
  onPreviewQuestions: (quizId: string) => void | Promise<void>;
  onEditQuiz?: (quizId: string) => void | Promise<void>;
  onCreateNewQuiz?: () => void | Promise<void>;
}

export function QuizSelection({
  availableQuizzes,
  operationInProgress,
  onSelectQuiz,
  onPreviewQuestions,
  onEditQuiz,
  onCreateNewQuiz,
}: QuizSelectionProps) {
  return (
    <div className="p-4 border-b border-gray-700 bg-gray-800/50">

      {/* Create New Quiz Button */}
      {onCreateNewQuiz && (
        <div className="mb-6">
          <button
            onClick={onCreateNewQuiz}
            disabled={!!operationInProgress}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl transition-all duration-200 font-semibold flex items-center justify-center gap-3 border border-green-500/30 hover:border-green-400/50 shadow-lg shadow-green-600/20"
          >
            <Plus className="w-5 h-5" />
            Create New Quiz
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {availableQuizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 rounded-xl p-6 text-left transition-all duration-300 group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="bg-blue-500 group-hover:bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center transition-colors duration-300">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-400">
                  {quiz.questions.length} questions
                </span>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-2">
              {quiz.title}
            </h3>

            <p className="text-sm text-gray-400 leading-relaxed mb-4">
              {quiz.description}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => onSelectQuiz(quiz.id)}
                disabled={!!operationInProgress}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-3 rounded-lg transition-colors duration-200 font-medium"
              >
                Select
              </button>
              <button
                onClick={() => onPreviewQuestions(quiz.id)}
                disabled={!!operationInProgress}
                className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
                title="Preview Questions"
              >
                <Eye className="w-4 h-4" />
              </button>
              {onEditQuiz && (
                <button
                  onClick={() => onEditQuiz(quiz.id)}
                  disabled={!!operationInProgress}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2 px-3 rounded-lg transition-colors duration-200 flex items-center justify-center"
                  title="Edit Quiz"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}