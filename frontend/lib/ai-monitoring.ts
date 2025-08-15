import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { AIMonitoringAlert, CommunityZone, EnvironmentalMetrics } from './types';

export class AIMonitoringService {
  private llm: ChatOpenAI;
  private analysisPrompt: PromptTemplate;

  constructor() {
    this.llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.3,
    });

    this.analysisPrompt = PromptTemplate.fromTemplate(`
      Analyze the following environmental monitoring data for potential issues:
      
      Zone: {zoneName}
      Location: {location}
      
      Current Metrics:
      {currentMetrics}
      
      Historical Baseline:
      {baseline}
      
      Sensor Data:
      {sensorData}
      
      Please identify:
      1. Any significant deviations from baseline
      2. Potential environmental threats
      3. Recommended actions
      4. Severity level (low/medium/high/critical)
      
      Format your response as JSON with fields: issues, threats, actions, severity
    `);
  }

  /**
   * Analyze satellite imagery for deforestation or land use changes
   */
  async analyzeSatelliteImagery(
    zoneId: string,
    imageUrl: string,
    previousImageUrl?: string
  ): Promise<any> {
    try {
      // In production, this would integrate with specialized computer vision models
      // For demo, we'll use GPT-4 Vision or similar
      const analysis = await this.llm.invoke(`
        Analyze this satellite image for signs of:
        - Deforestation or tree cover loss
        - Illegal construction or mining
        - Water body changes
        - Agricultural expansion
        
        Zone ID: ${zoneId}
        Current Image: ${imageUrl}
        ${previousImageUrl ? `Previous Image: ${previousImageUrl}` : ''}
        
        Provide detailed analysis in JSON format.
      `);

      return JSON.parse(analysis.content as string);
    } catch (error) {
      console.error('Error analyzing satellite imagery:', error);
      throw error;
    }
  }

  /**
   * Process bioacoustic data for biodiversity monitoring
   */
  async analyzeBioacousticData(
    zoneId: string,
    audioData: ArrayBuffer
  ): Promise<any> {
    try {
      // In production, this would use specialized audio analysis models
      // For demo purposes, we'll simulate the analysis
      const speciesDetected = [
        'Howler Monkey',
        'Scarlet Macaw',
        'Three-toed Sloth',
        'Jaguar (distant vocalization)'
      ];

      const biodiversityIndex = Math.random() * 30 + 70; // 70-100 range

      return {
        zoneId,
        timestamp: new Date().toISOString(),
        speciesDetected,
        biodiversityIndex: biodiversityIndex.toFixed(2),
        soundscapeHealth: 'healthy',
        anomalies: [],
        recommendations: [
          'Continue current conservation practices',
          'Monitor for seasonal migration patterns'
        ]
      };
    } catch (error) {
      console.error('Error analyzing bioacoustic data:', error);
      throw error;
    }
  }

  /**
   * Detect anomalies in environmental metrics
   */
  async detectAnomalies(
    zone: CommunityZone,
    currentMetrics: EnvironmentalMetrics,
    historicalData: EnvironmentalMetrics[]
  ): Promise<AIMonitoringAlert[]> {
    const alerts: AIMonitoringAlert[] = [];

    // Carbon sequestration anomaly detection
    const avgCarbon = historicalData.reduce(
      (sum, m) => sum + m.carbonSequestration.current, 0
    ) / historicalData.length;
    
    const carbonDeviation = Math.abs(
      currentMetrics.carbonSequestration.current - avgCarbon
    ) / avgCarbon;

    if (carbonDeviation > 0.2) {
      alerts.push({
        id: `alert-${Date.now()}-carbon`,
        zoneId: zone.id,
        type: 'biodiversity_change',
        severity: carbonDeviation > 0.4 ? 'high' : 'medium',
        description: `Carbon sequestration ${
          currentMetrics.carbonSequestration.current < avgCarbon ? 'decreased' : 'increased'
        } by ${(carbonDeviation * 100).toFixed(1)}% from average`,
        detectedAt: new Date(),
        location: zone.location,
        evidence: {
          type: 'sensor',
          data: JSON.stringify(currentMetrics.carbonSequestration)
        },
        resolved: false,
        actions: [
          'Investigate potential causes',
          'Review recent land use changes',
          'Check sensor calibration'
        ]
      });
    }

    // Biodiversity index monitoring
    if (currentMetrics.biodiversity.biodiversityIndex < 50) {
      alerts.push({
        id: `alert-${Date.now()}-biodiversity`,
        zoneId: zone.id,
        type: 'biodiversity_change',
        severity: currentMetrics.biodiversity.biodiversityIndex < 30 ? 'critical' : 'high',
        description: `Low biodiversity index detected: ${currentMetrics.biodiversity.biodiversityIndex}`,
        detectedAt: new Date(),
        location: zone.location,
        evidence: {
          type: 'sensor',
          data: JSON.stringify(currentMetrics.biodiversity)
        },
        resolved: false,
        actions: [
          'Conduct field survey',
          'Review habitat conditions',
          'Implement restoration measures'
        ]
      });
    }

    // Water quality monitoring
    if (currentMetrics.waterQuality.index < 60) {
      alerts.push({
        id: `alert-${Date.now()}-water`,
        zoneId: zone.id,
        type: 'water_pollution',
        severity: currentMetrics.waterQuality.index < 40 ? 'critical' : 'medium',
        description: `Water quality below acceptable levels: ${currentMetrics.waterQuality.index}`,
        detectedAt: new Date(),
        location: zone.location,
        evidence: {
          type: 'sensor',
          data: JSON.stringify(currentMetrics.waterQuality)
        },
        resolved: false,
        actions: [
          'Identify pollution sources',
          'Collect water samples',
          'Notify environmental authorities'
        ]
      });
    }

    return alerts;
  }

  /**
   * Generate conservation recommendations based on zone data
   */
  async generateRecommendations(
    zone: CommunityZone,
    metrics: EnvironmentalMetrics,
    alerts: AIMonitoringAlert[]
  ): Promise<string[]> {
    const prompt = await this.analysisPrompt.format({
      zoneName: zone.name,
      location: JSON.stringify(zone.location),
      currentMetrics: JSON.stringify(metrics),
      baseline: JSON.stringify({
        carbonBaseline: metrics.carbonSequestration.baseline,
        biodiversityTarget: 75,
        waterQualityTarget: 80,
        soilHealthTarget: 70
      }),
      sensorData: JSON.stringify(alerts)
    });

    try {
      const response = await this.llm.invoke(prompt);
      const analysis = JSON.parse(response.content as string);
      
      return analysis.actions || [
        'Maintain current conservation practices',
        'Continue regular monitoring',
        'Engage local community in conservation efforts'
      ];
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return [
        'Continue monitoring zone health',
        'Review recent environmental changes',
        'Consult with conservation experts'
      ];
    }
  }

  /**
   * Process citizen science submissions
   */
  async processCitizenSubmission(
    zoneId: string,
    submission: {
      type: 'observation' | 'photo' | 'audio' | 'report';
      data: string;
      description: string;
      location: { latitude: number; longitude: number };
      submittedBy: string;
    }
  ): Promise<any> {
    try {
      const analysisPrompt = `
        Analyze this citizen science submission:
        Type: ${submission.type}
        Description: ${submission.description}
        Location: ${JSON.stringify(submission.location)}
        Zone: ${zoneId}
        
        ${submission.type === 'photo' ? `Image: ${submission.data}` : ''}
        ${submission.type === 'report' ? `Report: ${submission.data}` : ''}
        
        Determine:
        1. Validity and quality of the submission
        2. Species or environmental features identified
        3. Conservation significance
        4. Recommended follow-up actions
        
        Format as JSON.
      `;

      const response = await this.llm.invoke(analysisPrompt);
      const analysis = JSON.parse(response.content as string);

      return {
        submissionId: `cs-${Date.now()}`,
        zoneId,
        ...submission,
        analysis,
        verified: analysis.validity > 0.7,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error processing citizen submission:', error);
      throw error;
    }
  }

  /**
   * Calculate environmental impact scores
   */
  calculateImpactScore(metrics: EnvironmentalMetrics): number {
    const weights = {
      carbon: 0.3,
      biodiversity: 0.3,
      water: 0.2,
      soil: 0.2
    };

    const carbonScore = Math.min(100, (metrics.carbonSequestration.change + 100) / 2);
    const biodiversityScore = metrics.biodiversity.biodiversityIndex;
    const waterScore = metrics.waterQuality.index;
    const soilScore = metrics.soilHealth.fertility;

    const totalScore = 
      carbonScore * weights.carbon +
      biodiversityScore * weights.biodiversity +
      waterScore * weights.water +
      soilScore * weights.soil;

    return Math.round(totalScore);
  }

  /**
   * Predict future environmental trends
   */
  async predictTrends(
    zone: CommunityZone,
    historicalData: EnvironmentalMetrics[]
  ): Promise<any> {
    // Simple trend analysis - in production would use sophisticated ML models
    const recentData = historicalData.slice(-12); // Last 12 data points
    
    const carbonTrend = this.calculateTrend(
      recentData.map(d => d.carbonSequestration.current)
    );
    
    const biodiversityTrend = this.calculateTrend(
      recentData.map(d => d.biodiversity.biodiversityIndex)
    );

    return {
      zoneId: zone.id,
      predictions: {
        carbon: {
          trend: carbonTrend > 0 ? 'increasing' : 'decreasing',
          projectedChange: carbonTrend,
          confidence: 0.75
        },
        biodiversity: {
          trend: biodiversityTrend > 0 ? 'improving' : 'declining',
          projectedChange: biodiversityTrend,
          confidence: 0.70
        }
      },
      recommendations: await this.generateRecommendations(
        zone,
        recentData[recentData.length - 1],
        []
      )
    };
  }

  private calculateTrend(data: number[]): number {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = data.reduce((a, b) => a + b, 0);
    const sumXY = data.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }
}