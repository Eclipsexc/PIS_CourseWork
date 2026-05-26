const markerPattern = /^([QA])(\d+)\.\s*(.*)$/i;

const normalizeBlockText = (parts) => parts.join('\n').trim();

export const parseTemplateTxtFileContent = (content) => {
  const errors = [];

  if (typeof content !== 'string' || content.trim().length === 0) {
    return {
      questions: [],
      errors: ['Файл порожній або містить лише пробіли.'],
    };
  }

  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  const parsed = [];
  const seenQuestions = new Set();
  const seenAnswers = new Set();
  let current = null;
  let activeSection = null;

  const pushCurrent = () => {
    if (!current) return;

    const question = normalizeBlockText(current.questionParts);
    const answer = normalizeBlockText(current.answerParts);

    if (!question) {
      errors.push(`Питання Q${current.number} порожнє.`);
    } else if (question.length < 5) {
      errors.push(`Питання Q${current.number} має містити щонайменше 5 символів.`);
    }

    if (!current.hasAnswer) {
      errors.push(`Знайдено Q${current.number} без відповідної A${current.number}.`);
    } else if (!answer) {
      errors.push(`Відповідь A${current.number} порожня.`);
    } else if (answer.length < 10) {
      errors.push(`Відповідь A${current.number} має містити щонайменше 10 символів.`);
    }

    if (question && answer && question.length >= 5 && answer.length >= 10) {
      parsed.push({ number: current.number, question, answer });
    }
  };

  for (const rawLine of lines) {
    const trimmedLine = rawLine.trim();
    if (!trimmedLine) continue;

    const markerMatch = trimmedLine.match(markerPattern);

    if (markerMatch) {
      const markerType = markerMatch[1].toUpperCase();
      const markerNumber = Number(markerMatch[2]);
      const markerText = markerMatch[3].trim();

      if (markerType === 'Q') {
        if (seenQuestions.has(markerNumber)) {
          errors.push(`Знайдено дублікат Q${markerNumber}.`);
        }

        const expectedNumber = seenQuestions.size + 1;
        if (markerNumber !== expectedNumber) {
          const previousNumber = expectedNumber - 1;
          errors.push(
            previousNumber > 0
              ? `Порушена послідовність нумерації: після Q${previousNumber} очікується Q${expectedNumber}, але знайдено Q${markerNumber}.`
              : `Нумерація має починатися з Q1, але знайдено Q${markerNumber}.`
          );
        }

        pushCurrent();
        seenQuestions.add(markerNumber);
        current = {
          number: markerNumber,
          questionParts: [markerText],
          answerParts: [],
          hasAnswer: false,
        };
        activeSection = 'questionParts';
        continue;
      }

      if (markerType === 'A') {
        if (seenAnswers.has(markerNumber)) {
          errors.push(`Знайдено дублікат A${markerNumber}.`);
        }
        seenAnswers.add(markerNumber);

        if (!seenQuestions.has(markerNumber)) {
          errors.push(`Знайдено A${markerNumber} без відповідного Q${markerNumber}.`);
        }

        if (!current) {
          current = {
            number: markerNumber,
            questionParts: [],
            answerParts: [],
            hasAnswer: true,
          };
        } else if (current.number !== markerNumber) {
          errors.push(`Номери питання та відповіді не збігаються: Q${current.number} має A${markerNumber}.`);
        }

        current.hasAnswer = true;
        current.answerParts.push(markerText);
        activeSection = 'answerParts';
        continue;
      }
    }

    if (!current || !activeSection) {
      errors.push('Кожен блок має починатися з Q<number>. або A<number>.');
      continue;
    }

    current[activeSection].push(trimmedLine);
  }

  pushCurrent();

  if (parsed.length === 0 && errors.length === 0) {
    errors.push('Не знайдено жодної пари Q/A.');
  }

  if (parsed.length === 0 && seenQuestions.size === 0 && seenAnswers.size === 0 && errors.length === 0) {
    errors.push('Не знайдено жодної пари Q/A.');
  }

  return {
    questions: errors.length ? [] : parsed.map(({ question, answer }) => ({ question, answer })),
    errors,
  };
};
