/**
 * ExpressiveAI Video Generation Worker
 * ─────────────────────────────────────
 * Processes video generation jobs from the BullMQ queue.
 *
 * Pipeline:
 *  1. Update DB status → processing
 *  2. Call Hugging Face Inference API for video generation
 *  3. Save raw video to tmp filesystem
 *  4. Render the requested duration (loop the generated scene if needed)
 *  5. Embed forensic metadata and upload the video to Supabase Storage
 *  6. Update DB status → completed with public URL
 *  7. Send in-app notification
 *  8. Cleanup tmp files (always, even on error)
 */

import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import dotenv from 'dotenv';
import { validateRuntimeEnv } from './config';
import { addForensicWatermark } from './utils/watermark';
import {
  generateSourceVideo,
  probeVideoDuration,
  renderVideoToDuration,
  uploadVideoResumable,
} from './utils/video-processing';

const TARGET_DURATION_TOLERANCE_SECONDS = 0.5;

dotenv.config();
validateRuntimeEnv(process.env, process.env.NODE_ENV === 'production');

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null, // required by BullMQ
});

const supabase = createClient(
  process.env.SUPABASE_URL    || 'http://localhost',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'anon'
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Update DB progress without throwing on transient errors. */
async function setProgress(videoId: string, progress: number, extra?: Record<string, unknown>) {
  try {
    await supabase
      .from('videos')
      .update({ progress, ...extra })
      .eq('id', videoId);
  } catch (err) {
    console.warn(`[worker] setProgress(${videoId}, ${progress}) error:`, err);
  }
}

/** Safely delete a file — swallows ENOENT. */
async function unlinkSafe(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    if (err?.code !== 'ENOENT') {
      console.warn(`[worker] Failed to delete tmp file ${filePath}:`, err?.message);
    }
  }
}

// ---------------------------------------------------------------------------
// Job processor
// ---------------------------------------------------------------------------
const worker = new Worker(
  'video-generation',
  async (job) => {
    const {
      videoId,
      prompt,
      length,
      clerkId,
      dbUserId,
      isArtistic,
      negativePrompt,
    } = job.data as {
      videoId:       string;
      prompt:        string;
      length:        number;
      clerkId:       string;
      dbUserId:      string;
      negativePrompt?: string;
      isArtistic?:   boolean;
    };

    const tmpDir       = os.tmpdir();
    const rawPath      = path.join(tmpDir, `${videoId}-raw.mp4`);
    const renderedPath = path.join(tmpDir, `${videoId}-rendered.mp4`);
    const signedPath   = path.join(tmpDir, `${videoId}-wm.mp4`);

    console.log(`[worker] ▶ Processing video ${videoId}: "${prompt.substring(0, 60)}…"`);
    try {
      // ── Step 1: Mark as processing ────────────────────────────────────
      await setProgress(videoId, 10, { status: 'processing' });

      // ── Step 2: Generate one short scene with a live HF video provider ──
      // Wan/Fal creates a supported short source clip; FFmpeg below extends it
      // to the requested runtime instead of asking the model for hundreds of frames.
      const model = process.env.HUGGINGFACE_MODEL_ID || 'Wan-AI/Wan2.1-T2V-1.3B';
      const fullPrompt = isArtistic ? `Artistic interpretation of: ${prompt}` : prompt;

      console.log(`[worker] Requesting short source scene from HF model ${model}…`);
      await generateSourceVideo({
        modelId: model,
        prompt: fullPrompt,
        negativePrompt,
        token: process.env.HF_TOKEN || '',
        outputPath: rawPath,
        onProgress: (progress) => setProgress(videoId, progress),
      });

      const sourceDuration = await probeVideoDuration(rawPath);
      if (sourceDuration < 0.5) {
        throw new Error('The video provider returned an unexpectedly short or empty MP4 scene.');
      }
      console.log(`[worker] Received a ${sourceDuration.toFixed(2)}s source scene from HF`);

      // ── Step 3: Extend the generated scene to the requested runtime ────
      console.log(`[worker] Rendering ${length}s MP4 → ${renderedPath}`);
      let lastRenderProgress = 61;
      await renderVideoToDuration({
        inputPath: rawPath,
        outputPath: renderedPath,
        seconds: length,
        onProgress: (progress) => {
          const renderProgress = Math.min(78, 62 + Math.floor(progress * 16));
          if (renderProgress > lastRenderProgress) {
            lastRenderProgress = renderProgress;
            void setProgress(videoId, renderProgress);
          }
        },
      });

      const renderedDuration = await probeVideoDuration(renderedPath);
      if (Math.abs(renderedDuration - length) > TARGET_DURATION_TOLERANCE_SECONDS) {
        throw new Error(
          `Rendered video duration was ${renderedDuration.toFixed(2)}s; expected ${length}s.`,
        );
      }
      await setProgress(videoId, 78);

      // ── Step 5: Apply forensic metadata watermark ─────────────────────
      console.log(`[worker] Applying forensic watermark → ${signedPath}`);
      await addForensicWatermark(renderedPath, signedPath, {
        userId:  clerkId,
        videoId,
      });
      await setProgress(videoId, 82);

      // ── Step 6: Stream the MP4 into Supabase with resumable Tus chunks ─
      const storagePath = `${videoId}.mp4`;
      await uploadVideoResumable({
        supabaseUrl: process.env.SUPABASE_URL || 'http://localhost',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'anon',
        bucketName: process.env.STORAGE_BUCKET || 'videos',
        objectName: storagePath,
        filePath: signedPath,
        onProgress: (uploadedBytes, totalBytes) => {
          const uploadProgress = totalBytes > 0 ? uploadedBytes / totalBytes : 0;
          void setProgress(videoId, 82 + Math.floor(uploadProgress * 10));
        },
      });

      const { data: publicUrlData } = supabase.storage
        .from(process.env.STORAGE_BUCKET || 'videos')
        .getPublicUrl(storagePath);

      const videoUrl     = publicUrlData.publicUrl;
      const thumbnailUrl = process.env.STORAGE_CDN_URL
        ? `${process.env.STORAGE_CDN_URL}/thumbnails/placeholder.jpg`
        : `https://storage.expressiveai.online/thumbnails/placeholder.jpg`;

      await setProgress(videoId, 95);

      // ── Step 7: Mark as completed ─────────────────────────────────────
      await supabase
        .from('videos')
        .update({
          status:        'completed',
          video_url:     videoUrl,
          thumbnail_url: thumbnailUrl,
          progress:      100,
          completed_at:  new Date().toISOString(),
        })
        .eq('id', videoId);

      // ── Step 8: Increment user's total_videos counter ─────────────────
      // Use rpc if available; fall back to a read-then-write
      const { data: userRow } = await supabase
        .from('users')
        .select('total_videos')
        .eq('id', dbUserId)
        .single();

      if (userRow) {
        await supabase
          .from('users')
          .update({ total_videos: (userRow.total_videos ?? 0) + 1 })
          .eq('id', dbUserId);
      }

      // ── Step 9: In-app notification ───────────────────────────────────
      await supabase.from('notifications').insert({
        user_id: dbUserId,
        type:    'video_ready',
        title:   '✨ Your video is ready!',
        message: `"${prompt.substring(0, 60)}${prompt.length > 60 ? '…' : ''}" has been generated.`,
        data:    { videoId, videoUrl },
      });

      console.log(`[worker] ✅ Completed video ${videoId} → ${videoUrl}`);
      return { videoId, videoUrl, thumbnailUrl };

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[worker] ❌ Failed video ${videoId}:`, message);

      await supabase
        .from('videos')
        .update({
          status:        'failed',
          error_message: message,
        })
        .eq('id', videoId);

      throw error; // BullMQ will handle retry/failure logic

    } finally {
      // ── Always clean up tmp files ──────────────────────────────────────
      await Promise.all([
        unlinkSafe(rawPath),
        unlinkSafe(renderedPath),
        unlinkSafe(signedPath),
      ]);
    }
  },
  {
    connection: redis,
    concurrency: 1,          // long MP4 transcodes are CPU- and disk-intensive
    limiter: {
      max:      10,
      duration: 60_000,      // max 10 jobs/min to stay within HF rate limits
    },
  }
);

// ---------------------------------------------------------------------------
// Worker event listeners
// ---------------------------------------------------------------------------
worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} completed (videoId=${job.data.videoId})`);
});

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} failed (videoId=${job?.data?.videoId}):`, err.message);
});

worker.on('error', (err) => {
  console.error('[worker] Worker error:', err);
});

console.log('🎬 ExpressiveAI video worker started — waiting for jobs…');

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
async function shutdown(signal: string) {
  console.log(`[worker] ${signal} received — draining queue and shutting down…`);
  await worker.close();
  await redis.quit();
  console.log('[worker] Shutdown complete.');
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
