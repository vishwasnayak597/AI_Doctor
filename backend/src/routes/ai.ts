import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { AIService } from '../services/AIService';
import { MCPService } from '../services/MCPService';
import { startTriage, answerTriage, getTriageMeta } from '../services/TriageService';

import { authenticate } from '../middleware/auth';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

const router = Router();

/**
 * POST /api/ai/analyze-symptoms
 * Analyze symptoms using AI
 */
router.post('/analyze-symptoms', [
  authenticate,
  body('symptoms')
    .notEmpty()
    .withMessage('Symptoms description is required')
    .isLength({ min: 5, max: 2000 })
    .withMessage('Symptoms description must be between 5 and 2000 characters'),
  body('age')
    .optional()
    .isInt({ min: 0, max: 150 })
    .withMessage('Age must be a valid number between 0 and 150'),
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other', 'prefer-not-to-say'])
    .withMessage('Gender must be a valid option'),
  body('medicalHistory')
    .optional()
    .isArray()
    .withMessage('Medical history must be an array')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        data: errors.array()
      });
    }

    const { symptoms, age, gender, medicalHistory } = req.body;

    // Call AI service to analyze symptoms
    const analysis = await AIService.analyzeSymptoms({
      symptoms,
      age,
      gender,
      medicalHistory
    });

    const response: ApiResponse<any> = {
      success: true,
      data: {
        analysis,
        timestamp: new Date().toISOString(),
        userId: req.user?._id
      },
      message: 'Symptom analysis completed successfully'
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in symptom analysis:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to analyze symptoms. Please try again.',
      data: null
    });
  }
});

/**
 * POST /api/ai/recommend-doctors
 * Get doctor specialization recommendations based on symptoms
 */
router.post('/recommend-doctors', [
  authenticate,
  body('symptoms')
    .notEmpty()
    .withMessage('Symptoms description is required')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Symptoms description must be between 5 and 1000 characters'),
  body('location')
    .optional()
    .isString()
    .withMessage('Location must be a string')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        data: errors.array()
      });
    }

    const { symptoms, location } = req.body;

    // Get doctor recommendations from AI
    const recommendations = await AIService.recommendDoctors(symptoms, location);

    const response: ApiResponse<any> = {
      success: true,
      data: {
        recommendations,
        symptoms,
        location,
        timestamp: new Date().toISOString()
      },
      message: 'Doctor recommendations generated successfully'
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Error in doctor recommendation:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to get doctor recommendations. Please try again.',
      data: null
    });
  }
});

/**
 * POST /api/ai/analyze-and-recommend
 * Analyze symptoms and recommend doctors in one call
 */
router.post('/analyze-and-recommend', [
  authenticate,
  body('symptoms')
    .notEmpty()
    .withMessage('Symptoms are required')
    .isLength({ min: 5 })
    .withMessage('Symptoms must be at least 5 characters long'),
  body('location')
    .optional()
    .isString()
    .withMessage('Location must be a string')
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        data: errors.array()
      });
    }

    const { symptoms, age, gender, medicalHistory, location } = req.body;


    // Analyze symptoms and get doctor recommendations in parallel
    const [analysis, recommendations] = await Promise.all([
      AIService.analyzeSymptoms({
        symptoms,
        age,
        gender,
        medicalHistory
      }),
      AIService.recommendDoctors(symptoms, location)
    ]);


    const response: ApiResponse<any> = {
      success: true,
      data: {
        analysis,
        recommendedSpecializations: recommendations,
        location: location || 'Location not specified',
        timestamp: new Date().toISOString(),
        userId: req.user?._id
      },
      message: 'Symptom analysis and doctor recommendations completed successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Error analyzing symptoms and recommending doctors:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze symptoms and recommend doctors'
    });
  }
});

/**
 * POST /api/ai/symptom-checker-mcp - Enhanced symptom analysis with intelligent fallback
 */
router.post('/symptom-checker-mcp', [
  authenticate,
  body('symptoms').notEmpty().withMessage('Symptoms description is required').isLength({ min: 3, max: 2000 }),
  body('age').optional().isInt({ min: 0, max: 150 }),
  body('gender').optional().isIn(['male', 'female', 'other', 'prefer-not-to-say']),
  body('medicalHistory').optional().isArray(),
  body('useMCPTools').optional().isBoolean()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
    }

    const { symptoms, age, gender, medicalHistory } = req.body;
    
    
    const result = await MCPService.analyzeWithFallback(symptoms, { age, gender, medicalHistory });

    
    // Add UI feedback about which method was used
    const uiFeedback = {
      method: result.processingMethod,
      methodDescription: 
        result.processingMethod === 'openai' ? 'OpenAI GPT-4 Turbo (Premium AI Analysis)' :
        result.processingMethod === 'gemini' ? 'Gemini AI (Free & Powerful Analysis)' :
        result.processingMethod === 'local-fallback' ? 'Local Analysis (Free - No API Required)' :
        'Unknown Analysis Method',
      fallbackUsed: result.processingMethod !== 'openai' && result.processingMethod !== 'gemini',
      fallbackReason: result.fallbackReason || null,
      costInfo: result.costUsed
    };

    res.status(200).json({ 
      success: true, 
      data: {
        analysis: result,
        normalization: {
          normalizedSymptoms: symptoms,
          detectedSymptoms: [symptoms],
          possibleTypos: [],
          confidence: 0.8
        },
        conversation: `Symptom analysis completed using ${uiFeedback.methodDescription}.`,
        meta: {
          toolsUsed: ['symptomChecker'],
          processingMethod: result.processingMethod,
          confidence: result.confidence,
          uiFeedback
        }
      }
    });
  } catch (error: any) {
    console.error('Error in enhanced symptom analysis:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to perform enhanced symptom analysis',
      meta: {
        fallbackSuggestion: 'All AI services are currently unavailable. Please consult a healthcare provider directly.'
      }
    });
  }
});

/**
 * GET /api/ai/triage/meta
 * Model card: symptom vocab, diseases, and training metrics from the ML service.
 */
router.get('/triage/meta', authenticate, async (req: Request, res: Response) => {
  try {
    const meta = await getTriageMeta();
    res.status(200).json({ success: true, data: meta });
  } catch (error) {
    console.error('Error fetching triage meta:', error);
    res.status(503).json({ success: false, error: 'Triage model service unavailable' });
  }
});

/**
 * POST /api/ai/triage/start
 * Begin a sequential triage session from free-text symptoms.
 */
router.post('/triage/start', [
  authenticate,
  body('symptoms').notEmpty().withMessage('Symptoms description is required').isLength({ min: 3, max: 2000 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
    }
    const step = await startTriage(req.body.symptoms);
    res.status(200).json({ success: true, data: step });
  } catch (error) {
    console.error('Error starting triage:', error);
    res.status(503).json({ success: false, error: 'Triage model service unavailable. Please try again.' });
  }
});

/**
 * POST /api/ai/triage/answer
 * Submit accumulated yes/no evidence; returns updated posterior + next best question.
 */
router.post('/triage/answer', [
  authenticate,
  body('evidence').isObject().withMessage('evidence must be an object of symptom -> 0|1'),
  body('skip').optional().isArray()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, error: 'Validation failed', data: errors.array() });
    }
    const step = await answerTriage(req.body.evidence, req.body.skip || []);
    res.status(200).json({ success: true, data: step });
  } catch (error) {
    console.error('Error advancing triage:', error);
    res.status(503).json({ success: false, error: 'Triage model service unavailable. Please try again.' });
  }
});

/**
 * GET /api/ai/health
 * Health check for AI service
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const hasApiKey = !!process.env.OPENAI_API_KEY;
    
    res.status(200).json({
      success: true,
      data: {
        aiServiceAvailable: hasApiKey,
        timestamp: new Date().toISOString(),
        status: hasApiKey ? 'AI service ready' : 'OpenAI API key not configured'
      },
      message: 'AI service health check completed'
    });
  } catch (error) {
    console.error('Error in AI health check:', error);
    
    res.status(500).json({
      success: false,
      error: 'AI service health check failed',
      data: null
    });
  }
});



export default router; 