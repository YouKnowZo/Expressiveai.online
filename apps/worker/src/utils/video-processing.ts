import { createWriteStream, promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import ffmpeg from 'fluent-ffmpeg';

const HF_HUB_URL = 'https://huggingface.co';
const HF_ROUTER_URL = 'https://router.huggingface.co';
const HF_PROVIDER = 'fal-ai';
const MAX_PROVIDER_WAIT_MS = 25 * 60 * 1000;
const PROVIDER_POLL_MS = 1000;
const MAX_PROVIDER_POLL_INTERVAL_MS = 10_000;
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;
const TUS_RETRY_DELAYS_MS = [0, 1000, 3000, 5000, 10000];

interface ProviderMapping {
  status?: string;
  providerId?: string;
  task?: string;
}

interface ProviderQueueResponse {
  request_id?: string;
  response_url?: string;
}

interface ProviderQueueStatus {
  status?: string;
  error?: string;
  queue_position?: number;
}

interface ProviderVideoResult {
  video?: {
    url?: string;
  };
  error?: string;
  detail?: string;
}

export interface GenerateSourceVideoOptions {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  token: string;
  outputPath: string;
  onProgress?: (progress: number) => void;
  fetcher?: typeof fetch;
  maxWaitMs?: number;
  pollIntervalMs?: number;
}

export interface RenderVideoOptions {
  inputPath: string;
  outputPath: string;
  seconds: number;
  onProgress?: (progress: number) => void;
}

export interface ResumableUploadOptions {
  supabaseUrl: string;
  serviceRoleKey: string;
  bucketName: string;
  objectName: string;
  filePath: string;
  onProgress?: (uploadedBytes: number, totalBytes: number) => void;
  fetcher?: typeof fetch;
}

const providerModelCache = new Map<string, string>();

function errorDetails(status: number, statusText: string, body: string): string {
  return body.trim().slice(0, 1200) || statusText || `HTTP ${status}`;
}

function modelPath(modelId: string): string {
  return modelId.split('/').map(encodeURIComponent).join('/');
}

export function buildHuggingFaceQueueUrl(providerModelId: string): string {
  const route = providerModelId.replace(/^\/+/, '');
  const url = new URL(`${HF_ROUTER_URL}/${HF_PROVIDER}/${route}`);
  url.searchParams.set('_subdomain', 'queue');
  return url.toString();
}

function buildFalQueueUrl(responseUrl: string, suffix = ''): string {
  const parsedResponseUrl = new URL(responseUrl);
  if (parsedResponseUrl.protocol !== 'https:' || parsedResponseUrl.hostname !== 'queue.fal.run') {
    throw new Error('The video provider returned an invalid queue URL.');
  }
  const responsePath = parsedResponseUrl.pathname;
  // Match the Hugging Face JS client's routed Fal queue/status/result URLs.
  const url = new URL(`${HF_ROUTER_URL}/${HF_PROVIDER}${responsePath}${suffix}`);
  url.searchParams.set('_subdomain', 'queue');
  return url.toString();
}

export async function resolveFalProviderModelId(
  modelId: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<string> {
  const normalizedModelId = modelId.trim();
  const cacheKey = `${HF_PROVIDER}:${normalizedModelId}`;
  const cached = providerModelCache.get(cacheKey);
  if (cached) return cached;

  if (!normalizedModelId || normalizedModelId.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error('A valid Hugging Face model ID is required.');
  }
  const infoUrl = new URL(`${HF_HUB_URL}/api/models/${modelPath(normalizedModelId)}`);
  infoUrl.searchParams.set('expand[]', 'inferenceProviderMapping');
  const response = await fetcher(infoUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Could not resolve the Hugging Face ${HF_PROVIDER} model mapping: ${errorDetails(response.status, response.statusText, body)}`,
    );
  }

  const modelInfo = (await response.json()) as {
    inferenceProviderMapping?: Record<string, ProviderMapping>;
  };
  const mapping = modelInfo.inferenceProviderMapping?.[HF_PROVIDER];

  if (
    !mapping?.providerId ||
    !mapping.providerId.startsWith(`${HF_PROVIDER}/`) ||
    /[?#]/.test(mapping.providerId) ||
    mapping.task !== 'text-to-video' ||
    mapping.status !== 'live'
  ) {
    throw new Error(
      `Hugging Face model ${modelId} does not have a live ${HF_PROVIDER} text-to-video endpoint.`,
    );
  }

  providerModelCache.set(cacheKey, mapping.providerId);
  return mapping.providerId;
}

function shortVideoPayload(prompt: string, negativePrompt?: string): Record<string, unknown> {
  return {
    prompt,
    // Wan 2.1's Fal endpoint accepts 81–100 frames; generate one short scene and
    // extend it locally to the selected runtime instead of requesting hundreds of frames.
    num_frames: 81,
    frames_per_second: 16,
    resolution: '480p',
    num_inference_steps: 30,
    enable_safety_checker: true,
    enable_prompt_expansion: true,
    ...(negativePrompt?.trim() ? { negative_prompt: negativePrompt.trim() } : {}),
  };
}

async function readJsonResponse<T>(response: Response, label: string): Promise<T> {
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${label}: ${errorDetails(response.status, response.statusText, body)}`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error(`${label}: the provider returned invalid JSON.`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generateSourceVideo(options: GenerateSourceVideoOptions): Promise<void> {
  const {
    modelId,
    prompt,
    negativePrompt,
    token,
    outputPath,
    onProgress,
    maxWaitMs = MAX_PROVIDER_WAIT_MS,
    pollIntervalMs = PROVIDER_POLL_MS,
  } = options;
  const fetcher = options.fetcher ?? fetch;

  if (!token.trim()) throw new Error('Hugging Face Inference Providers token is not configured.');

  onProgress?.(18);
  const providerModelId = await resolveFalProviderModelId(modelId, token, fetcher);
  const requestUrl = buildHuggingFaceQueueUrl(providerModelId);
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const queued = await readJsonResponse<ProviderQueueResponse>(
    await fetcher(requestUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(shortVideoPayload(prompt, negativePrompt)),
    }),
    'Hugging Face video generation failed',
  );

  if (!queued.request_id || !queued.response_url) {
    throw new Error('The video provider returned an incomplete queue response.');
  }

  onProgress?.(32);
  const statusUrl = buildFalQueueUrl(queued.response_url, '/status');
  const resultUrl = buildFalQueueUrl(queued.response_url);
  const deadline = Date.now() + maxWaitMs;
  let lastProgress = 32;
  let pollCount = 0;
  let generationCompleted = false;

  while (Date.now() < deadline) {
    const pollDelayMs = Math.min(
      Math.max(0, pollIntervalMs) * 2 ** Math.min(pollCount, 4),
      MAX_PROVIDER_POLL_INTERVAL_MS,
      Math.max(0, deadline - Date.now()),
    );
    await sleep(pollDelayMs);
    pollCount += 1;
    const status = await readJsonResponse<ProviderQueueStatus>(
      await fetcher(statusUrl, { headers: { Authorization: headers.Authorization } }),
      'Could not check video generation status',
    );

    if (status.status === 'COMPLETED') {
      if (status.error) throw new Error(`Video provider failed: ${status.error}`);
      generationCompleted = true;
      break;
    }
    if (status.status === 'FAILED') {
      throw new Error(`Video provider failed: ${status.error || 'Unknown provider error'}`);
    }
    if (status.status !== 'IN_QUEUE' && status.status !== 'IN_PROGRESS') {
      throw new Error(`The video provider returned an unknown queue status: ${status.status || 'empty'}.`);
    }

    const progress = status.status === 'IN_PROGRESS' ? 54 : 38;
    if (progress > lastProgress) {
      lastProgress = progress;
      onProgress?.(progress);
    }
  }

  if (!generationCompleted) {
    throw new Error('The video provider timed out while generating the source clip. Please try again.');
  }

  const result = await readJsonResponse<ProviderVideoResult>(
    await fetcher(resultUrl, { headers: { Authorization: headers.Authorization } }),
    'Could not retrieve the generated video',
  );

  if (result.error || result.detail) {
    throw new Error(`Video provider failed: ${result.error || result.detail}`);
  }
  const videoUrl = result.video?.url;
  let parsedVideoUrl: URL;
  try {
    parsedVideoUrl = new URL(videoUrl ?? '');
  } catch {
    throw new Error('The video provider returned an invalid video URL.');
  }
  if (parsedVideoUrl.protocol !== 'https:') {
    throw new Error('The video provider returned an invalid video URL.');
  }

  const videoResponse = await fetcher(parsedVideoUrl);
  if (!videoResponse.ok || !videoResponse.body) {
    const body = await videoResponse.text().catch(() => '');
    throw new Error(
      `Could not download the generated source clip: ${errorDetails(videoResponse.status, videoResponse.statusText, body)}`,
    );
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await pipeline(Readable.fromWeb(videoResponse.body as never), createWriteStream(outputPath));
  onProgress?.(62);
}

export function probeVideoDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (error, metadata) => {
      if (error) {
        reject(new Error(`Could not inspect generated MP4: ${error.message}`));
        return;
      }

      const duration = metadata.format?.duration;
      if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
        reject(new Error('Generated video does not contain a valid duration.'));
        return;
      }
      resolve(duration);
    });
  });
}

function secondsFromTimemark(timemark: string): number {
  const parts = timemark.split(':').map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) return 0;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

export function renderVideoToDuration({
  inputPath,
  outputPath,
  seconds,
  onProgress,
}: RenderVideoOptions): Promise<void> {
  if (!Number.isFinite(seconds) || !Number.isInteger(seconds) || seconds < 1 || seconds > 300) {
    return Promise.reject(new Error('Requested render duration must be between 1 and 300 seconds.'));
  }

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .inputOptions('-stream_loop -1')
      .outputOptions(
        `-t ${seconds}`,
        '-c:v libx264',
        '-preset veryfast',
        '-crf 24',
        '-pix_fmt yuv420p',
        '-an',
        '-movflags +faststart',
      )
      .videoCodec('libx264')
      .format('mp4')
      .on('progress', (progress) => {
        const elapsed = typeof progress.timemark === 'string' ? secondsFromTimemark(progress.timemark) : 0;
        if (elapsed > 0) onProgress?.(Math.min(1, elapsed / seconds));
      })
      .on('error', (error: Error) => reject(new Error(`Video duration rendering failed: ${error.message}`)))
      .on('end', () => resolve())
      .save(outputPath);
  });
}

function metadataValue(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64');
}

function getTusEndpoint(supabaseUrl: string): URL {
  const endpoint = new URL('/storage/v1/upload/resumable', supabaseUrl);
  if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) {
    throw new Error('Supabase URL must not contain credentials, query parameters, or fragments.');
  }
  if (endpoint.protocol !== 'https:' && endpoint.hostname !== 'localhost') {
    throw new Error('Supabase upload URL must use HTTPS.');
  }
  if (endpoint.hostname.endsWith('.supabase.co') && !endpoint.hostname.endsWith('.storage.supabase.co')) {
    endpoint.hostname = endpoint.hostname.replace(/\.supabase\.co$/, '.storage.supabase.co');
  }
  return endpoint;
}

async function getTusOffset(
  uploadUrl: string,
  headers: Record<string, string>,
  fetcher: typeof fetch,
): Promise<number> {
  const response = await fetcher(uploadUrl, {
    method: 'HEAD',
    headers: { ...headers, 'Tus-Resumable': '1.0.0' },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Could not resume Supabase upload: ${errorDetails(response.status, response.statusText, body)}`);
  }

  const offsetHeader = response.headers.get('Upload-Offset');
  const offset = offsetHeader !== null && /^\d+$/.test(offsetHeader) ? Number(offsetHeader) : NaN;
  if (!Number.isSafeInteger(offset) || offset < 0) {
    throw new Error('Supabase returned an invalid resumable upload offset.');
  }
  return offset;
}

async function patchTusChunk(
  uploadUrl: string,
  filePath: string,
  offset: number,
  size: number,
  headers: Record<string, string>,
  fetcher: typeof fetch,
): Promise<number> {
  const remainingChunkBytes = TUS_CHUNK_SIZE - (offset % TUS_CHUNK_SIZE);
  const chunkLength = Math.min(remainingChunkBytes, size - offset);
  const expectedOffset = offset + chunkLength;
  const chunkBuffer = Buffer.allocUnsafe(chunkLength);
  const file = await fs.open(filePath, 'r');
  try {
    const { bytesRead } = await file.read(chunkBuffer, 0, chunkLength, offset);
    if (bytesRead !== chunkLength) throw new Error('Could not read a complete Supabase upload chunk.');
  } finally {
    await file.close();
  }
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < TUS_RETRY_DELAYS_MS.length; attempt += 1) {
    const delay = TUS_RETRY_DELAYS_MS[attempt];
    if (delay > 0) await sleep(delay);

    let response: Response;
    try {
      response = await fetcher(uploadUrl, {
        method: 'PATCH',
        headers: {
          ...headers,
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream',
        },
        body: chunkBuffer as unknown as RequestInit['body'],
      });
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === TUS_RETRY_DELAYS_MS.length - 1) break;

      const recoveredOffset = await getTusOffset(uploadUrl, headers, fetcher).catch(() => null);
      if (recoveredOffset !== null) {
        if (recoveredOffset > expectedOffset || recoveredOffset < offset) {
          throw new Error('Supabase returned an unexpected resumable upload offset.');
        }
        if (recoveredOffset > offset) return recoveredOffset;
      }
      continue;
    }

    const returnedOffsetHeader = response.headers.get('Upload-Offset');
    const returnedOffset =
      returnedOffsetHeader !== null && /^\d+$/.test(returnedOffsetHeader) ? Number(returnedOffsetHeader) : NaN;
    if (response.status === 204) {
      if (!Number.isSafeInteger(returnedOffset) || returnedOffset !== expectedOffset) {
        throw new Error('Supabase returned an unexpected resumable upload offset.');
      }
      return returnedOffset;
    }

    const body = await response.text().catch(() => '');
    lastError = new Error(
      `Supabase resumable upload failed: ${errorDetails(response.status, response.statusText, body)}`,
    );

    const retryable = response.status === 409 || response.status === 429 || response.status >= 500;
    if (!retryable || attempt === TUS_RETRY_DELAYS_MS.length - 1) break;

    const recoveredOffset = await getTusOffset(uploadUrl, headers, fetcher).catch(() => null);
    if (recoveredOffset !== null) {
      if (recoveredOffset > expectedOffset || recoveredOffset < offset) {
        throw new Error('Supabase returned an unexpected resumable upload offset.');
      }
      if (recoveredOffset > offset) return recoveredOffset;
    }
  }

  throw lastError ?? new Error('Supabase resumable upload failed.');
}

export async function uploadVideoResumable(options: ResumableUploadOptions): Promise<void> {
  const { supabaseUrl, serviceRoleKey, bucketName, objectName, filePath, onProgress } = options;
  const fetcher = options.fetcher ?? fetch;
  const size = (await fs.stat(filePath)).size;
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new Error('Cannot upload an empty or oversized video file.');
  }

  const metadata = {
    bucketName: metadataValue(bucketName),
    objectName: metadataValue(objectName),
    contentType: metadataValue('video/mp4'),
    cacheControl: metadataValue('3600'),
    metadata: metadataValue(JSON.stringify({ generatedBy: 'expressiveai.online' })),
  };
  const headers = {
    Authorization: `Bearer ${serviceRoleKey}`,
    apikey: serviceRoleKey,
    'Tus-Resumable': '1.0.0',
  };
  const createHeaders = {
    ...headers,
    'Upload-Length': String(size),
    'Upload-Metadata': Object.entries(metadata)
      .map(([key, value]) => `${key} ${value}`)
      .join(','),
    'x-upsert': 'true',
  };

  const createResponse = await fetcher(getTusEndpoint(supabaseUrl), {
    method: 'POST',
    headers: createHeaders,
  });
  if (createResponse.status !== 201) {
    const body = await createResponse.text().catch(() => '');
    throw new Error(
      `Could not start Supabase resumable upload: ${errorDetails(createResponse.status, createResponse.statusText, body)}`,
    );
  }

  const location = createResponse.headers.get('Location');
  if (!location) throw new Error('Supabase did not return a resumable upload URL.');
  const endpoint = getTusEndpoint(supabaseUrl);
  const uploadUrl = new URL(location, endpoint);
  if (uploadUrl.username || uploadUrl.password || uploadUrl.search || uploadUrl.hash) {
    throw new Error('Supabase returned an invalid resumable upload URL.');
  }
  if (uploadUrl.protocol !== 'https:' && uploadUrl.hostname !== 'localhost') {
    throw new Error('Supabase returned an upload URL that does not use HTTPS.');
  }
  if (uploadUrl.origin !== endpoint.origin) {
    throw new Error('Supabase returned an upload URL on an unexpected host.');
  }

  let offset = 0;
  onProgress?.(0, size);
  while (offset < size) {
    const nextOffset = await patchTusChunk(uploadUrl.toString(), filePath, offset, size, headers, fetcher);
    if (nextOffset <= offset || nextOffset > size) {
      throw new Error('Supabase returned an invalid resumable upload offset.');
    }
    offset = nextOffset;
    onProgress?.(offset, size);
  }
}
