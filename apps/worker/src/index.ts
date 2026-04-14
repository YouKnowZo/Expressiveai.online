/**
 * ExpressiveAI Video Generation Worker
 * ─────────────────────────────────────
 * Processes video generation jobs from the BullMQ queue.
 *
 * Pipeline:
 *  1. Update DB status → processing
 *  2. Call Hugging Face Inference API for video generation
 *  3. Save raw video to tmp filesystem
 *  4. Apply forensic watermark (ffmpeg metadata embed, zero re-encode)
 *  5. Upload watermarked video to Supabase Storage
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
import { addForensicWatermark } from './utils/watermark';

dotenv.config();

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
    } = job.data as {
      videoId:    string;
      prompt:     string;
      length:     number;
      clerkId:    string;
      dbUserId:   string;
      isArtistic?: boolean;
    };

    const tmpDir     = os.tmpdir();
    const rawPath    = path.join(tmpDir, `${videoId}-raw.mp4`);
    const signedPath = path.join(tmpDir, `${videoId}-wm.mp4`);

    console.log(`[worker] ▶ Processing video ${videoId}: "${prompt.substring(0, 60)}…"`);

    try {
      // ── Step 1: Mark as processing ────────────────────────────────────
      await setProgress(videoId, 10, { status: 'processing' });

      // ── Step 2: Hugging Face Inference API ────────────────────────────
      const model = length <= 10
        ? 'damo-vilab/text-to-video-ms-1.7b'
        : 'ali-vilab/text-to-video-ms-2.5b';

      const fullPrompt = isArtistic ? `Artistic interpretation of: ${prompt}` : prompt;

      console.log(`[worker] Calling HF model ${model}…`);
      const hfResponse = await fetch(
        `https://api-inference.huggingface.co/models/${model}`,
        {
          method:  'POST',
          headers: {
            Authorization:  `Bearer ${process.env.HF_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: fullPrompt }),
        }
      );

      if (!hfResponse.ok) {
        const errText = await hfResponse.text().catch(() => hfResponse.statusText);
        throw new Error(`HF API error ${hfResponse.status}: ${errText}`);
      }

      await setProgress(videoId, 60);

      const videoBuffer = Buffer.from(await hfResponse.arrayBuffer());
      console.log(`[worker] Received ${(videoBuffer.byteLength / 1024).toFixed(1)} KB from HF`);

      // ── Step 3: Write raw video to tmp ────────────────────────────────
      await fs.writeFile(rawPath, videoBuffer);
      await setProgress(videoId, 70);

      // ── Step 4: Apply forensic watermark (zero re-encode) ─────────────
      console.log(`[worker] Applying forensic watermark → ${signedPath}`);
      await addForensicWatermark(rawPath, signedPath, {
        userId:  clerkId,
        videoId,
      });
      await setProgress(videoId, 82);

      // ── Step 5: Upload watermarked video to Supabase Storage ──────────
      const signedBuffer = await fs.readFile(signedPath);
      const storagePath  = `${videoId}.mp4`;

      const { error: uploadError } = await supabase.storage
        .from(process.env.STORAGE_BUCKET || 'videos')
        .upload(storagePath, signedBuffer, {
          contentType: 'video/mp4',
          upsert:      true,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(process.env.STORAGE_BUCKET || 'videos')
        .getPublicUrl(storagePath);

      const videoUrl     = publicUrlData.publicUrl;
      const thumbnailUrl = process.env.STORAGE_CDN_URL
        ? `${process.env.STORAGE_CDN_URL}/thumbnails/placeholder.jpg`
        : `https://storage.expressiveai.online/thumbnails/placeholder.jpg`;

      await setProgress(videoId, 95);

      // ── Step 6: Mark as completed ─────────────────────────────────────
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

      // ── Step 7: Increment user's total_videos counter ─────────────────
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

      // ── Step 8: In-app notification ───────────────────────────────────
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
        unlinkSafe(signedPath),
      ]);
    }
  },
  {
    connection: redis,
    concurrency: 2,          // process up to 2 videos simultaneously
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
