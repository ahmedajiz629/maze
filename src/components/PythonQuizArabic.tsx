import React, { useEffect, useMemo, useState } from 'react';

interface McqQuestion {
  id: number;
  question: string;
  code?: string;
  choices: string[];
  correctIndex: number;
  explanation: string;
}

interface YesNoQuestion {
  id: number;
  question: React.ReactNode;
  correctAnswer: 'نعم' | 'لا';
  explanation: string;
}

interface CodeQuestion {
  id: number;
  title: string;
  prompt: string;
  rubric: string;
  sampleAnswer: string;
}
interface CodeTestConfig {
  publicBody?: string;
  hiddenBody?: string;
}

interface CodeTestResult {
  publicChecked: boolean;
  publicPassed: boolean;
  publicMessage?: string;
  finalChecked: boolean;
  finalPassed: boolean;
  finalMessage?: string;
  output?: string;
  error?: string;
}

const MCQ_QUESTIONS: McqQuestion[] = [
  {
    id: 1,
    question: 'ما الهدف الأساسي من البرمجة؟',
    choices: [
      'جعل الحاسوب أسرع',
      'إعطاء الحاسوب خطوات واضحة لتنفيذ مهمة معينة',
      'تزيين واجهة الحاسوب',
      'تخزين الملفات فقط',
    ],
    correctIndex: 1,
    explanation: 'البرمجة هي طريقة لوصف خطوات ومهام محددة للحاسوب ليقوم بتنفيذها.',
  },
  {
    id: 2,
    question: 'أي الجمل الآتية تمثّل "متغيّرًا"؟',
    choices: ['5', '"مرحبًا"', 'x = 5', 'print("x")'],
    correctIndex: 2,
    explanation: 'المتغيّر هو اسم (مثل x) نخزّن فيه قيمة، مثل x = 5.',
  },
  {
    id: 3,
    question: 'ما نوع القيمة في السطر التالي: value = "Python"؟',
    choices: [
      'عدد صحيح (Integer)',
      'نص/سلسلة (String)',
      'قيمة منطقية (Boolean)',
      'قائمة (List)',
    ],
    correctIndex: 1,
    explanation: 'القيمة "Python" هي نص، أي من نوع String.',
  },
  {
    id: 4,
    question: 'أيّ من الآتي هو مثال على "شرط"؟',
    choices: ['x = 10', 'print(x)', 'if x > 10:', 'x = x + 1'],
    correctIndex: 2,
    explanation: 'الجملة if x > 10: هي جملة شرطية تختبر قيمة x.',
  },
  {
    id: 5,
    question: 'ما الفائدة من استخدام التكرار (الحلقة/اللوب)؟',
    choices: [
      'لتخزين قيم جديدة',
      'لتكرار تنفيذ نفس الأوامر عدّة مرات تلقائيًا',
      'لتحسين شكل الكود فقط',
      'لمنع الأخطاء نهائيًا',
    ],
    correctIndex: 1,
    explanation: 'الحلقة تسمح بتكرار نفس الأوامر عدّة مرات دون كتابة الكود مرات كثيرة.',
  },
  {
    id: 6,
    question: 'في الكود الآتي، كم مرة ستظهر كلمة Hello؟',
    code: 'for i in range(3):\n    print("Hello")',
    choices: ['مرة واحدة', 'مرتين', 'ثلاث مرات', 'لا تظهر أبدًا'],
    correctIndex: 2,
    explanation: 'range(3) تعيد القيم 0 و1 و2، فيتم تنفيذ print ثلاث مرات.',
  },
  {
    id: 7,
    question: 'ما الفائدة الأساسية من استخدام "الدوال"؟',
    choices: [
      'تسريع الحاسوب ماديًا',
      'تقسيم البرنامج إلى أجزاء صغيرة قابلة لإعادة الاستخدام',
      'زيادة طول الكود',
      'منع استخدام المتغيرات',
    ],
    correctIndex: 1,
    explanation:
      'الدوال تساعد على تنظيم الكود في أجزاء صغيرة يمكن إعادة استخدامها بسهولة.',
  },
  {
    id: 8,
    question: 'في الكود الآتي، ما قيمة المتغيّر y بعد التنفيذ؟',
    code: 'x = 3\ny = x + 4',
    choices: ['3', '4', '7', '12'],
    correctIndex: 2,
    explanation: 'بعد التنفيذ تكون قيمة y هي 3 + 4 أي 7.',
  },
  {
    id: 9,
    question: 'أيّ من الآتي يمثّل قيمة منطقية (Boolean) صحيحة؟',
    choices: ['10', '"True"', 'True', '"نعم"'],
    correctIndex: 2,
    explanation: 'في بايثون القيمة المنطقية الصحيحة هي True بدون علامات تنصيص.',
  },
  {
    id: 10,
    question: 'ماذا تفعل الدالة الآتية على مستوى الفكرة؟',
    code: 'def add(a, b):\n    return a + b',
    choices: [
      'تضرب العددين',
      'تجمع العددين',
      'تقسّم العددين',
      'تقارن العددين',
    ],
    correctIndex: 1,
    explanation: 'الدالة add تعيد ناتج a + b أي مجموع العددين.',
  },
];
const CODE_TESTS: Record<number, CodeTestConfig> = {
  21: {
    publicBody: `
func = ns.get("format_greeting")
if not callable(func):
    _result_passed = False
    _result_message = "تأكد من تعريف دالة باسم format_greeting(name, age)."
else:
    try:
        result = func("Ali", 13)
    except Exception as e:
        _result_passed = False
        _result_message = "حدث خطأ عند استدعاء format_greeting: " + repr(e)
    else:
        expected = "Bonjour Ali, tu as 13 ans"
        if isinstance(result, str) and result == expected:
            _result_passed = True
            _result_message = "الدالة format_greeting تُرجع النص بالصيغة الصحيحة."
        else:
            _result_passed = False
            _result_message = "يجب أن تُرجع الدالة النص بالضبط: " + repr(expected)
`,
    hiddenBody: `
func = ns.get("format_greeting")
if not callable(func):
    _result_passed = False
    _result_message = "الاختبارات الإضافية: الدالة format_greeting غير معرّفة."
else:
    cases = [("Sara", 10), ("Omar", 20)]
    ok = True
    for name, age in cases:
        res = func(name, age)
        expected = f"Bonjour {name}, tu as {age} ans"
        if res != expected:
            ok = False
            break
    if ok:
        _result_passed = True
        _result_message = "الاختبارات الإضافية: تعمل format_greeting بشكل صحيح مع قيم مختلفة."
    else:
        _result_passed = False
        _result_message = "الاختبارات الإضافية: تأكد أن النص يستخدم الاسم والعمر الممرَّرين."
`,
  },
  22: {
    publicBody: `
func = ns.get("classify_age")
if not callable(func):
    _result_passed = False
    _result_message = "تأكد من تعريف دالة باسم classify_age(age)."
else:
    try:
        adult = func(18)
        minor = func(10)
    except Exception as e:
        _result_passed = False
        _result_message = "حدث خطأ عند استدعاء classify_age: " + repr(e)
    else:
        if adult == "You are an adult" and minor == "You are a minor":
            _result_passed = True
            _result_message = "الدالة classify_age تُرجع النصوص الصحيحة للحالات البسيطة."
        else:
            _result_passed = False
            _result_message = "تأكد أن الدالة تُرجع بالضبط 'You are an adult' أو 'You are a minor'."
`,
    hiddenBody: `
func = ns.get("classify_age")
if not callable(func):
    _result_passed = False
    _result_message = "الاختبارات الإضافية: الدالة classify_age غير معرّفة."
else:
    tests = [(17, "You are a minor"), (19, "You are an adult"), (0, "You are a minor")]
    ok = True
    for age, expected in tests:
        res = func(age)
        if res != expected:
            ok = False
            break
    if ok:
        _result_passed = True
        _result_message = "الاختبارات الإضافية: تعمل classify_age بشكل صحيح مع أعمار مختلفة."
    else:
        _result_passed = False
        _result_message = "الاختبارات الإضافية: تأكد من منطق الشرط لعمر 18 وما حوله."
`,
  },
  23: {
    publicBody: `
func = ns.get("sum_to_n")
if not callable(func):
    _result_passed = False
    _result_message = "تأكد من تعريف دالة باسم sum_to_n(n)."
else:
    try:
        res = func(5)
    except Exception as e:
        _result_passed = False
        _result_message = "حدث خطأ عند استدعاء sum_to_n: " + repr(e)
    else:
        if res == 15:
            _result_passed = True
            _result_message = "الدالة sum_to_n تُرجع مجموع الأعداد من 1 إلى 5 بشكل صحيح (15)."
        else:
            _result_passed = False
            _result_message = "تأكد أن sum_to_n(5) تُرجع القيمة 15، وليس " + repr(res)
`,
    hiddenBody: `
func = ns.get("sum_to_n")
if not callable(func):
    _result_passed = False
    _result_message = "الاختبارات الإضافية: الدالة sum_to_n غير معرّفة."
else:
    tests = [(1, 1), (3, 6), (10, 55)]
    ok = True
    for n, expected in tests:
        res = func(n)
        if res != expected:
            ok = False
            break
    if ok:
        _result_passed = True
        _result_message = "الاختبارات الإضافية: تعمل sum_to_n بشكل صحيح مع قيم مختلفة لـ n."
    else:
        _result_passed = False
        _result_message = "الاختبارات الإضافية: تأكد من صيغة المجموع 1 + 2 + ... + n."
`,
  },
  24: {
    publicBody: `
func = ns.get("add_two_numbers")
if not callable(func):
    _result_passed = False
    _result_message = "تأكد من تعريف دالة باسم add_two_numbers(a, b)."
else:
    try:
        res = func(3, 7)
    except Exception as e:
        _result_passed = False
        _result_message = "حدث خطأ عند استدعاء add_two_numbers: " + repr(e)
    else:
        if res == 10:
            _result_passed = True
            _result_message = "الدالة add_two_numbers تُرجع مجموع 3 و 7 بشكل صحيح (10)."
        else:
            _result_passed = False
            _result_message = "تأكد أن add_two_numbers(3, 7) تُرجع القيمة 10، وليس " + repr(res)
`,
    hiddenBody: `
func = ns.get("add_two_numbers")
if not callable(func):
    _result_passed = False
    _result_message = "الاختبارات الإضافية: الدالة add_two_numbers غير معرّفة."
else:
    tests = [(0, 0, 0), (1, 2, 3), (-1, 1, 0)]
    ok = True
    for a, b, expected in tests:
        res = func(a, b)
        if res != expected:
            ok = False
            break
    if ok:
        _result_passed = True
        _result_message = "الاختبارات الإضافية: تعمل add_two_numbers بشكل صحيح مع عدة قيم مختلفة."
    else:
        _result_passed = False
        _result_message = "الاختبارات الإضافية: تأكد من أن الدالة تجمع العددين لأي قيم يتم تمريرها لها."
`,
  },
  25: {
    publicBody: `
func = ns.get("even_or_odd")
if not callable(func):
    _result_passed = False
    _result_message = "تأكد من تعريف دالة باسم even_or_odd(n)."
else:
    try:
        r1 = func(2)
        r2 = func(3)
    except Exception as e:
        _result_passed = False
        _result_message = "حدث خطأ عند استدعاء even_or_odd: " + repr(e)
    else:
        if r1 == "2 is even" and r2 == "3 is odd":
            _result_passed = True
            _result_message = "الدالة even_or_odd تُرجع النص الصحيح للأعداد الزوجية والفردية."
        else:
            _result_passed = False
            _result_message = "تأكد أن even_or_odd(n) تُرجع نصًا بالصيغة 'X is even' أو 'X is odd'."
`,
    hiddenBody: `
func = ns.get("even_or_odd")
if not callable(func):
    _result_passed = False
    _result_message = "الاختبارات الإضافية: الدالة even_or_odd غير معرّفة."
else:
    tests = [(1, "1 is odd"), (4, "4 is even"), (10, "10 is even")]
    ok = True
    for n, expected in tests:
        res = func(n)
        if res != expected:
            ok = False
            break
    if ok:
        _result_passed = True
        _result_message = "الاختبارات الإضافية: تعمل even_or_odd بشكل صحيح مع عدة قيم."
    else:
        _result_passed = False
        _result_message = "الاختبارات الإضافية: تأكد من منطق تحديد الزوجي والفردي وصيغة النص النهائية."
`,
  },
};

  const LOCAL_STORAGE_KEY = 'python_quiz_arabic_state_v1';

  const escapeForTripleQuotes = (code: string): string => code.replace(/"""/g, '\"""');

  const buildTestScript = (userCode: string, body: string): string => {
    const escaped = escapeForTripleQuotes(userCode);
    const indentedBody = body.split('\n').map(line => '  ' + line).join('\n');

    return [
      'import sys, io',
      '',
      '_output = io.StringIO()',
      '_old_stdout = sys.stdout',
      'sys.stdout = _output',
      '',
      `user_code = """${escaped}"""`,
      'ns = {}',
      '_result_passed = False',
      '_result_message = ""',
      '',
      'try:',
      '  exec(user_code, ns, ns)',
      '  output_text = _output.getvalue()',
      indentedBody,
      'except Exception as e:',
      '  _result_passed = False',
      '  _result_message = "حدث استثناء أثناء تنفيذ الكود: " + repr(e)',
      'finally:',
      '  sys.stdout = _old_stdout',
      '',
      '(output_text, _result_passed, _result_message)',
    ].join('\n');
  };

  let pyodidePromise: Promise<any> | null = null;

  const getPyodideInstance = async () => {
    if (typeof window === 'undefined') {
    throw new Error('Pyodide غير متاح في هذا السياق.');
    }
    if (!pyodidePromise) {
    const anyWindow = window as any;
    if (!anyWindow.loadPyodide) {
      throw new Error('لم يتم تحميل مكتبة Pyodide بعد.');
    }
    pyodidePromise = anyWindow.loadPyodide();
    }
    return pyodidePromise;
  };

const YES_NO_QUESTIONS: YesNoQuestion[] = [
  {
    id: 11,
    question: 'المتغيّر يمكن أن يغيّر قيمته أثناء عمل البرنامج.',
    correctAnswer: 'نعم',
    explanation: 'من الطبيعي أن تتغيّر قيمة المتغيّر مع تقدّم تنفيذ البرنامج.',
  },
  {
    id: 12,
    question:
      'يمكننا استخدام نفس اسم المتغيّر لأكثر من غرض مختلف في نفس المكان بدون مشاكل منطقية.',
    correctAnswer: 'لا',
    explanation: 'إعادة استخدام نفس الاسم لأغراض مختلفة تربك فهم البرنامج وتسبب أخطاء.',
  },
  {
    id: 13,
    question: 'الجملة الشرطية تسمح للبرنامج أن يختار مسارًا مختلفًا حسب القيم والظروف.',
    correctAnswer: 'نعم',
    explanation: 'الجمل الشرطية مثل if/elif/else تغيّر مسار التنفيذ حسب الحالة.',
  },
  {
    id: 14,
    question:
      'الحلقة (التكرار) يمكن أن تُستخدم لتنفيذ أوامر عدة مرّات حتى يتحقق شرط معيّن.',
    correctAnswer: 'نعم',
    explanation: 'بعض الحلقات مثل while تستمر حتى يتحقق شرط الخروج.',
  },
  {
    id: 15,
    question: 'في برنامج سليم، من الأفضل أن يكون لكل دالة مهمّة واضحة واحدة تقريبًا.',
    correctAnswer: 'نعم',
    explanation: 'كلما كانت مهمة الدالة أوضح وأصغر كان الكود أسهل في الفهم والصيانة.',
  },
  {
    id: 16,
    question: 'في معظم اللغات، "5" (كنص) هي نفس القيمة تمامًا مثل 5 (كعدد).',
    correctAnswer: 'لا',
    explanation: '"5" نص، بينما 5 عدد؛ النوعان مختلفان وإن تشابه المظهر.',
  },
  {
    id: 17,
    question: (
      <>
        في التكرار باستخدام <code>for i in range(5):</code>، فإن المتغيّر i غالبًا ما يأخذ القيم 0 و1 و2 و3 و4.
      </>
    ),
    correctAnswer: 'نعم',
    explanation: 'range(5) تعيد الأعداد من 0 إلى 4 (خمسة أعداد).',
  },
  {
    id: 18,
    question: 'يمكن استخدام الجملة الشرطية داخل حلقة تكرار (شرط داخل لوب).',
    correctAnswer: 'نعم',
    explanation: 'من الشائع جدًا استخدام if داخل حلقات لمعالجة كل عنصر حسب حالته.',
  },
  {
    id: 19,
    question:
      'يمكن للدالة أن تُرجع أنواع قيم مختلفة، لكن ذلك قد يسبب ارتباكًا إذا لم ننظّم الكود جيدًا.',
    correctAnswer: 'نعم',
    explanation:
      'من الممكن تقنيًا، لكن الأفضل أن يكون نوع القيمة المرجعة متوقعًا وواضحًا.',
  },
  {
    id: 20,
    question:
      'إذا كتبنا حلقة while بدون التأكد من أن الشرط سيتغيّر، قد نحصل على حلقة لا تنتهي.',
    correctAnswer: 'نعم',
    explanation: 'إذا لم يتغيّر الشرط، فلن تخرج الحلقة وقد يتجمّد البرنامج.',
  },
];

const CODE_QUESTIONS: CodeQuestion[] = [
  {
    id: 21,
    title: 'س21) دالة ترجع تحيّة',
    prompt:
      'اكتب دالة باسم format_greeting(name, age) تعيد نصًا بالضبط بالشكل: Bonjour NAME, tu as AGE ans. لا تطبع داخل الدالة، فقط أرجِع النص كسلسلة.',
    rubric:
      'وجود دالة format_greeting(name, age) تعيد سلسلة نصية بالصيغة الدقيقة تمامًا، مع استبدال NAME و AGE بالقيم الممرَّرة.',
    sampleAnswer:
      'def format_greeting(name, age):\n    return f"Bonjour {name}, tu as {age} ans"',
  },
  {
    id: 22,
    title: 'س22) تصنيف العمر بدالة',
    prompt:
      'اكتب دالة باسم classify_age(age) تعيد نصًا بالضبط إما "You are an adult" إذا كان العمر أكبر من أو يساوي 18، أو "You are a minor" إذا كان أقل من 18. لا تستخدم input داخل الدالة.',
    rubric:
      'وجود دالة classify_age(age) تُرجع السلسلتين المحددتين حرفيًا بحسب قيمة العمر دون طباعة.',
    sampleAnswer:
      'def classify_age(age):\n    if age >= 18:\n        return "You are an adult"\n    else:\n        return "You are a minor"',
  },
  {
    id: 23,
    title: 'س23) دالة تجمع من 1 إلى n',
    prompt:
      'اكتب دالة باسم sum_to_n(n) تعيد مجموع الأعداد من 1 إلى n (مثلًا sum_to_n(5) تُرجع 15). لا تطبع داخل الدالة، فقط أرجِع الناتج.',
    rubric:
      'وجود دالة sum_to_n(n) تستخدم حلقة أو أي طريقة صحيحة لإرجاع مجموع 1..n كعدد صحيح.',
    sampleAnswer:
      'def sum_to_n(n):\n    total = 0\n    for i in range(1, n + 1):\n        total += i\n    return total',
  },
  {
    id: 24,
    title: 'س24) دالة تجمع عددين',
    prompt:
      'اكتب دالة اسمها add_two_numbers تستقبل عددين وتُرجع مجموعهما، ثم استدعها مع 3 و7 واطبع الناتج.',
    rubric:
      'تعريف دالة تجمع معاملين، استدعاء الدالة مع (3, 7)، وطباعة الناتج 10.',
    sampleAnswer:
      'def add_two_numbers(a, b):\n    return a + b',
  },
  {
    id: 25,
    title: 'س25) دالة تحدّد زوجي أو فردي',
    prompt:
      'اكتب دالة باسم even_or_odd(n) تعيد نصًا بالضبط بالشكل "X is even" أو "X is odd" حيث X هو العدد n. لا تطبع داخل الدالة.',
    rubric:
      'وجود دالة even_or_odd(n) تستخدم شرطًا صحيحًا للتمييز بين زوجي وفردي وتُرجع النص بالدقة المطلوبة.',
    sampleAnswer:
      'def even_or_odd(n):\n    if n % 2 == 0:\n        return f"{n} is even"\n    else:\n        return f"{n} is odd"',
  },
];

const PythonQuizArabic: React.FC = () => {
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number | null>>({});
  const [yesNoAnswers, setYesNoAnswers] = useState<
    Record<number, 'نعم' | 'لا' | null>
  >({});
  const [codeAnswers, setCodeAnswers] = useState<Record<number, string>>({});
  const [codeResults, setCodeResults] = useState<Record<number, CodeTestResult>>({});
  const [submitted, setSubmitted] = useState(false);
  const [checkingId, setCheckingId] = useState<number | null>(null);
  const [finalChecking, setFinalChecking] = useState(false);
  const [pyError, setPyError] = useState<string | null>(null);

  const totalAutoQuestions = MCQ_QUESTIONS.length + YES_NO_QUESTIONS.length;

  const score = useMemo(() => {
    if (!submitted) return 0;

    const mcqScore = MCQ_QUESTIONS.reduce((total, q) => {
      const userAnswer = mcqAnswers[q.id];
      return total + (userAnswer === q.correctIndex ? 1 : 0);
    }, 0);

    const yesNoScore = YES_NO_QUESTIONS.reduce((total, q) => {
      const userAnswer = yesNoAnswers[q.id];
      return total + (userAnswer === q.correctAnswer ? 1 : 0);
    }, 0);

    return mcqScore + yesNoScore;
  }, [mcqAnswers, yesNoAnswers, submitted]);

  const handleMcqChoiceClick = (questionId: number, choiceIndex: number) => {
    if (submitted) return;
    setMcqAnswers((prev) => ({ ...prev, [questionId]: choiceIndex }));
  };

  const handleYesNoClick = (questionId: number, answer: 'نعم' | 'لا') => {
    if (submitted) return;
    setYesNoAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleCodeChange = (questionId: number, value: string) => {
    setCodeAnswers((prev) => ({ ...prev, [questionId]: value }));
  };
  const runCodeTests = async (
    questionId: number,
    code: string,
    kind: 'public' | 'hidden',
  ): Promise<Pick<CodeTestResult, 'output' | 'error'> & {
    passed: boolean;
    message?: string;
  }> => {
    const config = CODE_TESTS[questionId];
    const body = kind === 'public' ? config?.publicBody : config?.hiddenBody;
    if (!body) {
      return { passed: false, message: 'لا توجد حالات اختبار معرفة لهذا السؤال بعد.', output: '', error: undefined };
    }
    try {
      const pyodide = await getPyodideInstance();
      const script = buildTestScript(code, body);
      console.log(script);
      const result = pyodide.runPython(script) as [string, boolean, string];
      const [output, passed, message] = result || ['', false, ''];
      return { output, passed, message };
    } catch (err: any) {
      const message = err?.message || String(err);
      console.error(err)
      return {
        passed: false,
        message: 'تعذر تشغيل الاختبارات. تأكد من أن الكود لا يحتوي أخطاء تركيبية كبيرة.',
        output: '',
        error: message,
      };
    }
  };

  const handleCheckCode = async (questionId: number) => {
    if (submitted || checkingId !== null) return;
    const code = (codeAnswers[questionId] || '').trim();
    if (!code) return;
    setCheckingId(questionId);
    setPyError(null);
    const res = await runCodeTests(questionId, code, 'public');
    setCheckingId(null);
    if (res.error) {
      setPyError(res.error);
    }
    setCodeResults((prev) => ({
      ...prev,
      [questionId]: {
        publicChecked: true,
        publicPassed: res.passed,
        publicMessage: res.message,
        finalChecked: prev[questionId]?.finalChecked ?? false,
        finalPassed: prev[questionId]?.finalPassed ?? false,
        finalMessage: prev[questionId]?.finalMessage,
        output: res.output,
        error: res.error,
      },
    }));
  };

  const handleSubmit = async () => {
    if (submitted || finalChecking) return;
    setFinalChecking(true);
    setPyError(null);
    const newResults: Record<number, CodeTestResult> = { ...codeResults };
    for (const q of CODE_QUESTIONS) {
      const code = (codeAnswers[q.id] || '').trim();
      const res = await runCodeTests(q.id, code, 'hidden');
      if (res.error && !pyError) {
        setPyError(res.error);
      }
      newResults[q.id] = {
        publicChecked: newResults[q.id]?.publicChecked ?? false,
        publicPassed: newResults[q.id]?.publicPassed ?? false,
        publicMessage: newResults[q.id]?.publicMessage,
        finalChecked: true,
        finalPassed: res.passed,
        finalMessage: res.message,
        output: res.output,
        error: res.error,
      };
    }
    setCodeResults(newResults);
    setSubmitted(true);
    setFinalChecking(false);
  };

  const handleReset = () => {
    setMcqAnswers({});
    setYesNoAnswers({});
    setCodeAnswers({});
    setCodeResults({});
    setSubmitted(false);
    setPyError(null);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.mcqAnswers) setMcqAnswers(parsed.mcqAnswers);
      if (parsed.yesNoAnswers) setYesNoAnswers(parsed.yesNoAnswers);
      if (parsed.codeAnswers) setCodeAnswers(parsed.codeAnswers);
      if (parsed.codeResults) setCodeResults(parsed.codeResults);
      if (parsed.submitted) setSubmitted(true);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const state = {
      mcqAnswers,
      yesNoAnswers,
      codeAnswers,
      codeResults,
      submitted,
    };
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore storage errors
    }
  }, [mcqAnswers, yesNoAnswers, codeAnswers, codeResults, submitted]);

  return (
    <div className="quiz-page" dir="rtl">
      <div className="quiz-shell">
        <header className="quiz-header">
          <div>
            <h1 className="quiz-title">اختبار شامل في مفاهيم البرمجة وبايثون</h1>
            <p className="quiz-subtitle">
              ٣ أجزاء: اختيار من متعدّد، نعم/لا، وأسئلة كود قصيرة.
            </p>
          </div>
          {submitted && (
            <div className="quiz-score-chip">
              <span>درجتك في الأسئلة ذات التصحيح التلقائي</span>
              <strong>
                {score} / {totalAutoQuestions}
              </strong>
            </div>
          )}
        </header>

        <section className="quiz-section">
          <h2 className="quiz-section-title">الجزء الأول: أسئلة اختيار من متعدّد</h2>
          <p className="quiz-section-desc">
            اختر الإجابة الصحيحة فقط: أ، ب، ج، أو د.
          </p>

          <div className="quiz-list">
            {MCQ_QUESTIONS.map((q) => {
              const userAnswer = mcqAnswers[q.id] ?? null;
              const isCorrect = submitted && userAnswer === q.correctIndex;
              const isWrong =
                submitted && userAnswer !== null && userAnswer !== q.correctIndex;

              return (
                <article key={q.id} className="quiz-card">
                  <div className="quiz-question-row">
                    <span className="quiz-question-number">س{q.id}</span>
                    <h3 className="quiz-question-text">{q.question}</h3>
                  </div>

                  {q.code && (
                    <pre className="quiz-code-block">
                      <code>{q.code}</code>
                    </pre>
                  )}

                  <div className="quiz-options">
                    {q.choices.map((choice, index) => {
                      const selected = userAnswer === index;
                      const correctChoice =
                        submitted && index === q.correctIndex;
                      const wrongChoice =
                        submitted && selected && index !== q.correctIndex;

                      const classes = [
                        'quiz-option',
                        selected ? 'quiz-option-selected' : '',
                        correctChoice ? 'quiz-option-correct' : '',
                        wrongChoice ? 'quiz-option-wrong' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                      const label =
                        index === 0
                          ? 'أ) '
                          : index === 1
                          ? 'ب) '
                          : index === 2
                          ? 'ج) '
                          : 'د) ';

                      return (
                        <button
                          key={index}
                          type="button"
                          className={classes}
                          onClick={() => handleMcqChoiceClick(q.id, index)}
                        >
                          <span className="quiz-option-index">{label}</span>
                          <span className="quiz-option-label">{choice}</span>
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="quiz-feedback">
                      {isCorrect && (
                        <span className="quiz-badge success">إجابة صحيحة ✔</span>
                      )}
                      {isWrong && (
                        <span className="quiz-badge error">إجابة غير صحيحة ✖</span>
                      )}
                      <p className="quiz-explanation">💡 {q.explanation}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="quiz-section">
          <h2 className="quiz-section-title">الجزء الثاني: أسئلة نعم / لا</h2>
          <p className="quiz-section-desc">اكتب: نعم أو لا (اختر واحدة).</p>

          <div className="quiz-list">
            {YES_NO_QUESTIONS.map((q) => {
              const userAnswer = yesNoAnswers[q.id] ?? null;
              const isCorrect = submitted && userAnswer === q.correctAnswer;
              const isWrong =
                submitted && userAnswer !== null && userAnswer !== q.correctAnswer;

              return (
                <article key={q.id} className="quiz-card">
                  <div className="quiz-question-row">
                    <span className="quiz-question-number">س{q.id}</span>
                    <h3 className="quiz-question-text">{q.question}</h3>
                  </div>

                  <div className="quiz-options">
                    {(['نعم', 'لا'] as const).map((choice) => {
                      const selected = userAnswer === choice;
                      const correctChoice = submitted && q.correctAnswer === choice;
                      const wrongChoice =
                        submitted && selected && q.correctAnswer !== choice;

                      const classes = [
                        'quiz-option',
                        selected ? 'quiz-option-selected' : '',
                        correctChoice ? 'quiz-option-correct' : '',
                        wrongChoice ? 'quiz-option-wrong' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');

                      return (
                        <button
                          key={choice}
                          type="button"
                          className={classes}
                          onClick={() => handleYesNoClick(q.id, choice)}
                        >
                          <span className="quiz-option-label">{choice}</span>
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="quiz-feedback">
                      {isCorrect && (
                        <span className="quiz-badge success">إجابة صحيحة ✔</span>
                      )}
                      {isWrong && (
                        <span className="quiz-badge error">إجابة غير صحيحة ✖</span>
                      )}
                      <p className="quiz-explanation">💡 {q.explanation}</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <section className="quiz-section">
          <h2 className="quiz-section-title">الجزء الثالث: أسئلة كتابة كود</h2>
          <p className="quiz-section-desc">
            اكتب كودًا قصيرًا في كل خانة. سيتم عرض نموذج إجابة بعد إرسال
            الاختبار، ويمكن التصحيح يدويًا بناءً على الإرشادات.
          </p>

          <div className="quiz-list">
            {CODE_QUESTIONS.map((q) => {
              const userCode = codeAnswers[q.id] ?? '';
              const result = codeResults[q.id];

              return (
                <article key={q.id} className="quiz-card">
                  <div className="quiz-question-row">
                    <span className="quiz-question-number">س{q.id}</span>
                    <h3 className="quiz-question-text">{q.title}</h3>
                  </div>
                  <p className="quiz-section-desc">{q.prompt}</p>

                  <textarea
                    className="quiz-code-input"
                    rows={4}
                    dir="ltr"
                    value={userCode}
                    onChange={(e) => handleCodeChange(q.id, e.target.value)}
                    placeholder="# اكتب حلك هنا (بايثون)"
                    disabled={submitted}
                  />

                  <div className="quiz-footer" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="quiz-secondary-btn"
                      onClick={() => handleCheckCode(q.id)}
                      disabled={submitted || !userCode.trim() || checkingId === q.id}
                    >
                      {checkingId === q.id
                        ? 'جاري تشغيل الاختبارات الأساسية...'
                        : 'تحقّق من الحل لهذا السؤال'}
                    </button>
                  </div>

                  {result?.publicChecked && (
                    <div className="quiz-feedback">
                      <p className="quiz-explanation">
                        {result.publicPassed
                          ? `✅ الاختبارات الأساسية: ${result.publicMessage || 'نجحت.'}`
                          : `❌ الاختبارات الأساسية: ${result.publicMessage || 'فشلت، راجع الشروط.'}`}
                      </p>
                    </div>
                  )}

                  {submitted && (
                    <div className="quiz-feedback">
                      <p className="quiz-explanation">📌 إرشادات التصحيح: {q.rubric}</p>
                      <p className="quiz-explanation">🔍 نموذج إجابة مقترح:</p>
                      <pre className="quiz-code-block">
                        <code>{q.sampleAnswer}</code>
                      </pre>
                      {result?.finalChecked && (
                        <p className="quiz-explanation">
                          {result.finalPassed
                            ? `✅ الاختبارات الإضافية: ${result.finalMessage || 'نجحت.'}`
                            : `❌ الاختبارات الإضافية: ${
                                result.finalMessage ||
                                'بعض الحالات لم تنجح، راجع النموذج المقترح وحاول فهم الفرق.'
                              }`}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        <footer className="quiz-footer">
          <button
            type="button"
            className="quiz-primary-btn"
            onClick={handleSubmit}
            disabled={submitted || finalChecking}
          >
            {finalChecking
              ? 'جاري إرسال الإجابات وتشغيل الاختبارات الإضافية...'
              : 'إرسال الإجابات وتصحيح الاختيار من متعدّد ونعم/لا وأسئلة الكود'}
          </button>
          {submitted && (
            <button
              type="button"
              className="quiz-secondary-btn"
              onClick={handleReset}
            >
              إعادة المحاولة
            </button>
          )}
        </footer>
        {pyError && (
          <div className="quiz-feedback" style={{ marginTop: 8 }}>
            <p className="quiz-explanation">
              ⚠️ حدث خطأ أثناء تشغيل Pyodide أو الاختبارات: {pyError}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PythonQuizArabic;
