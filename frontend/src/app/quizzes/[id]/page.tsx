'use client';
import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Clock, Check, X, Award, AlertCircle } from 'lucide-react';

interface Question {
  id: string;
  text: string;
  type: string;
  optionsJson: string[];
}

interface QuizDetails {
  id: string;
  title: string;
  timeLimitMin: number;
  passScore: number;
  quizQuestions: {
    question: Question;
  }[];
}

export default function QuizAttemptPage() {
  const [quiz, setQuiz] = useState<QuizDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);

  // Result states
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchQuizDetails = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const response = await fetch(`${apiUrl}/quizzes/${quizId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Сорилын агуулгыг татахад алдаа гарлаа');
        }

        const data = await response.json();
        setQuiz(data);
        setTimeLeft(data.timeLimitMin * 60);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizDetails();
  }, [quizId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || result) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, result]);

  const handleSelectOption = (questionId: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: text,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (typeof window === 'undefined' || !quiz) return;
    setSubmitting(true);

    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      const response = await fetch(`${apiUrl}/quizzes/${quiz.id}/attempt`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answersJson: answers,
        }),
      });

      if (!response.ok) {
        throw new Error('Сорилыг илгээхэд алдаа гарлаа');
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <span className="text-sm font-semibold text-slate-500 animate-pulse">Сорилыг ачаалж байна...</span>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-rose-600 font-semibold mb-4">Алдаа: {error || 'Сорил олдсонгүй'}</p>
        <button onClick={() => router.back()} className="text-sm text-teal-500 font-bold hover:underline">
          Буцах
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-slate-900 text-white py-4 px-6 md:px-12 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <span className="text-[9px] font-extrabold text-teal-400 uppercase tracking-widest">Мэргэжлийн Үнэлгээ</span>
            <h1 className="font-bold text-sm leading-tight">{quiz.title}</h1>
          </div>
        </div>

        {!result && (
          <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold font-mono">{formatTime(timeLeft)}</span>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl mx-auto w-full py-12 px-6">
        {result ? (
          /* Result Review Screen */
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-sm space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 dark:bg-teal-950/20 flex items-center justify-center">
                <Award className="w-8 h-8 text-teal-500" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">Сорилын Дүн</h2>
              <div className="flex justify-center gap-8 py-2">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Нийт оноо</p>
                  <p className="text-3xl font-black text-slate-800 dark:text-slate-200">{result.score} / 100</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CBT Үнэлгээ</p>
                  <p className={`text-3xl font-black ${result.passed ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {result.cbtResult === 'COMPETENT' ? 'COMPETENT (Тэнцсэн)' : 'NOT COMPETENT (Тэнцээгүй)'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => router.back()}
                  className="bg-slate-900 hover:bg-slate-800 text-white py-3 px-6 rounded-2xl text-xs font-bold transition-all"
                >
                  Хичээл рүү буцах
                </button>
              </div>
            </div>

            {/* Questions Review list */}
            <div className="space-y-6">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-white uppercase tracking-wider pl-2">Асуултуудын хураангуй</h3>
              {quiz.quizQuestions.map((qq, index) => {
                const q = qq.question;
                const studentAns = answers[q.id] || '(Бөглөөгүй)';
                // In result response from backend, we get evaluated questions metadata/correct answers/explanations
                const evaluation = result.evaluations?.[q.id] || {};
                const isCorrect = evaluation.isCorrect;

                return (
                  <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-white">
                        {index + 1}. {q.text}
                      </h4>
                      {isCorrect ? (
                        <span className="bg-emerald-50 text-emerald-600 p-1.5 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4" />
                        </span>
                      ) : (
                        <span className="bg-rose-50 text-rose-500 p-1.5 rounded-full flex items-center justify-center">
                          <X className="w-4 h-4" />
                        </span>
                      )}
                    </div>

                    <div className="text-xs space-y-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl">
                      <p className="text-slate-600 dark:text-slate-300">
                        <strong>Таны хариулт:</strong> {studentAns}
                      </p>
                      {!isCorrect && (
                        <p className="text-emerald-600 font-semibold">
                          <strong>Зөв хариулт:</strong> {evaluation.correctAnswer}
                        </p>
                      )}
                      {evaluation.explanation && (
                        <p className="text-slate-400 italic text-[11px] mt-2">
                          <strong>Тайлбар:</strong> {evaluation.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Quiz Question Attempt Screen */
          <div className="space-y-8">
            {quiz.quizQuestions.map((qq, index) => {
              const q = qq.question;
              return (
                <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                    {index + 1}. {q.text}
                  </h3>

                  {q.type === 'SHORT_ANSWER' ? (
                    <div>
                      <input
                        type="text"
                        value={answers[q.id] || ''}
                        onChange={(e) => handleTextChange(q.id, e.target.value)}
                        placeholder="Хариултаа энд тоогоор эсвэл үгээр бичнэ үү"
                        className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 rounded-2xl focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-3">
                      {q.optionsJson.map((option) => {
                        const isSelected = answers[q.id] === option;
                        return (
                          <button
                            key={option}
                            onClick={() => handleSelectOption(q.id, option)}
                            className={`w-full text-left p-4 rounded-2xl text-xs font-semibold border transition-all duration-150 flex items-center justify-between ${
                              isSelected
                                ? 'border-teal-500 bg-teal-50/30 text-teal-700 dark:text-teal-400 dark:bg-teal-950/20'
                                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900'
                            }`}
                          >
                            <span>{option}</span>
                            {isSelected && <Check className="w-4 h-4 text-teal-500" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end p-4">
              <button
                onClick={handleSubmitQuiz}
                disabled={submitting}
                className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-8 rounded-2xl text-sm transition-all disabled:opacity-50"
              >
                {submitting ? 'Илгээж байна...' : 'Сорилыг дуусгах'}
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        © 2026 "Гурвантамир" Политехник Коллеж LMS
      </footer>
    </div>
  );
}
