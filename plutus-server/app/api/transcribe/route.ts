export const dynamic = 'force-dynamic';
export const maxDuration = 300;

import { NextRequest, NextResponse } from 'next/server';
import { withEnhancedLogging } from '../../../lib/request-logger';
import logger from '../../../lib/logger';

// For now, we'll create a mock implementation
// In production, this would integrate with Amazon Transcribe
async function transcribeHandler(request: NextRequest) {
  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      logger.warn('No audio file provided in transcribe request');
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    logger.info('Transcribe request received', {
      fileName: audioFile.name,
      fileSize: audioFile.size,
      fileType: audioFile.type
    });

    // Mock transcription response for development
    // In production, this would:
    // 1. Upload audio to S3
    // 2. Start Amazon Transcribe job
    // 3. Poll for results or use webhooks
    // 4. Return transcribed text
    
    const mockResponses = [
      "Hello, how are you doing today?",
      "Can you tell me about the weather?",
      "What's the latest news?",
      "I'd like to know more about this topic.",
      "This is a test of the custom voice pipeline.",
      "The audio quality sounds great!",
      "Can you hear me clearly?",
      "Testing one, two, three."
    ];
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return random mock transcription
    const mockText = mockResponses[Math.floor(Math.random() * mockResponses.length)];
    
    logger.info('Transcription completed', {
      originalFileName: audioFile.name,
      transcribedText: mockText,
      processingTimeMs: 1500
    });

    // Track custom pipeline usage for cost monitoring
    logger.info('Custom pipeline usage', {
      pipeline: 'custom',
      service: 'amazon-transcribe',
      audioSize: audioFile.size,
      estimatedCost: 0.0004 * (audioFile.size / 1000000) // Rough estimate: $0.0004 per minute
    });

    return NextResponse.json({
      success: true,
      text: mockText,
      confidence: 0.95,
      pipeline: 'custom-amazon-transcribe',
      processingTime: 1500,
      metadata: {
        audioSize: audioFile.size,
        audioType: audioFile.type,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    logger.error('Transcription error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { 
        error: 'Transcription failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

// Export the enhanced wrapped handler
export const POST = withEnhancedLogging(transcribeHandler, {
  name: 'custom-transcribe',
  sensitiveFields: [] // No sensitive data in transcription requests
}); 