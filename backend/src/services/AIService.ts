import OpenAI from 'openai';

interface SymptomAnalysisRequest {
  symptoms: string;
  age?: number;
  gender?: string;
  medicalHistory?: string[];
}

interface SymptomAnalysisResponse {
  severity: 'low' | 'medium' | 'high' | 'urgent';
  possibleConditions: string[];
  recommendations: string[];
  urgencyLevel: string;
  nextSteps: string[];
  disclaimer: string;
  confidence: number;
}

export class AIService {
  private static openai: OpenAI | null = null;

  /**
   * Intelligent symptom mapping for critical cases when AI fails
   */
  private static getEmergencySymptomMapping(symptoms: string): { 
    severity: 'low' | 'medium' | 'high' | 'urgent', 
    specializations: string[],
    isEmergency: boolean 
  } {
    const symptomLower = symptoms.toLowerCase();
    
    // CRITICAL/EMERGENCY symptoms - cardiac warning signs
    if (symptomLower.includes('chest pain') && (
        symptomLower.includes('sweat') || 
        symptomLower.includes('short') ||
        symptomLower.includes('breath') ||
        symptomLower.includes('dizz') ||
        (symptomLower.includes('nausea') && !symptomLower.includes('bloat') && !symptomLower.includes('gas'))
      )) {
      return {
        severity: 'urgent',
        specializations: ['Cardiology', 'Emergency Medicine', 'Internal Medicine'],
        isEmergency: true
      };
    }

    // Chest pain with digestive symptoms - likely gastric
    if (symptomLower.includes('chest pain') && (
        symptomLower.includes('burp') ||
        symptomLower.includes('bloat') ||
        symptomLower.includes('gas') ||
        symptomLower.includes('fart') ||
        symptomLower.includes('acid') ||
        symptomLower.includes('heartburn')
      )) {
      return {
        severity: 'medium',
        specializations: ['Gastroenterology', 'Internal Medicine'],
        isEmergency: false
      };
    }

    // Chest pain (any other) - could be cardiac or respiratory
    if (symptomLower.includes('chest pain') || symptomLower.includes('chest discomfort')) {
      return {
        severity: 'high',
        specializations: ['Cardiology', 'Internal Medicine', 'Pulmonology'],
        isEmergency: false
      };
    }

    // Abdominal/Gastric symptoms
    if (symptomLower.includes('stomach') || symptomLower.includes('abdom') || 
        symptomLower.includes('nausea') || symptomLower.includes('vomit') ||
        symptomLower.includes('bloat') || symptomLower.includes('indigestion')) {
      return {
        severity: 'medium',
        specializations: ['Gastroenterology', 'Internal Medicine'],
        isEmergency: false
      };
    }

    // Neurological symptoms
    if (symptomLower.includes('headache') || symptomLower.includes('migraine') ||
        symptomLower.includes('dizz') || symptomLower.includes('confusion')) {
      return {
        severity: 'medium',
        specializations: ['Neurology', 'Internal Medicine'],
        isEmergency: false
      };
    }

    // Respiratory symptoms
    if (symptomLower.includes('cough') || symptomLower.includes('breath') ||
        symptomLower.includes('asthma') || symptomLower.includes('wheez')) {
      return {
        severity: 'medium',
        specializations: ['Pulmonology', 'Internal Medicine'],
        isEmergency: false
      };
    }

    // Skin issues
    if (symptomLower.includes('rash') || symptomLower.includes('itch') ||
        symptomLower.includes('skin') || symptomLower.includes('allerg')) {
      return {
        severity: 'low',
        specializations: ['Dermatology', 'Internal Medicine'],
        isEmergency: false
      };
    }

    // Default fallback
    return {
      severity: 'medium',
      specializations: ['Internal Medicine', 'General Practice'],
      isEmergency: false
    };
  }

  /**
   * Initialize OpenAI client
   */
  private static getOpenAIClient(): OpenAI {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      this.openai = new OpenAI({
        apiKey: apiKey
      });
    }
    return this.openai;
  }

  /**
   * Analyze symptoms using OpenAI
   */
  static async analyzeSymptoms(request: SymptomAnalysisRequest): Promise<SymptomAnalysisResponse> {
    try {
      const openai = this.getOpenAIClient();
      
      const systemPrompt = `You are an expert medical AI trained in symptom analysis and triage. Analyze symptoms using pattern recognition and clinical reasoning.

CRITICAL ANALYSIS PRINCIPLES:
1. **Pattern Recognition**: Look for symptom constellations, not isolated symptoms
2. **Context Matters**: Consider age, gender, medical history when provided
3. **Severity Assessment**: 
   - URGENT: Life-threatening patterns (chest pain + sweating/SOB, severe bleeding, altered consciousness)
   - HIGH: Serious conditions needing prompt care (persistent chest pain, severe abdominal pain)
   - MEDIUM: Conditions needing medical evaluation within days
   - LOW: Minor issues suitable for self-care or routine appointment

EXAMPLES OF PATTERN RECOGNITION:
- "Chest pain + sweating + nausea" → URGENT cardiac event (MI, angina)
- "Chest pain + burping + bloating + gas" → MEDIUM gastric issue (GERD, gastritis, gas)
- "Stomach pain + nausea + vomiting + fever" → MEDIUM-HIGH gastroenteritis/appendicitis
- "Headache + neck stiffness + fever" → URGENT meningitis concern
- "Abdominal pain + bloating + gas + burping" → MEDIUM digestive issue (IBS, gastritis)

Return ONLY valid JSON format:
{
  "severity": "low|medium|high|urgent",
  "possibleConditions": ["most likely based on pattern", "second possibility", "third possibility"],
  "recommendations": ["immediate action if needed", "self-care advice", "monitoring guidance"],
  "urgencyLevel": "specific description with timeline",
  "nextSteps": ["clear next action", "follow-up plans", "warning signs to watch"],
  "confidence": 0.75
}

Analyze the complete symptom pattern, not individual symptoms. Be precise about urgency.`;

      const userPrompt = `Please analyze these symptoms: "${request.symptoms}"
      
${request.age ? `Patient age: ${request.age}` : ''}
${request.gender ? `Patient gender: ${request.gender}` : ''}
${request.medicalHistory?.length ? `Medical history: ${request.medicalHistory.join(', ')}` : ''}

Provide a thorough analysis with possible conditions, recommendations, and appropriate urgency level.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 1500
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      let analysisData;
      try {
        analysisData = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('Failed to parse OpenAI response:', responseContent);
        // Fallback to a structured response if JSON parsing fails
        throw new Error('Failed to parse AI response');
      }

      const response: SymptomAnalysisResponse = {
        severity: analysisData.severity || 'medium',
        possibleConditions: analysisData.possibleConditions || ['Condition assessment needed'],
        recommendations: analysisData.recommendations || ['Consult a healthcare provider'],
        urgencyLevel: analysisData.urgencyLevel || 'Consult with a healthcare provider',
        nextSteps: analysisData.nextSteps || ['Schedule an appointment with your doctor'],
        disclaimer: 'This AI analysis is for informational purposes only and should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare professionals for medical concerns.',
        confidence: analysisData.confidence || 0.7
      };

      return response;

    } catch (error) {
      console.error('Error in AI symptom analysis:', error);
      
      // Use intelligent symptom mapping as fallback
      const emergencyMapping = this.getEmergencySymptomMapping(request.symptoms);
      const isQuotaError = error instanceof Error && error.message.includes('quota');
      
      // Critical symptoms get emergency response even when AI fails
      if (emergencyMapping.isEmergency) {
        return {
          severity: 'urgent',
          possibleConditions: [
            'Potential cardiac event requiring immediate evaluation',
            'Chest pain with associated symptoms (sweating, shortness of breath)',
            'Possible heart attack or angina'
          ],
          recommendations: [
            '🚨 SEEK IMMEDIATE MEDICAL ATTENTION',
            'Go to nearest emergency room or call emergency services',
            'Do not drive yourself - have someone else drive or call ambulance',
            'Chew aspirin if not allergic and no contraindications'
          ],
          urgencyLevel: '🚨 URGENT - Immediate medical attention required',
          nextSteps: [
            'Call emergency services (911) immediately',
            'Go to nearest emergency room',
            'Contact cardiologist for follow-up after emergency evaluation'
          ],
          disclaimer: 'This assessment is based on symptom pattern recognition. Chest pain with sweating requires immediate medical evaluation to rule out cardiac events.',
          confidence: 0.85
        };
      }
      
      // For other symptoms, provide intelligent fallback based on pattern matching
      return {
        severity: emergencyMapping.severity,
        possibleConditions: [`Symptoms suggest ${emergencyMapping.specializations[0].toLowerCase()} evaluation needed`],
        recommendations: [
          `Consult with a ${emergencyMapping.specializations[0]} specialist`,
          'Monitor symptoms and seek care if they worsen',
          'Keep a symptom diary for your healthcare provider'
        ],
        urgencyLevel: emergencyMapping.severity === 'high' ? 'High priority - prompt evaluation needed' : 'Moderate - professional consultation recommended',
        nextSteps: [`Schedule appointment with ${emergencyMapping.specializations[0]}`],
        disclaimer: isQuotaError ? 
          '⚠️ OpenAI quota exceeded - please check billing at platform.openai.com. Using backup symptom analysis.' :
          'AI analysis failed. Assessment based on symptom pattern recognition. Please seek professional medical advice.',
        confidence: 0.7
      };
    }
  }

  /**
   * Get doctor recommendations based on symptoms
   */
  static async recommendDoctors(symptoms: string, location?: string): Promise<string[]> {
    try {
      const openai = this.getOpenAIClient();
      
      const systemPrompt = `You are an expert medical triage specialist. Your job is to recommend the most appropriate medical specializations based on symptom patterns.

SPECIALIZATION MAPPING PRINCIPLES:
1. **Pattern-Based Recommendations**: Match symptom constellations to appropriate specialists
2. **Primary vs Secondary**: Order by most relevant first
3. **Context Consideration**: Account for symptom combinations

KEY MAPPING EXAMPLES:
- Chest pain + sweating/SOB → Cardiology, Emergency Medicine
- Chest pain + burping/bloating/gas → Gastroenterology, Internal Medicine  
- Stomach pain + nausea + digestive issues → Gastroenterology
- Headaches + neurological signs → Neurology
- Skin issues + rashes → Dermatology
- Breathing problems → Pulmonology
- Joint pain + swelling → Rheumatology
- Urinary symptoms → Urology
- Mental health concerns → Psychiatry, Psychology

Return ONLY the top 2-3 most appropriate specialization names, one per line.
Focus on symptom-specific specialists first, then general medicine if needed.`;

      const userPrompt = `Analyze these symptoms and recommend appropriate medical specializations: "${symptoms}"

Based on the symptom pattern, what are the 2-3 most appropriate medical specializations to consult?`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 150
      });

      const responseContent = completion.choices[0].message.content;
      if (!responseContent) {
        return ['General Practice'];
      }

      // Parse specializations from response
      const specializations = responseContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .slice(0, 3); // Limit to top 3 recommendations

      return specializations.length > 0 ? specializations : ['General Practice'];

    } catch (error) {
      console.error('Error getting doctor recommendations:', error);
      
      // Use intelligent symptom mapping as fallback for doctor recommendations
      const emergencyMapping = this.getEmergencySymptomMapping(symptoms);
      
      return emergencyMapping.specializations;
    }
  }
} 