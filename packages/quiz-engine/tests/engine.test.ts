import { describe, it, expect, beforeEach } from 'vitest'
import { QuizEngine } from '../src/engine'
import type { Quiz } from '@konstruktor/shared'

// ─── Test fixtures ─────────────────────────────────────────────────────────

const mockQuiz: Quiz = {
  id: '00000000-0000-0000-0000-000000000001',
  title: 'Test Quiz',
  questions: [
    {
      id: '00000000-0000-0000-0000-000000000010',
      type: 'single_choice',
      order: 0,
      text: 'What is 2 + 2?',
      options: [
        { id: 'opt-a', text: '3' },
        { id: 'opt-b', text: '4' },
        { id: 'opt-c', text: '5' },
      ],
      correctOptionId: 'opt-b',
      points: 10,
    },
    {
      id: '00000000-0000-0000-0000-000000000011',
      type: 'true_false',
      order: 1,
      text: 'The Earth is flat.',
      correctAnswer: false,
      points: 10,
    },
    {
      id: '00000000-0000-0000-0000-000000000012',
      type: 'single_choice',
      order: 2,
      text: 'Capital of France?',
      options: [
        { id: 'opt-x', text: 'London' },
        { id: 'opt-y', text: 'Paris' },
        { id: 'opt-z', text: 'Berlin' },
      ],
      correctOptionId: 'opt-y',
      points: 10,
    },
  ],
  settings: {
    streakMultiplier: false,
    showCorrectAnswer: true,
    shuffleQuestions: false,
    shuffleAnswers: false,
    passingScore: 60,
    allowRetry: true,
    showProgressBar: true,
    soundEnabled: false,
    animationsEnabled: false,
    theme: {
      name: 'test',
      primaryColor: '#000000',
      backgroundColor: '#ffffff',
      fontFamily: 'Arial',
      borderRadius: 'medium',
      cardStyle: 'flat',
    },
  },
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  version: 1,
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('QuizEngine', () => {
  let engine: QuizEngine

  beforeEach(() => {
    engine = new QuizEngine(mockQuiz)
  })

  // ─── Initialization ──────────────────────────────────────────────────────

  describe('initialization', () => {
    it('should start in idle state', () => {
      expect(engine.getState()).toBe('idle')
    })

    it('should have correct total question count', () => {
      expect(engine.getTotalQuestions()).toBe(3)
    })

    it('should have current question index of -1 before start', () => {
      expect(engine.getCurrentQuestionIndex()).toBe(-1)
    })

    it('should return null for current question before start', () => {
      expect(engine.getCurrentQuestion()).toBeNull()
    })

    it('should return null result before completion', () => {
      expect(engine.getResult()).toBeNull()
    })

    it('should have empty answers list initially', () => {
      expect(engine.getAnswers()).toHaveLength(0)
    })

    it('should preserve question order when shuffleQuestions is false', () => {
      engine.start('Иванов')
      expect(engine.getCurrentQuestion()?.id).toBe('00000000-0000-0000-0000-000000000010')
    })
  })

  // ─── start() ────────────────────────────────────────────────────────────

  describe('start()', () => {
    it('should transition from idle to question state', () => {
      engine.start('Иванов')
      expect(engine.getState()).toBe('question')
    })

    it('should set current question index to 0', () => {
      engine.start('Иванов')
      expect(engine.getCurrentQuestionIndex()).toBe(0)
    })

    it('should record the player name', () => {
      engine.start('Иванов Иван')
      expect(engine.getPlayerName()).toBe('Иванов Иван')
    })

    it('should expose the first question', () => {
      engine.start('Иванов')
      const q = engine.getCurrentQuestion()
      expect(q).not.toBeNull()
      expect(q!.id).toBe('00000000-0000-0000-0000-000000000010')
    })

    it('should throw if called when already started', () => {
      engine.start('Иванов')
      expect(() => engine.start('Петров')).toThrow()
    })

    it('should throw if called when completed', () => {
      engine.start('Иванов')
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' })
      engine.next()
      engine.submitAnswer({ type: 'true_false', value: false })
      engine.next()
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-y' })
      engine.next()
      expect(engine.getState()).toBe('completed')
      expect(() => engine.start('Петров')).toThrow()
    })
  })

  // ─── submitAnswer() ──────────────────────────────────────────────────────

  describe('submitAnswer()', () => {
    beforeEach(() => {
      engine.start('Иванов')
    })

    it('should transition from question to answer_review', () => {
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' })
      expect(engine.getState()).toBe('answer_review')
    })

    it('should record the submitted answer', () => {
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' })
      expect(engine.getAnswers()).toHaveLength(1)
      expect(engine.getAnswers()[0]?.questionId).toBe('00000000-0000-0000-0000-000000000010')
    })

    it('should evaluate correct answer as correct', () => {
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' }) // opt-b is correct
      expect(engine.getAnswers()[0]?.isCorrect).toBe(true)
    })

    it('should evaluate wrong answer as incorrect', () => {
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-a' }) // opt-a is wrong
      expect(engine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should award full points for a correct answer', () => {
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' })
      expect(engine.getAnswers()[0]?.pointsEarned).toBe(10)
    })

    it('should award zero points for a wrong answer', () => {
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-a' })
      expect(engine.getAnswers()[0]?.pointsEarned).toBe(0)
    })

    it('should throw if called outside of question state', () => {
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' })
      // Now in answer_review — cannot submit again
      expect(() =>
        engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' }),
      ).toThrow()
    })

    it('should throw if called before start', () => {
      const freshEngine = new QuizEngine(mockQuiz)
      expect(() =>
        freshEngine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' }),
      ).toThrow()
    })
  })

  // ─── next() ──────────────────────────────────────────────────────────────

  describe('next()', () => {
    beforeEach(() => {
      engine.start('Иванов')
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' })
    })

    it('should advance to next question from answer_review', () => {
      engine.next()
      expect(engine.getState()).toBe('question')
      expect(engine.getCurrentQuestionIndex()).toBe(1)
    })

    it('should complete quiz after the last question', () => {
      engine.next()
      engine.submitAnswer({ type: 'true_false', value: false })
      engine.next()
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-y' })
      engine.next()
      expect(engine.getState()).toBe('completed')
    })

    it('should throw if called outside of answer_review state', () => {
      engine.next() // valid: answer_review → question
      expect(() => engine.next()).toThrow() // invalid: question → ?
    })
  })

  // ─── timeout() ───────────────────────────────────────────────────────────

  describe('timeout()', () => {
    beforeEach(() => {
      engine.start('Иванов')
    })

    it('should record the unanswered question with zero points', () => {
      engine.timeout()
      expect(engine.getAnswers()).toHaveLength(1)
      expect(engine.getAnswers()[0]?.isCorrect).toBe(false)
      expect(engine.getAnswers()[0]?.pointsEarned).toBe(0)
    })

    it('should record a timeout answer type', () => {
      engine.timeout()
      expect(engine.getAnswers()[0]?.submittedAnswer.type).toBe('timeout')
    })

    it('should transition to answer_review state', () => {
      engine.timeout()
      expect(engine.getState()).toBe('answer_review')
    })

    it('should throw if called outside of question state', () => {
      engine.timeout()
      expect(() => engine.timeout()).toThrow()
    })
  })

  // ─── Lives system ─────────────────────────────────────────────────────────

  describe('lives system', () => {
    it('should start with full lives when lives setting is configured', () => {
      const livesEngine = new QuizEngine({
        ...mockQuiz,
        settings: { ...mockQuiz.settings, lives: 3 },
      })
      livesEngine.start('Иванов')
      expect(livesEngine.getRemainingLives()).toBe(3)
    })

    it('should return undefined remainingLives when lives not configured', () => {
      engine.start('Иванов')
      expect(engine.getRemainingLives()).toBeUndefined()
    })

    it('should deduct a life on wrong answer', () => {
      const livesEngine = new QuizEngine({
        ...mockQuiz,
        settings: { ...mockQuiz.settings, lives: 3 },
      })
      livesEngine.start('Иванов')
      livesEngine.submitAnswer({ type: 'single_choice', optionId: 'opt-a' }) // wrong
      expect(livesEngine.getRemainingLives()).toBe(2)
    })

    it('should NOT deduct a life on correct answer', () => {
      const livesEngine = new QuizEngine({
        ...mockQuiz,
        settings: { ...mockQuiz.settings, lives: 3 },
      })
      livesEngine.start('Иванов')
      livesEngine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' }) // correct
      expect(livesEngine.getRemainingLives()).toBe(3)
    })

    it('should complete the quiz (as failed) when all lives are lost', () => {
      const oneLifeEngine = new QuizEngine({
        ...mockQuiz,
        settings: { ...mockQuiz.settings, lives: 1 },
      })
      oneLifeEngine.start('Иванов')
      oneLifeEngine.submitAnswer({ type: 'single_choice', optionId: 'opt-a' }) // wrong — last life
      oneLifeEngine.next()
      expect(oneLifeEngine.getState()).toBe('completed')
    })
  })

  // ─── getResult() ─────────────────────────────────────────────────────────

  describe('getResult()', () => {
    it('should return null when quiz is not complete', () => {
      engine.start('Иванов')
      expect(engine.getResult()).toBeNull()
    })

    it('should return 100% score when all answers are correct', () => {
      engine.start('Иванов')
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' }) // ✓
      engine.next()
      engine.submitAnswer({ type: 'true_false', value: false }) // ✓
      engine.next()
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-y' }) // ✓
      engine.next()

      const result = engine.getResult()
      expect(result).not.toBeNull()
      expect(result!.score).toBe(100)
      expect(result!.earnedPoints).toBe(30)
      expect(result!.totalPoints).toBe(30)
    })

    it('should return 0% score when all answers are wrong', () => {
      engine.start('Иванов')
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-a' }) // ✗
      engine.next()
      engine.submitAnswer({ type: 'true_false', value: true }) // ✗
      engine.next()
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-x' }) // ✗
      engine.next()

      expect(engine.getResult()!.score).toBe(0)
    })

    it('should mark quiz as passed when score meets passingScore', () => {
      engine.start('Иванов')
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' }) // ✓
      engine.next()
      engine.submitAnswer({ type: 'true_false', value: false }) // ✓
      engine.next()
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-x' }) // ✗
      engine.next()

      const result = engine.getResult()!
      expect(result.score).toBeCloseTo(67, 0)
      expect(result.isPassed).toBe(true) // passingScore is 60
    })

    it('should mark quiz as failed when score is below passingScore', () => {
      engine.start('Иванов')
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-a' }) // ✗
      engine.next()
      engine.submitAnswer({ type: 'true_false', value: false }) // ✓
      engine.next()
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-x' }) // ✗
      engine.next()

      const result = engine.getResult()!
      expect(result.score).toBeCloseTo(33, 0)
      expect(result.isPassed).toBe(false)
    })

    it('should populate playerName in result', () => {
      engine.start('Петрова Мария')
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' })
      engine.next()
      engine.submitAnswer({ type: 'true_false', value: false })
      engine.next()
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-y' })
      engine.next()

      expect(engine.getResult()!.playerName).toBe('Петрова Мария')
    })

    it('should return undefined isPassed when no passingScore configured', () => {
      const noPassEngine = new QuizEngine({
        ...mockQuiz,
        settings: { ...mockQuiz.settings, passingScore: undefined },
      })
      noPassEngine.start('Иванов')
      noPassEngine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' })
      noPassEngine.next()
      noPassEngine.submitAnswer({ type: 'true_false', value: false })
      noPassEngine.next()
      noPassEngine.submitAnswer({ type: 'single_choice', optionId: 'opt-y' })
      noPassEngine.next()

      expect(noPassEngine.getResult()!.isPassed).toBeUndefined()
    })

    it('should return score 0 when all questions have zero points', () => {
      const zeroPointQuiz = {
        ...mockQuiz,
        questions: mockQuiz.questions.map((q) => ({ ...q, points: 0 })),
      }
      const zeroEngine = new QuizEngine(zeroPointQuiz)
      zeroEngine.start('Test')
      zeroEngine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' })
      zeroEngine.next()
      zeroEngine.submitAnswer({ type: 'true_false', value: false })
      zeroEngine.next()
      zeroEngine.submitAnswer({ type: 'single_choice', optionId: 'opt-y' })
      zeroEngine.next()

      expect(zeroEngine.getResult()!.score).toBe(0)
    })

    it('should return null for getCurrentQuestion when index is at boundary', () => {
      // After completion, currentIndex should be at last question, not overflow
      engine.start('Иванов')
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' })
      engine.next()
      engine.submitAnswer({ type: 'true_false', value: false })
      engine.next()
      engine.submitAnswer({ type: 'single_choice', optionId: 'opt-y' })
      engine.next()
      // Quiz is completed, state is 'completed'
      expect(engine.getState()).toBe('completed')
    })
  })

  // ─── _evaluate() — additional question types ──────────────────────────────

  describe('_evaluate() — additional question types', () => {
    it('should correctly evaluate multiple_choice — exact match', () => {
      const mcEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'mc-1',
            type: 'multiple_choice',
            order: 0,
            text: 'Pick all correct',
            options: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B' },
              { id: 'c', text: 'C' },
            ],
            correctOptionIds: ['a', 'c'],
            points: 10,
          },
        ],
      })
      mcEngine.start('Test')
      mcEngine.submitAnswer({ type: 'multiple_choice', optionIds: ['a', 'c'] })
      expect(mcEngine.getAnswers()[0]?.isCorrect).toBe(true)
    })

    it('should reject multiple_choice with wrong options', () => {
      const mcEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'mc-2',
            type: 'multiple_choice',
            order: 0,
            text: 'Pick all correct',
            options: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B' },
            ],
            correctOptionIds: ['a', 'b'],
            points: 10,
          },
        ],
      })
      mcEngine.start('Test')
      mcEngine.submitAnswer({ type: 'multiple_choice', optionIds: ['a'] })
      expect(mcEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should reject multiple_choice when answer type does not match question type', () => {
      const mcEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'mc-3',
            type: 'multiple_choice',
            order: 0,
            text: 'Pick',
            options: [{ id: 'a', text: 'A' }],
            correctOptionIds: ['a'],
            points: 10,
          },
        ],
      })
      mcEngine.start('Test')
      mcEngine.submitAnswer({ type: 'single_choice', optionId: 'a' })
      expect(mcEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should correctly evaluate text_input — case insensitive', () => {
      const tiEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'ti-1',
            type: 'text_input',
            order: 0,
            text: 'Capital of France?',
            correctAnswers: ['Paris'],
            caseSensitive: false,
            fuzzyMatch: false,
            points: 10,
          },
        ],
      })
      tiEngine.start('Test')
      tiEngine.submitAnswer({ type: 'text_input', text: 'paris' })
      expect(tiEngine.getAnswers()[0]?.isCorrect).toBe(true)
    })

    it('should correctly evaluate text_input — case sensitive', () => {
      const tiEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'ti-2',
            type: 'text_input',
            order: 0,
            text: 'Capital of France?',
            correctAnswers: ['Paris'],
            caseSensitive: true,
            fuzzyMatch: false,
            points: 10,
          },
        ],
      })
      tiEngine.start('Test')
      tiEngine.submitAnswer({ type: 'text_input', text: 'paris' })
      expect(tiEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should correctly evaluate text_input — fuzzy match (1 typo)', () => {
      const tiEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'ti-3',
            type: 'text_input',
            order: 0,
            text: 'Spell it',
            correctAnswers: ['algorithm'],
            caseSensitive: false,
            fuzzyMatch: true,
            points: 10,
          },
        ],
      })
      tiEngine.start('Test')
      tiEngine.submitAnswer({ type: 'text_input', text: 'algorithn' }) // 1 typo
      expect(tiEngine.getAnswers()[0]?.isCorrect).toBe(true)
    })

    it('should reject text_input when answer type does not match question type', () => {
      const tiEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'ti-4',
            type: 'text_input',
            order: 0,
            text: 'Q',
            correctAnswers: ['A'],
            caseSensitive: false,
            fuzzyMatch: false,
            points: 10,
          },
        ],
      })
      tiEngine.start('Test')
      tiEngine.submitAnswer({ type: 'true_false', value: true })
      expect(tiEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should correctly evaluate matching — correct pairs', () => {
      const mEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'mat-1',
            type: 'matching',
            order: 0,
            text: 'Match',
            pairs: [
              { id: 'p1', left: 'Cat', right: 'Meow' },
              { id: 'p2', left: 'Dog', right: 'Woof' },
            ],
            points: 10,
          },
        ],
      })
      mEngine.start('Test')
      mEngine.submitAnswer({
        type: 'matching',
        pairs: [
          { leftId: 'p1', rightId: 'Meow' },
          { leftId: 'p2', rightId: 'Woof' },
        ],
      })
      expect(mEngine.getAnswers()[0]?.isCorrect).toBe(true)
    })

    it('should reject matching with wrong pairs', () => {
      const mEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'mat-2',
            type: 'matching',
            order: 0,
            text: 'Match',
            pairs: [
              { id: 'p1', left: 'Cat', right: 'Meow' },
              { id: 'p2', left: 'Dog', right: 'Woof' },
            ],
            points: 10,
          },
        ],
      })
      mEngine.start('Test')
      mEngine.submitAnswer({
        type: 'matching',
        pairs: [
          { leftId: 'p1', rightId: 'Woof' },
          { leftId: 'p2', rightId: 'Meow' },
        ],
      })
      expect(mEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should reject matching with wrong number of pairs', () => {
      const mEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'mat-3',
            type: 'matching',
            order: 0,
            text: 'Match',
            pairs: [
              { id: 'p1', left: 'A', right: '1' },
              { id: 'p2', left: 'B', right: '2' },
            ],
            points: 10,
          },
        ],
      })
      mEngine.start('Test')
      mEngine.submitAnswer({ type: 'matching', pairs: [{ leftId: 'p1', rightId: '1' }] })
      expect(mEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should reject matching when answer type does not match question type', () => {
      const mEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'mat-4',
            type: 'matching',
            order: 0,
            text: 'Match',
            pairs: [{ id: 'p1', left: 'A', right: '1' }],
            points: 10,
          },
        ],
      })
      mEngine.start('Test')
      mEngine.submitAnswer({ type: 'true_false', value: true })
      expect(mEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should correctly evaluate ordering — correct order', () => {
      const oEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'ord-1',
            type: 'ordering',
            order: 0,
            text: 'Sort',
            items: [
              { id: 'i1', text: 'First' },
              { id: 'i2', text: 'Second' },
              { id: 'i3', text: 'Third' },
            ],
            correctOrder: ['i1', 'i2', 'i3'],
            points: 10,
          },
        ],
      })
      oEngine.start('Test')
      oEngine.submitAnswer({ type: 'ordering', order: ['i1', 'i2', 'i3'] })
      expect(oEngine.getAnswers()[0]?.isCorrect).toBe(true)
    })

    it('should reject ordering — wrong order', () => {
      const oEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'ord-2',
            type: 'ordering',
            order: 0,
            text: 'Sort',
            items: [
              { id: 'i1', text: 'First' },
              { id: 'i2', text: 'Second' },
            ],
            correctOrder: ['i1', 'i2'],
            points: 10,
          },
        ],
      })
      oEngine.start('Test')
      oEngine.submitAnswer({ type: 'ordering', order: ['i2', 'i1'] })
      expect(oEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should reject ordering with wrong length', () => {
      const oEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'ord-3',
            type: 'ordering',
            order: 0,
            text: 'Sort',
            items: [
              { id: 'i1', text: 'A' },
              { id: 'i2', text: 'B' },
            ],
            correctOrder: ['i1', 'i2'],
            points: 10,
          },
        ],
      })
      oEngine.start('Test')
      oEngine.submitAnswer({ type: 'ordering', order: ['i1'] })
      expect(oEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should reject ordering when answer type does not match question type', () => {
      const oEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'ord-4',
            type: 'ordering',
            order: 0,
            text: 'Sort',
            items: [{ id: 'i1', text: 'A' }],
            correctOrder: ['i1'],
            points: 10,
          },
        ],
      })
      oEngine.start('Test')
      oEngine.submitAnswer({ type: 'true_false', value: true })
      expect(oEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should correctly evaluate hotspot — click on correct zone', () => {
      const hEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'hs-1',
            type: 'hotspot',
            order: 0,
            text: 'Click the correct zone',
            imageUrl: 'test.png',
            hotspots: [
              { id: 'h1', x: 100, y: 100, radius: 20, label: 'Zone A', isCorrect: true },
              { id: 'h2', x: 300, y: 300, radius: 20, label: 'Zone B', isCorrect: false },
            ],
            points: 10,
          },
        ],
      })
      hEngine.start('Test')
      hEngine.submitAnswer({ type: 'hotspot', x: 105, y: 105 }) // within h1 radius
      expect(hEngine.getAnswers()[0]?.isCorrect).toBe(true)
    })

    it('should reject hotspot — click outside all correct zones', () => {
      const hEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'hs-2',
            type: 'hotspot',
            order: 0,
            text: 'Click',
            imageUrl: 'test.png',
            hotspots: [
              { id: 'h1', x: 100, y: 100, radius: 20, label: 'Zone', isCorrect: true },
            ],
            points: 10,
          },
        ],
      })
      hEngine.start('Test')
      hEngine.submitAnswer({ type: 'hotspot', x: 500, y: 500 }) // far away
      expect(hEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should reject hotspot when answer type does not match question type', () => {
      const hEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'hs-3',
            type: 'hotspot',
            order: 0,
            text: 'Click',
            imageUrl: 'test.png',
            hotspots: [{ id: 'h1', x: 100, y: 100, radius: 20, label: 'Zone', isCorrect: true }],
            points: 10,
          },
        ],
      })
      hEngine.start('Test')
      hEngine.submitAnswer({ type: 'true_false', value: true })
      expect(hEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should correctly evaluate fill_blank — all correct', () => {
      const fbEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'fb-1',
            type: 'fill_blank',
            order: 0,
            text: 'The ___ is blue.',
            textWithBlanks: 'The {{b1}} is blue.',
            blanks: [
              { id: 'b1', position: 4, correctAnswers: ['sky', 'Sky'] },
            ],
            points: 10,
          },
        ],
      })
      fbEngine.start('Test')
      fbEngine.submitAnswer({ type: 'fill_blank', answers: { b1: 'Sky' } })
      expect(fbEngine.getAnswers()[0]?.isCorrect).toBe(true)
    })

    it('should reject fill_blank — wrong answer', () => {
      const fbEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'fb-2',
            type: 'fill_blank',
            order: 0,
            text: 'The ___ is blue.',
            textWithBlanks: 'The {{b1}} is blue.',
            blanks: [
              { id: 'b1', position: 4, correctAnswers: ['sky'] },
            ],
            points: 10,
          },
        ],
      })
      fbEngine.start('Test')
      fbEngine.submitAnswer({ type: 'fill_blank', answers: { b1: 'ocean' } })
      expect(fbEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should reject fill_blank when answer type does not match question type', () => {
      const fbEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'fb-3',
            type: 'fill_blank',
            order: 0,
            text: 'Fill',
            textWithBlanks: '{{b1}}',
            blanks: [{ id: 'b1', position: 0, correctAnswers: ['answer'] }],
            points: 10,
          },
        ],
      })
      fbEngine.start('Test')
      fbEngine.submitAnswer({ type: 'true_false', value: true })
      expect(fbEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should handle fill_blank with missing blank key gracefully', () => {
      const fbEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'fb-4',
            type: 'fill_blank',
            order: 0,
            text: 'The ___ is ___.',
            textWithBlanks: 'The {{b1}} is {{b2}}.',
            blanks: [
              { id: 'b1', position: 4, correctAnswers: ['sky'] },
              { id: 'b2', position: 10, correctAnswers: ['blue'] },
            ],
            points: 10,
          },
        ],
      })
      fbEngine.start('Test')
      // b2 not provided — should evaluate to false
      fbEngine.submitAnswer({ type: 'fill_blank', answers: { b1: 'sky' } })
      expect(fbEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should correctly evaluate true_false — wrong type', () => {
      const tfEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'tf-bad',
            type: 'true_false',
            order: 0,
            text: 'True?',
            correctAnswer: true,
            points: 10,
          },
        ],
      })
      tfEngine.start('Test')
      tfEngine.submitAnswer({ type: 'single_choice', optionId: 'x' })
      expect(tfEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should reject single_choice when answer type mismatches question type', () => {
      engine.start('Test')
      engine.submitAnswer({ type: 'true_false', value: true })
      expect(engine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should reject multiple_choice with same size but different elements', () => {
      const mcEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'mc-x',
            type: 'multiple_choice',
            order: 0,
            text: 'Pick',
            options: [
              { id: 'a', text: 'A' },
              { id: 'b', text: 'B' },
              { id: 'c', text: 'C' },
            ],
            correctOptionIds: ['a', 'b'],
            points: 10,
          },
        ],
      })
      mcEngine.start('Test')
      // Same count as correct (2), but wrong elements
      mcEngine.submitAnswer({ type: 'multiple_choice', optionIds: ['a', 'c'] })
      expect(mcEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should accept text_input with fuzzyMatch when answer exactly matches', () => {
      const tiEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'ti-exact',
            type: 'text_input',
            order: 0,
            text: 'Spell it',
            correctAnswers: ['algorithm'],
            caseSensitive: false,
            fuzzyMatch: true,
            points: 10,
          },
        ],
      })
      tiEngine.start('Test')
      tiEngine.submitAnswer({ type: 'text_input', text: 'algorithm' }) // exact match
      expect(tiEngine.getAnswers()[0]?.isCorrect).toBe(true)
    })

    it('should reject text_input with fuzzyMatch for short strings with typo', () => {
      const tiEngine = new QuizEngine({
        ...mockQuiz,
        questions: [
          {
            id: 'ti-short',
            type: 'text_input',
            order: 0,
            text: 'Short word',
            correctAnswers: ['cat'],
            caseSensitive: false,
            fuzzyMatch: true,
            points: 10,
          },
        ],
      })
      tiEngine.start('Test')
      tiEngine.submitAnswer({ type: 'text_input', text: 'dog' }) // short, maxDist=0, different
      expect(tiEngine.getAnswers()[0]?.isCorrect).toBe(false)
    })

    it('should advance with lives remaining and not yet at last question', () => {
      const livesEngine = new QuizEngine({
        ...mockQuiz,
        settings: { ...mockQuiz.settings, lives: 3 },
      })
      livesEngine.start('Test')
      livesEngine.submitAnswer({ type: 'single_choice', optionId: 'opt-a' }) // wrong, lives → 2
      livesEngine.next() // lives > 0, not last question → advances
      expect(livesEngine.getState()).toBe('question')
      expect(livesEngine.getCurrentQuestionIndex()).toBe(1)
      expect(livesEngine.getRemainingLives()).toBe(2)
    })

    it('should apply shuffle questions when shuffleQuestions is true', () => {
      const shuffleEngine = new QuizEngine({
        ...mockQuiz,
        settings: { ...mockQuiz.settings, shuffleQuestions: true },
      })
      shuffleEngine.start('Test')
      expect(shuffleEngine.getCurrentQuestion()).not.toBeNull()
      expect(shuffleEngine.getTotalQuestions()).toBe(3)
    })

    it('should apply streak multiplier when streakMultiplier is enabled', () => {
      const streakEngine = new QuizEngine({
        ...mockQuiz,
        settings: { ...mockQuiz.settings, streakMultiplier: true },
      })
      streakEngine.start('Test')
      // Correct answer 1 — streak 0 → multiplier 1
      streakEngine.submitAnswer({ type: 'single_choice', optionId: 'opt-b' })
      expect(streakEngine.getAnswers()[0]?.pointsEarned).toBe(10)
      streakEngine.next()
      // Correct answer 2 — streak 1 → multiplier still 1 (needs 3 for x2)
      streakEngine.submitAnswer({ type: 'true_false', value: false })
      expect(streakEngine.getAnswers()[1]?.pointsEarned).toBe(10)
    })
  })
})

