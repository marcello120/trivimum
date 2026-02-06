import React from 'react';
import { Quiz } from '@/lib/questions';
import { SkipBack } from 'lucide-react';

interface QuizPreviewProps {
  quiz: Quiz;
  onBackToAdmin: () => void;
}

export function QuizPreview({ quiz, onBackToAdmin }: QuizPreviewProps) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-b border-gray-700 p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBackToAdmin}
              className="mb-4 flex items-center text-blue-400 hover:text-blue-300 transition-colors"
            >
              <SkipBack className="w-4 h-4 mr-2" />
              Back to Admin Panel
            </button>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Preview: {quiz.title}
            </h1>
            <p className="text-gray-300 mt-2">
              {quiz.questions.length} questions • {quiz.description}
            </p>
          </div>
        </div>
      </div>

      {/* Questions List */}
      <div className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          {quiz.questions.map((question, index) => (
            <div key={question.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4">
                    {index + 1}
                  </div>
                  <div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      question.type === 'MCQ'
                        ? 'bg-green-900/50 text-green-300 border border-green-500/30'
                        : 'bg-blue-900/50 text-blue-300 border border-blue-500/30'
                    }`}>
                      {question.type === 'MCQ' ? 'Multiple Choice' : 'Text Answer'}
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold mb-4 text-white leading-relaxed">
                {question.text}
              </h3>

              {question.type === 'MCQ' && question.options && (
                <div>
                  <p className="text-sm text-gray-400 mb-3">Options:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {question.options.map((option, optionIndex) => {
                      const correctAnswers = Array.isArray(question.correctAnswer)
                        ? question.correctAnswer
                        : [question.correctAnswer];
                      const isCorrect = correctAnswers.includes(option);

                      return (
                        <div
                          key={optionIndex}
                          className={`p-3 rounded-lg border transition-colors ${
                            isCorrect
                              ? 'bg-green-900/30 border-green-500/50 text-green-100'
                              : 'bg-gray-700/50 border-gray-600 text-gray-300'
                          }`}
                        >
                          <div className="flex items-center">
                            <span className="font-mono text-sm mr-3">
                              {String.fromCharCode(65 + optionIndex)}
                            </span>
                            <span>{option}</span>
                            {isCorrect && <span className="ml-auto text-green-400">✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {question.type === 'TEXT' && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Correct Answer(s):</p>
                  <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3">
                    <span className="text-green-100">
                      {Array.isArray(question.correctAnswer)
                        ? question.correctAnswer.join(', ')
                        : question.correctAnswer}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={onBackToAdmin}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center"
          >
            <SkipBack className="w-5 h-5 mr-2" />
            Back to Admin Panel
          </button>
        </div>
      </div>
    </div>
  );
}