/**
 * forensic-watermark.ts
 * ----------------------
 * Embeds invisible forensic metadata into a video file using FFmpeg's
 * `-metadata` stream flags.  The signature encodes userId, videoId,
 * a Unix timestamp, and the platform identifier so that any exported
 * clip can be traced back to its originating account.
 *
 * Encoding strategy
 * -----------------
 * FFmpeg writes metadata into the container's global metadata section
 * (QuickTime / MP4: `moov.udta`, MKV: `\Segment\Info`, WebM: similar).
 * The embedded fields survive most re-muxing operations but are stripped
 * by re-encoding, which is intentional — this is a *soft* forensic layer
 * that deters casual redistribution and provides evidence in DMCA cases.
 * Combine with a visible or DCT-domain watermark for stronger guarantees.
 *
 * Usage
 * -----
 * import { addForensicWatermark } from './utils/watermark';
 * await addForensicWatermark('/tmp/raw.mp4', '/tmp/signed.mp4', {
 *   userId:  'user_abc123',
 *   videoId: '550e8400-e29b-41d4-a716-446655440000',
 * });
 */

import ffmpeg from 'fluent-ffmpeg';
import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface WatermarkMetadata {
  userId:  string;
  videoId: string;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Derive a short, stable signature string from the core identifiers. */
function buildSignature(meta: WatermarkMetadata, timestamp: number): string {
  const raw = `${meta.userId}:${meta.videoId}:${timestamp}:expressiveai.online`;
  return createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Adds forensic metadata to a video file without re-encoding the streams.
 *
 * @param inputPath   Absolute path to the source video.
 * @param outputPath  Absolute path where the watermarked video will be saved.
 * @param metadata    Identifiers to embed: { userId, videoId }.
 * @returns           Resolves when the operation completes successfully.
 * @throws            Rejects with an Error containing the FFmpeg stderr output.
 */
export async function addForensicWatermark(
  inputPath:  string,
  outputPath: string,
  metadata:   WatermarkMetadata,
): Promise<void> {
  const timestamp = Date.now();
  const signature = buildSignature(metadata, timestamp);

  return new Promise<void>((resolve, reject) => {
    const command = ffmpeg(inputPath) as any;
    command
      // ── Copy all streams verbatim — no quality loss ────────────────────
      .outputOptions('-c copy')
      // ── Preserve existing metadata then layer ours on top ─────────────
      .outputOptions('-map_metadata 0')
      // ── Forensic fields ───────────────────────────────────────────────
      .outputOptions(`-metadata xai_user_id=${metadata.userId}`)
      .outputOptions(`-metadata xai_video_id=${metadata.videoId}`)
      .outputOptions(`-metadata xai_timestamp=${timestamp}`)
      .outputOptions(`-metadata xai_platform=expressiveai.online`)
      .outputOptions(`-metadata xai_signature=${signature}`)
      // ── Human-readable creation time (ISO 8601) ────────────────────────
      .outputOptions(`-metadata creation_time=${new Date(timestamp).toISOString()}`)
      // ── Output ────────────────────────────────────────────────────────
      .output(outputPath)
      .on('start', (cmd: string) => {
        console.log('[watermark] FFmpeg command:', cmd);
      })
      .on('error', (err: Error, _stdout: string, stderr: string) => {
        console.error('[watermark] FFmpeg error:', stderr);
        reject(new Error(`Forensic watermarking failed: ${err.message}\nstderr: ${stderr}`));
      })
      .on('end', () => {
        console.log(
          `[watermark] Signed video written → ${outputPath}`,
          `| user=${metadata.userId} video=${metadata.videoId} sig=${signature}`,
        );
        resolve();
      })
      .run();
  });
}

// ---------------------------------------------------------------------------
// Optional: read back embedded metadata for verification
// ---------------------------------------------------------------------------

export interface ForensicSignature {
  userId:    string | null;
  videoId:   string | null;
  timestamp: number | null;
  platform:  string | null;
  signature: string | null;
}

/**
 * Reads forensic metadata from a previously watermarked file using ffprobe.
 * Useful for audit / verification tooling.
 */
export async function readForensicMetadata(filePath: string): Promise<ForensicSignature> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);

      const rawTags = (data?.format?.tags ?? {}) as Record<string, string | number>;
      const tags = Object.entries(rawTags).reduce<Record<string, string>>((acc, [key, value]) => {
        acc[key] = value == null ? '' : String(value);
        return acc;
      }, {});

      resolve({
        userId:    tags['xai_user_id']  ?? null,
        videoId:   tags['xai_video_id'] ?? null,
        timestamp: tags['xai_timestamp'] ? Number(tags['xai_timestamp']) : null,
        platform:  tags['xai_platform'] ?? null,
        signature: tags['xai_signature'] ?? null,
      });
    });
  });
}
