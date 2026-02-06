import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Quiz, saveQuiz } from '@/lib/questions';
import { Question } from '@/types';
import {
  SkipBack,
  Save,
  RotateCcw,
  Edit3,
  Plus,
  Trash2,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface EditableQuizPreviewProps {
  quiz: Quiz;
  onBackToAdmin: () => void;
}

interface EditState {
  hasChanges: boolean;
  isSaving: boolean;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  lastSaved: Date | null;
}

export function EditableQuizPreview({ quiz: originalQuiz, onBackToAdmin }: EditableQuizPreviewProps) {
  const [editedQuiz, setEditedQuiz] = useState<Quiz>(originalQuiz);
  const [editState, setEditState] = useState<EditState>({
    hasChanges: false,
    isSaving: false,
    saveStatus: 'idle',
    lastSaved: null,
  });

  const editedQuizRef = useRef(editedQuiz);
  const localStorageKey = `quiz-draft-${originalQuiz.id}`;

  // Keep ref in sync with state
  useEffect(() => {
    editedQuizRef.current = editedQuiz;
  }, [editedQuiz]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem(localStorageKey);
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        setEditedQuiz(parsedDraft);
        setEditState(prev => ({ ...prev, hasChanges: true }));
      } catch (error) {
        console.error('Failed to parse quiz draft from localStorage:', error);
      }
    }
  }, [localStorageKey]);

  // Auto-save to localStorage when quiz changes
  const autoSave = useCallback((quiz: Quiz) => {
    try {
      localStorage.setItem(localStorageKey, JSON.stringify(quiz));
      setEditState(prev => ({ ...prev, hasChanges: true }));
    } catch (error) {
      console.error('Failed to save quiz draft to localStorage:', error);
    }
  }, [localStorageKey]);

  // Update quiz title
  const updateTitle = useCallback((title: string) => {
    setEditedQuiz(prev => {
      const updated = { ...prev, title };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Update quiz description
  const updateDescription = useCallback((description: string) => {
    setEditedQuiz(prev => {
      const updated = { ...prev, description };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Update question text
  const updateQuestionText = useCallback((questionIndex: number, text: string) => {
    setEditedQuiz(prev => {
      const updated = {
        ...prev,
        questions: prev.questions.map((q, i) =>
          i === questionIndex ? { ...q, text } : q
        )
      };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Update question type
  const updateQuestionType = useCallback((questionIndex: number, type: 'MCQ' | 'TEXT') => {
    setEditedQuiz(prev => {
      const updated = {
        ...prev,
        questions: prev.questions.map((q, i) => {
          if (i !== questionIndex) return q;

          const updatedQuestion = { ...q, type };

          // Reset options and correct answer when switching types
          if (type === 'TEXT') {
            delete updatedQuestion.options;
            updatedQuestion.correctAnswer = '';
          } else {
            updatedQuestion.options = ['Option A', 'Option B', 'Option C', 'Option D'];
            updatedQuestion.correctAnswer = 'Option A';
          }

          return updatedQuestion;
        })
      };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Update MCQ option
  const updateOption = useCallback((questionIndex: number, optionIndex: number, value: string) => {
    setEditedQuiz(prev => {
      const updated = {
        ...prev,
        questions: prev.questions.map((q, i) => {
          if (i !== questionIndex || !q.options) return q;

          const newOptions = [...q.options];
          newOptions[optionIndex] = value;

          return { ...q, options: newOptions };
        })
      };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Add new MCQ option
  const addOption = useCallback((questionIndex: number) => {
    setEditedQuiz(prev => {
      const updated = {
        ...prev,
        questions: prev.questions.map((q, i) => {
          if (i !== questionIndex || !q.options) return q;

          return {
            ...q,
            options: [...q.options, `Option ${String.fromCharCode(65 + q.options.length)}`]
          };
        })
      };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Remove MCQ option
  const removeOption = useCallback((questionIndex: number, optionIndex: number) => {
    setEditedQuiz(prev => {
      const updated = {
        ...prev,
        questions: prev.questions.map((q, i) => {
          if (i !== questionIndex || !q.options || q.options.length <= 2) return q;

          const newOptions = q.options.filter((_, oi) => oi !== optionIndex);
          return { ...q, options: newOptions };
        })
      };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Update correct answer
  const updateCorrectAnswer = useCallback((questionIndex: number, answer: string | string[]) => {
    setEditedQuiz(prev => {
      const updated = {
        ...prev,
        questions: prev.questions.map((q, i) =>
          i === questionIndex ? { ...q, correctAnswer: answer } : q
        )
      };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Add new question
  const addQuestion = useCallback(() => {
    setEditedQuiz(prev => {
      const newQuestion: Question = {
        id: Math.max(...prev.questions.map(q => q.id), 0) + 1,
        text: 'New Question',
        type: 'TEXT',
        correctAnswer: ''
      };

      const updated = {
        ...prev,
        questions: [...prev.questions, newQuestion]
      };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Remove question
  const removeQuestion = useCallback((questionIndex: number) => {
    setEditedQuiz(prev => {
      if (prev.questions.length <= 1) return prev; // Keep at least one question

      const updated = {
        ...prev,
        questions: prev.questions.filter((_, i) => i !== questionIndex)
      };
      autoSave(updated);
      return updated;
    });
  }, [autoSave]);

  // Save to database
  const handleSave = useCallback(async () => {
    setEditState(prev => ({ ...prev, isSaving: true, saveStatus: 'saving' }));

    try {
      const success = await saveQuiz(editedQuizRef.current);

      if (success) {
        localStorage.removeItem(localStorageKey);
        setEditState({
          hasChanges: false,
          isSaving: false,
          saveStatus: 'success',
          lastSaved: new Date()
        });

        // Clear success status after 3 seconds
        setTimeout(() => {
          setEditState(prev => prev.saveStatus === 'success' ? { ...prev, saveStatus: 'idle' } : prev);
        }, 3000);
      } else {
        setEditState(prev => ({
          ...prev,
          isSaving: false,
          saveStatus: 'error'
        }));
      }
    } catch (error) {
      console.error('Failed to save quiz:', error);
      setEditState(prev => ({
        ...prev,
        isSaving: false,
        saveStatus: 'error'
      }));
    }
  }, [localStorageKey]);

  // Discard changes
  const handleDiscard = useCallback(() => {
    localStorage.removeItem(localStorageKey);
    setEditedQuiz(originalQuiz);
    setEditState({
      hasChanges: false,
      isSaving: false,
      saveStatus: 'idle',
      lastSaved: null
    });
  }, [localStorageKey, originalQuiz]);

  const getStatusIcon = () => {
    switch (editState.saveStatus) {
      case 'saving':
        return <Loader2 className="w-4 h-4 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Edit3 className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header with Save/Discard Controls */}
      <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-gray-800 border-b border-gray-700 p-6 shadow-xl sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <button
              onClick={onBackToAdmin}
              className="mb-4 flex items-center text-blue-400 hover:text-blue-300 transition-colors"
            >
              <SkipBack className="w-4 h-4 mr-2" />
              Back to Admin Panel
            </button>

            {/* Editable Title */}
            <div className="relative group w-full">
              <input
                type="text"
                value={editedQuiz.title}
                onChange={(e) => updateTitle(e.target.value)}
                className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent placeholder-gray-500 w-full px-3 py-2 rounded-lg border-2 border-gray-600/50 focus:border-blue-500/50 focus:outline-none transition-all duration-200 hover:bg-gray-800/30 focus:bg-gray-800/50"
                placeholder="Quiz Title"
              />
              <Edit3 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
            </div>

            {/* Editable Description */}
            <div className="mt-2 flex items-center text-gray-300">
              <span>{editedQuiz.questions.length} questions • </span>
              <div className="relative group flex-1">
                <input
                  type="text"
                  value={editedQuiz.description}
                  onChange={(e) => updateDescription(e.target.value)}
                  className="ml-1 w-full px-2 py-1 rounded border border-gray-600/50 focus:border-blue-500/50 focus:outline-none transition-all duration-200 bg-transparent hover:bg-gray-800/30 focus:bg-gray-800/50 placeholder-gray-500 text-gray-300"
                  placeholder="Quiz description"
                />
                <Edit3 className="absolute right-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />
              </div>
            </div>
          </div>

        </div>
        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            {getStatusIcon()}
            {editState.saveStatus === 'saving' && <span>Saving...</span>}
            {editState.saveStatus === 'success' && <span className="text-green-500">Saved!</span>}
            {editState.saveStatus === 'error' && <span className="text-red-500">Save failed</span>}
            {editState.hasChanges && editState.saveStatus === 'idle' && <span>Unsaved changes</span>}
          </div>

          {editState.hasChanges && (
              <button
                  onClick={handleDiscard}
                  disabled={editState.isSaving}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Discard
              </button>
          )}

          <button
              onClick={handleSave}
              disabled={!editState.hasChanges || editState.isSaving}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2 font-semibold"
          >
            <Save className="w-4 h-4" />
            {editState.isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editable Questions List */}
      <div className="p-6 max-w-4xl mx-auto">
        <div className="space-y-6">
          {editedQuiz.questions.map((question, questionIndex) => (
            <div key={question.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center flex-1">
                  <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mr-4 flex-shrink-0">
                    {questionIndex + 1}
                  </div>

                  {/* Question Type Selector */}
                  <select
                    value={question.type}
                    onChange={(e) => updateQuestionType(questionIndex, e.target.value as 'MCQ' | 'TEXT')}
                    className="px-2 py-1 rounded text-xs font-medium bg-gray-700 border border-gray-600 text-white mr-4"
                  >
                    <option value="MCQ">Multiple Choice</option>
                    <option value="TEXT">Text Answer</option>
                  </select>
                </div>

                {/* Remove Question Button */}
                {editedQuiz.questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(questionIndex)}
                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Editable Question Text */}
              <textarea
                value={question.text}
                onChange={(e) => updateQuestionText(questionIndex, e.target.value)}
                className="w-full text-xl font-semibold mb-4 text-white leading-relaxed bg-transparent border border-gray-600 rounded-lg p-3 resize-none focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Question text"
                rows={2}
              />

              {/* MCQ Options Editor */}
              {question.type === 'MCQ' && question.options && (
                <div>
                  <p className="text-sm text-gray-400 mb-3">Options:</p>
                  <div className="space-y-2 mb-4">
                    {question.options.map((option, optionIndex) => {
                      const correctAnswers = Array.isArray(question.correctAnswer)
                        ? question.correctAnswer
                        : [question.correctAnswer];
                      const isCorrect = correctAnswers.includes(option);

                      return (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`correct-${question.id}`}
                            checked={isCorrect}
                            onChange={() => updateCorrectAnswer(questionIndex, option)}
                            className="text-green-500"
                          />
                          <span className="font-mono text-sm w-6">
                            {String.fromCharCode(65 + optionIndex)}
                          </span>
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => updateOption(questionIndex, optionIndex, e.target.value)}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            placeholder="Option text"
                          />
                          {question.options!.length > 2 && (
                            <button
                              onClick={() => removeOption(questionIndex, optionIndex)}
                              className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                              title="Remove option"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => addOption(questionIndex)}
                    className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Option
                  </button>
                </div>
              )}

              {/* TEXT Answer Editor */}
              {question.type === 'TEXT' && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Correct Answer(s) (separate multiple answers with commas):</p>
                  <input
                    type="text"
                    value={Array.isArray(question.correctAnswer)
                      ? question.correctAnswer.join(', ')
                      : question.correctAnswer}
                    onChange={(e) => {
                      const answers = e.target.value.split(',').map(a => a.trim()).filter(Boolean);
                      updateCorrectAnswer(questionIndex, answers.length > 1 ? answers : e.target.value);
                    }}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Enter correct answer(s)"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Question Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={addQuestion}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Question
          </button>
        </div>
      </div>
    </div>
  );
}