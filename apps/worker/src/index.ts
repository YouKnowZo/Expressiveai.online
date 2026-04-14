import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { HfInference } from '@huggingface/inference';
import { exec } from 'child_process';
import { promisify } from 'util';
import sharp from 'sharp';
import dotenv from 'dotenv';

dotenv.config();

const execAsync = promisify(exec);
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const supabase = createClient(
  process.env.SUPABASE_URL || 'http://localhost',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'anon'
);
const hf = new HfInference(process.env.HF_TOKEN || '');

const worker = new Worker('video-generation', async (job) => {
  const { videoId, prompt, length, dbUserId, isArtistic, modelHint, quality } = job.data as {
    videoId: string;
    prompt: string;
    length: number;
    dbUserId: string;
    isArtistic?: boolean;
    modelHint?: string;
    quality?: 'economy' | 'standard' | 'premium';
  };
  console.log(`Processing video ${videoId}: "${prompt.substring(0, 50)}..."`);
  
  try {
    // Update status
    await supabase.from('videos').update({ status: 'processing', progress: 10 }).eq('id', videoId);
    
    // Call Hugging Face API for video generation
    const artisticPrefix = isArtistic ? "Artistic interpretation of: " : "";
    const fullPrompt = artisticPrefix + prompt;
    
    // Determine model based on length
    const model = modelHint || (length <= 10
      ? 'damo-vilab/text-to-video-ms-1.7b'
      : 'ali-vilab/text-to-video-ms-2.5b');
      
    await supabase.from('videos').update({ progress: 30 }).eq('id', videoId);
    
    // Generate video
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.HF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs: fullPrompt }),
    });

    if (!response.ok) {
      throw new Error(`HF API error: ${response.statusText}`);
    }

    const videoBlob = await response.blob();
    
    await supabase.from('videos').update({ progress: 80 }).eq('id', videoId);

    // Convert blob to array buffer
    const arrayBuffer = await videoBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('videos')
      .upload(`${videoId}.mp4`, buffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Failed to upload video to storage: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrlData } = supabase.storage.from('videos').getPublicUrl(`${videoId}.mp4`);
    const videoUrl = publicUrlData.publicUrl;

    // Use placeholder thumbnail
    const thumbnailUrl = `https://storage.expressiveai.online/thumbnails/placeholder.jpg`;
    
    // Add forensic watermark (metadata only in this version)
    await supabase.from('videos').update({
      status: 'completed',
      video_url: videoUrl,
      thumbnail_url: thumbnailUrl,
      progress: 100,
      completed_at: new Date().toISOString(),
      model_used: `${model}${quality ? ` (${quality})` : ''}`
    }).eq('id', videoId);
    
    console.log(`✅ Video ${videoId} completed`);
    
    // Send notification (simplified)
    await supabase.from('notifications').insert({
      user_id: dbUserId,
      type: 'video_ready',
      title: 'Your video is ready!',
      message: `"${prompt.substring(0, 50)}..." has been generated.`,
      data: { videoId },
    });
    
    return { videoId, videoUrl, thumbnailUrl };
    
  } catch (error) {
    console.error(`Failed to process video ${videoId}:`, error);
    await supabase.from('videos').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error'
    }).eq('id', videoId);
    throw error;
  }
}, { connection: redis });

console.log('🎬 Video processing worker started');

// Graceful shutdown
process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
