import { GoogleGenerativeAI } from '@google/generative-ai';

export interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required: string[];
  };
  handler: (args: any) => Promise<any>;
}

export interface SymptomAnalysisInput {
  symptoms: string;
  age?: number;
  gender?: string;
  medicalHistory?: string[];
}

export interface SymptomAnalysisOutput {
  severity: 'low' | 'medium' | 'high' | 'emergency';
  possibleConditions: string[];
  recommendations: string[];
  urgencyLevel: string;
  nextSteps: string[];
  confidence: number;
  recommendedSpecializations: string[];
  clarifyingQuestions?: string[];
  warning?: string;
  processingMethod?: string;
  fallbackReason?: string;
  costUsed?: string;
}

export interface SymptomNormalizationOutput {
  normalizedSymptoms: string;
  detectedSymptoms: string[];
  possibleTypos: string[];
  confidence: number;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export class MCPService {
  private static geminiClient: GoogleGenerativeAI | null = null;
  private static tools: Map<string, MCPTool> = new Map();

  private static getGeminiClient(): GoogleGenerativeAI | null {
    if (!GEMINI_API_KEY) {
      return null;
    }
    if (!this.geminiClient) {
      this.geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
    }
    return this.geminiClient;
  }

  static registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  static getOpenAIFunctions(): any[] {
    return Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }

  static async executeTool(toolName: string, args: any): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }
    return await tool.handler(args);
  }

  static async chatWithTools(messages: any[], tools: string[] = []): Promise<any> {
    try {
      return await this.analyzeWithFallback(messages[0]?.content || '', {});
    } catch (error: any) {
      throw new Error(`MCP chat failed: ${error.message}`);
    }
  }

  static async analyzeWithFallback(
    symptoms: string, 
    options: { age?: number; gender?: string; medicalHistory?: string[] } = {}
  ): Promise<SymptomAnalysisOutput> {
    try {
      if (GEMINI_API_KEY) {
        const result = await this.analyzeWithGemini(symptoms, options);
        return {
          ...result,
          processingMethod: 'gemini',
          costUsed: 'Gemini AI (~$0.0005-0.002 per request - Very cheap!)'
        };
      } else {
        throw new Error('No valid Gemini API key configured');
      }
    } catch (error: any) {
      const result = await this.analyzeWithLocalFallback(symptoms, options);
      return {
        ...result,
        processingMethod: 'local-fallback',
        fallbackReason: `Gemini unavailable: ${error.message}`,
        costUsed: 'Local Analysis (Free - No internet required)'
      };
    }
  }

  private static async analyzeWithGemini(
    symptoms: string,
    options: { age?: number; gender?: string; medicalHistory?: string[] }
  ): Promise<SymptomAnalysisOutput> {
    const genAI = this.getGeminiClient();
    if (!genAI) throw new Error('Gemini AI client not available');

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash-latest',
      generationConfig: {
        temperature: 0.2,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 1024
      }
    });

    const systemPrompt = `You are an expert medical AI tool that analyzes symptoms with clinical precision.

IMPORTANT: You are NOT providing medical diagnoses. You're helping patients understand their symptoms and get appropriate care.

Instructions:
1. Analyze the symptoms provided
2. Suggest severity level (low/medium/high/emergency)
3. List possible conditions (general health conditions, not specific diagnoses)
4. Recommend appropriate medical specializations
5. Provide next steps and urgency level
6. Include a confidence score (0.0-1.0)
7. Add a disclaimer about seeking professional medical advice

Respond ONLY in this JSON format:
{
  "severity": "low|medium|high|emergency",
  "possibleConditions": ["condition1", "condition2"],
  "recommendations": ["recommendation1", "recommendation2"],
  "urgencyLevel": "description of urgency",
  "nextSteps": ["step1", "step2"],
  "confidence": 0.0-1.0,
  "recommendedSpecializations": ["specialization1", "specialization2"],
  "clarifyingQuestions": ["question1", "question2"] (optional),
  "warning": "disclaimer text" (optional)
}`;

    const { age, gender, medicalHistory } = options;
    
    const userPrompt = `Please analyze these symptoms: "${symptoms}"

Additional context:
${age ? `Age: ${age}` : 'Age: Not provided'}
${gender ? `Gender: ${gender}` : 'Gender: Not provided'}
${medicalHistory?.length ? `Medical History: ${medicalHistory.join(', ')}` : 'Medical History: None provided'}

Provide your analysis in the exact JSON format specified.`;

    try {
      const result = await model.generateContent([systemPrompt, userPrompt]);
      const response = await result.response;
      const responseContent = response.text();

      try {
        const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON found in response');
        
        const analysis = JSON.parse(jsonMatch[0]);
        
        return {
          severity: analysis.severity || 'medium',
          possibleConditions: analysis.possibleConditions || ['General symptoms requiring evaluation'],
          recommendations: analysis.recommendations || ['Consult with a healthcare provider'],
          urgencyLevel: analysis.urgencyLevel || 'consult soon',
          nextSteps: analysis.nextSteps || ['Schedule appointment with doctor'],
          confidence: analysis.confidence || 0.7,
          recommendedSpecializations: analysis.recommendedSpecializations || ['General Medicine'],
          clarifyingQuestions: analysis.clarifyingQuestions,
          warning: analysis.warning,
          processingMethod: 'gemini',
          costUsed: `Gemini AI gemini-1.5-flash-latest (~$0.0005-0.002 per request)`
        };
      } catch (parseError) {
        throw new Error('Invalid JSON response from Gemini');
      }
    } catch (error: any) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
  }

  private static async analyzeWithLocalFallback(
    symptoms: string,
    options: { age?: number; gender?: string; medicalHistory?: string[] }
  ): Promise<SymptomAnalysisOutput> {
    const symptomLower = symptoms.toLowerCase();
    
    // Emergency keywords
    const emergencyKeywords = [
      'chest pain', 'difficulty breathing', 'can\'t breathe', 'heart attack', 'stroke',
      'severe bleeding', 'unconscious', 'choking', 'severe pain', 'suicide',
      'overdose', 'allergic reaction', 'anaphylaxis', 'seizure'
    ];
    
    // High severity keywords
    const highSeverityKeywords = [
      'severe', 'intense', 'unbearable', 'excruciating', 'blood', 'vomiting blood',
      'high fever', 'confusion', 'dizziness', 'fainting', 'blurred vision'
    ];
    
    // Common condition mappings
    const conditionMappings: Record<string, { conditions: string[], specializations: string[] }> = {
      'headache': {
        conditions: ['Tension headache', 'Migraine', 'Cluster headache'],
        specializations: ['General Medicine', 'Neurology']
      },
      'stomach': {
        conditions: ['Gastritis', 'Indigestion', 'Food poisoning'],
        specializations: ['General Medicine', 'Gastroenterology']
      },
      'cough': {
        conditions: ['Common cold', 'Bronchitis', 'Respiratory infection'],
        specializations: ['General Medicine', 'Pulmonology']
      },
      'fever': {
        conditions: ['Viral infection', 'Bacterial infection', 'Flu'],
        specializations: ['General Medicine', 'Internal Medicine']
      },
      'back pain': {
        conditions: ['Muscle strain', 'Herniated disc', 'Spinal issues'],
        specializations: ['General Medicine', 'Orthopedics', 'Neurology']
      }
    };

    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'emergency' = 'medium';
    let urgencyLevel = 'Schedule appointment within a few days';
    
    if (emergencyKeywords.some(keyword => symptomLower.includes(keyword))) {
      severity = 'emergency';
      urgencyLevel = 'Seek immediate emergency care - call 911 or go to ER';
    } else if (highSeverityKeywords.some(keyword => symptomLower.includes(keyword))) {
      severity = 'high';
      urgencyLevel = 'Schedule appointment within 24-48 hours';
    } else if (symptomLower.includes('mild') || symptomLower.includes('slight')) {
      severity = 'low';
      urgencyLevel = 'Schedule appointment when convenient';
    }

    // Find matching conditions and specializations
    let possibleConditions = ['General symptoms requiring medical evaluation'];
    let recommendedSpecializations = ['General Medicine'];
    
    for (const [keyword, mapping] of Object.entries(conditionMappings)) {
      if (symptomLower.includes(keyword)) {
        possibleConditions = mapping.conditions;
        recommendedSpecializations = mapping.specializations;
        break;
      }
    }

    return {
      severity,
      possibleConditions,
      recommendations: [
        'Consult with a healthcare provider for proper evaluation',
        'Monitor symptoms and note any changes',
        'Keep a symptom diary',
        'Follow up if symptoms worsen or persist'
      ],
      urgencyLevel,
      nextSteps: [
        'Schedule appointment with appropriate healthcare provider',
        'Prepare list of symptoms and their duration',
        'Bring any relevant medical records',
        'Note any medications currently taking'
      ],
      confidence: 0.6,
      recommendedSpecializations,
      clarifyingQuestions: [
        'How long have you been experiencing these symptoms?',
        'Have you tried any treatments or medications?',
        'Are there any triggers that make symptoms worse?'
      ],
      warning: 'This is a basic symptom assessment. Please consult with a qualified healthcare provider for proper medical evaluation and diagnosis.',
      processingMethod: 'local-fallback',
      costUsed: 'Local Analysis (Free - No internet required)'
    };
  }

  static async analyzeSymptoms(input: SymptomAnalysisInput): Promise<SymptomAnalysisOutput> {
    const { symptoms, age, gender, medicalHistory } = input;
    return await this.analyzeWithFallback(symptoms, { age, gender, medicalHistory });
  }

  static async normalizeSymptoms(input: { symptoms: string }): Promise<SymptomNormalizationOutput> {
    const { symptoms } = input;
    
    // Basic normalization
    const normalizedSymptoms = symptoms
      .trim()
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');

    return {
      normalizedSymptoms: symptoms, // Return original for now
      detectedSymptoms: [symptoms],
      possibleTypos: [], // Could implement spell checking here
      confidence: 0.8
    };
  }

  static async analyzeWithMCP(
    symptoms: string,
    options: { age?: number; gender?: string; medicalHistory?: string[] } = {}
  ): Promise<any> {
    try {
      const [normalization, analysis] = await Promise.all([
        this.normalizeSymptoms({ symptoms }),
        this.analyzeSymptoms({ symptoms, ...options })
      ]);

      return {
        analysis,
        normalization,
        conversation: `Symptom analysis completed successfully.`,
        meta: {
          toolsUsed: ['normalizeSymptoms', 'symptomChecker'],
          processingMethod: analysis.processingMethod || 'MCP',
          confidence: analysis.confidence
        }
      };
    } catch (error: any) {
      throw new Error(`MCP analysis failed: ${error.message}`);
    }
  }
}

// Register MCP tools
MCPService.registerTool({
  name: 'symptomChecker',
  description: 'Analyze patient symptoms and provide medical recommendations',
  parameters: {
    type: 'object',
    properties: {
      symptoms: { type: 'string', description: 'Patient-described symptoms' },
      age: { type: 'number', description: 'Patient age' },
      gender: { type: 'string', description: 'Patient gender' },
      medicalHistory: { type: 'array', items: { type: 'string' }, description: 'Medical history' }
    },
    required: ['symptoms']
  },
  handler: MCPService.analyzeSymptoms
});

MCPService.registerTool({
  name: 'normalizeSymptoms',
  description: 'Clean and normalize symptom descriptions',
  parameters: {
    type: 'object',
    properties: {
      symptoms: { type: 'string', description: 'Raw symptom description' }
    },
    required: ['symptoms']
  },
  handler: MCPService.normalizeSymptoms
}); 