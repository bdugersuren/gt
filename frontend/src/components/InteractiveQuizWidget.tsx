'use client';
import React, { useState } from 'react';
import { CheckCircle2, XCircle, Lock, HelpCircle } from 'lucide-react';

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface InteractiveQuizWidgetProps {
  quizId: string;
  quizData?: QuizQuestion;
  isUnlocked: boolean;
  onSuccess: () => void;
  isCompleted: boolean;
}

// Fallback quiz data if not provided dynamically
const fallbackQuizzes: Record<string, QuizQuestion> = {
  'quiz-1': {
    question: 'Бинар хайлтын модонд (BST) үндэс зангилаанаас бага утгыг аль дэд мод руу нэмэх вэ?',
    options: ['Зүүн дэд мод (Left subtree)', 'Баруун дэд мод (Right subtree)', 'Хоёр талд зэрэг', 'Дээд түвшинд'],
    answer: 'Зүүн дэд мод (Left subtree)',
    explanation: 'BST-ийн үндсэн дүрэм ёсоор эх зангилаанаас бага утгатай бүх элементийг зүүн дэд модонд байрлуулдаг.'
  },
  'quiz-2': {
    question: 'Тэнцвэртэй Бинар хайлтын модонд (BST) шинэ утга оруулах хугацааны хүндрэл (Time Complexity) ямар байдаг вэ?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
    answer: 'O(log n)',
    explanation: 'Тэнцвэртэй BST-ийн өндөр нь log n байх тул хайлт болон оруулах үйлдэл O(log n) хугацаанд хийгдэнэ.'
  },
  'quiz-vid-1': {
    question: 'Видеоны энэ хэсэгт тайлбарласанчлан, бинар хайлтын модны хамгийн зүүн талын элемент ямар утгатай байх вэ?',
    options: ['Хамгийн их утгатай', 'Хамгийн бага утгатай', 'Тэг утгатай', 'Дундаж утгатай'],
    answer: 'Хамгийн бага утгатай',
    explanation: 'Модны зүүн тал руу зөвхөн бага утгуудыг нэмдэг тул хамгийн зүүн талын зангилаа нь модон доторх хамгийн бага утгатай байна.'
  },
  'quiz-pdf-1': {
    question: 'PDF гарын авлагын дараагийн хуудсыг үзэхийн тулд: Модонд оруулах үйлдэл (insertion)-ийг рекурсив бишээр (iterative) хэрэгжүүлэх боломжтой юу?',
    options: ['Тийм, давталт (while) ашиглан хийж болно', 'Үгүй, зөвхөн рекурсивээр хийх боломжтой', 'Зөвхөн стек ашиглан хийнэ'],
    answer: 'Тийм, давталт (while) ашиглан хийж болно',
    explanation: 'Рекурсив дуудалтыг энгийн while давталт болон заагчаар солих замаар санах ойн хэрэглээг хэмнэх боломжтой.'
  }
};

export default function InteractiveQuizWidget({
  quizId,
  quizData,
  isUnlocked,
  onSuccess,
  isCompleted
}: InteractiveQuizWidgetProps) {
  const data = quizData || fallbackQuizzes[quizId] || {
    question: `Quiz #${quizId}: Өөрийгөө шалгах сорилын асуулт`,
    options: ['Зөв хариулт', 'Буруу хариулт А', 'Буруу хариулт Б'],
    answer: 'Зөв хариулт',
    explanation: 'Энэ бол жишээ тайлбар юм.'
  };

  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (selected === data.answer) {
      setSubmitted(true);
      setError(false);
      onSuccess();
    } else {
      setError(true);
    }
  };

  if (!isUnlocked) {
    return (
      <div className="p-5 my-4 bg-slate-100/50 dark:bg-slate-900/30 border border-slate-200/40 dark:border-slate-800/80 rounded-xl flex items-center gap-3 opacity-60">
        <Lock className="w-5 h-5 text-slate-450 shrink-0" />
        <div className="text-xs">
          <p className="font-bold text-slate-500">Сорил цоожтой байна</p>
          <p className="text-slate-400">Өмнөх агуулгыг судалж дууссаны дараа энэ сорил нээгдэнэ.</p>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="p-5 my-4 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/80 dark:border-emerald-900/50 rounded-xl">
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>СОРЫЛД АМЖИЛТТАЙ ХАРИУЛСАН</span>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{data.question}</p>
        <p className="text-[10px] text-slate-500 mt-2 italic">Зөв хариулт: {data.answer}</p>
        {data.explanation && (
          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
            {data.explanation}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 my-4 bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900/40 rounded-xl shadow-md space-y-4 transition-all hover:border-orange-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-500 uppercase tracking-wider">
          <HelpCircle className="w-4 h-4 text-orange-500" />
          <span>Интерактив сорил</span>
        </div>
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
          {quizId}
        </span>
      </div>

      <p className="text-xs md:text-sm font-bold text-slate-800 dark:text-white leading-snug">
        {data.question}
      </p>

      <div className="space-y-2">
        {data.options.map((option, i) => (
          <button
            key={i}
            onClick={() => setSelected(option)}
            className={`w-full text-left p-3 text-xs rounded-xl border transition-all duration-200 ${
              selected === option
                ? 'border-orange-500 bg-orange-50/20 text-orange-600 dark:text-orange-400 font-bold shadow-sm shadow-orange-500/5'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-xs bg-rose-50 dark:bg-rose-950/20 text-rose-600 border border-rose-100 dark:border-rose-900/50">
          <XCircle className="w-4.5 h-4.5" />
          <span>Хариулт буруу байна. Дахин оролдож үзнэ үү!</span>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selected}
        className="w-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/10 disabled:opacity-50"
      >
        Хариулт шалгах
      </button>
    </div>
  );
}
