import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import {
  buildHuggingFaceQueueUrl,
  generateSourceVideo,
  probeVideoDuration,
  renderVideoToDuration,
  uploadVideoResumable,
} from './video-processing';

function jsonResponse(body: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function makeQueueFetch(options?: { failStatus?: boolean; inProgress?: boolean }) {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher: typeof fetch = async (input, init) => {
    const url = String(input);
    calls.push({ url, init });

    if (url.includes('/api/models/')) {
      return jsonResponse({
        inferenceProviderMapping: {
          'fal-ai': {
            status: 'live',
            providerId: 'fal-ai/wan/v2.1/1.3b/text-to-video',
            task: 'text-to-video',
          },
        },
      });
    }
    if (url.endsWith('/status?_subdomain=queue')) {
      if (options?.failStatus) return jsonResponse({ status: 'FAILED', error: 'provider error' });
      if (options?.inProgress) return jsonResponse({ status: 'IN_PROGRESS' });
      return jsonResponse({ status: 'COMPLETED' });
    }
    if (url.endsWith('/requests/request-1?_subdomain=queue')) {
      return jsonResponse({ video: { url: 'https://example.com/generated.mp4' } });
    }
    if (url.includes('_subdomain=queue') && init?.method === 'POST') {
      return jsonResponse({
        request_id: 'request-1',
        response_url: 'https://queue.fal.run/fal-ai/wan/v2.1/1.3b/text-to-video/requests/request-1',
      });
    }
    if (url === 'https://example.com/generated.mp4') {
      return new Response(new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112]), {
        status: 200,
        headers: { 'Content-Type': 'video/mp4' },
      });
    }

    return jsonResponse({ error: `Unexpected test URL: ${url}` }, 500);
  };
  return { fetcher, calls };
}

const tempFiles: string[] = [];

afterEach(async () => {
  await Promise.all(tempFiles.splice(0).map((file) => fs.rm(file, { force: true, recursive: true })));
});

describe('video processing', () => {
  it('builds a routed Fal queue URL from the provider mapping', () => {
    assert.equal(
      buildHuggingFaceQueueUrl('fal-ai/wan/v2.1/1.3b/text-to-video'),
      'https://router.huggingface.co/fal-ai/fal-ai/wan/v2.1/1.3b/text-to-video?_subdomain=queue',
    );
  });

  it('submits only a provider-supported short clip and downloads its MP4', async () => {
    const { fetcher, calls } = makeQueueFetch();
    const outputPath = path.join(os.tmpdir(), `video-test-${Date.now()}-${Math.random()}.mp4`);
    tempFiles.push(outputPath);
    const progressValues: number[] = [];

    await generateSourceVideo({
      modelId: 'Wan-AI/Wan2.1-T2V-1.3B',
      prompt: 'An ocean at sunset',
      negativePrompt: 'blur',
      token: 'hf_test_token',
      outputPath,
      fetcher,
      pollIntervalMs: 0,
      onProgress: (progress) => progressValues.push(progress),
    });

    const queueCall = calls.find((call) => call.url.includes('_subdomain=queue') && call.init?.method === 'POST');
    assert.ok(queueCall);
    assert.equal(
      queueCall.url,
      'https://router.huggingface.co/fal-ai/fal-ai/wan/v2.1/1.3b/text-to-video?_subdomain=queue',
    );
    assert.deepEqual(calls.filter((call) => call.url.includes('/status?')).map((call) => call.url), [
      'https://router.huggingface.co/fal-ai/fal-ai/wan/v2.1/1.3b/text-to-video/requests/request-1/status?_subdomain=queue',
    ]);
    assert.deepEqual(calls.filter((call) => call.url.includes('/requests/request-1?')).map((call) => call.url), [
      'https://router.huggingface.co/fal-ai/fal-ai/wan/v2.1/1.3b/text-to-video/requests/request-1?_subdomain=queue',
    ]);
    const payload = JSON.parse(String(queueCall.init?.body));
    assert.deepEqual(
      {
        prompt: payload.prompt,
        num_frames: payload.num_frames,
        frames_per_second: payload.frames_per_second,
        resolution: payload.resolution,
        negative_prompt: payload.negative_prompt,
      },
      {
        prompt: 'An ocean at sunset',
        num_frames: 81,
        frames_per_second: 16,
        resolution: '480p',
        negative_prompt: 'blur',
      },
    );
    assert.ok(payload.num_frames <= 100);
    assert.ok((await fs.stat(outputPath)).size > 0);
    assert.equal(progressValues.at(-1), 62);
  });

  it('marks provider job failures instead of trying to render invalid output', async () => {
    const { fetcher } = makeQueueFetch({ failStatus: true });
    await assert.rejects(
      generateSourceVideo({
        modelId: 'Wan-AI/Wan2.1-T2V-1.3B',
        prompt: 'A lighthouse at dusk',
        token: 'hf_test_token',
        outputPath: path.join(os.tmpdir(), `video-test-${Date.now()}.mp4`),
        fetcher,
        pollIntervalMs: 0,
      }),
      /provider error/,
    );
  });

  it('rejects requested durations outside the five-minute ceiling', async () => {
    await assert.rejects(
      renderVideoToDuration({ inputPath: 'raw.mp4', outputPath: 'rendered.mp4', seconds: 301 }),
      /between 1 and 300 seconds/,
    );
  });

  it('renders and probes a valid five-minute MP4 by looping a short source clip', async (context) => {
    const versionCheck = await new Promise<boolean>((resolve, reject) => {
      execFile('ffmpeg', ['-version'], (error) => {
        if (error?.code === 'ENOENT') resolve(false);
        else if (error) reject(error);
        else resolve(true);
      });
    });
    if (!versionCheck) {
      context.skip('FFmpeg is not installed in this environment.');
      return;
    }

    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'expressiveai-render-test-'));
    const sourcePath = path.join(root, 'source.mp4');
    const outputPath = path.join(root, 'five-minutes.mp4');
    tempFiles.push(root);

    await new Promise<void>((resolve, reject) => {
      execFile(
        'ffmpeg',
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-y',
          '-f',
          'lavfi',
          '-i',
          'color=c=blue:s=160x90:r=10:d=1',
          '-an',
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-movflags',
          '+faststart',
          sourcePath,
        ],
        (error) => (error ? reject(error) : resolve()),
      );
    });

    await renderVideoToDuration({ inputPath: sourcePath, outputPath, seconds: 300 });

    const duration = await probeVideoDuration(outputPath);
    assert.ok(Math.abs(duration - 300) <= 0.5, `Expected 300 seconds, received ${duration}`);
    assert.ok((await fs.stat(outputPath)).size > 0);
  });

  it('reports a queue timeout when the provider never completes', async () => {
    const { fetcher } = makeQueueFetch({ inProgress: true });
    await assert.rejects(
      generateSourceVideo({
        modelId: 'Wan-AI/Wan2.1-T2V-1.3B',
        prompt: 'A lighthouse at dusk',
        token: 'hf_test_token',
        outputPath: path.join(os.tmpdir(), `video-timeout-test-${Date.now()}.mp4`),
        fetcher,
        maxWaitMs: 5,
        pollIntervalMs: 0,
      }),
      /timed out while generating/,
    );
  });

  it('uploads the finished MP4 in resumable six-megabyte Tus chunks', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'expressiveai-tus-test-'));
    const filePath = path.join(root, 'video.mp4');
    tempFiles.push(root);
    const fileBytes = Buffer.alloc(6 * 1024 * 1024 + 19, 7);
    await fs.writeFile(filePath, fileBytes);
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    let currentOffset = 0;
    const fetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      requests.push({ url, init });
      if (init?.method === 'POST') {
        return new Response(null, { status: 201, headers: { Location: '/storage/v1/upload/resumable/id-1' } });
      }
      if (init?.method === 'PATCH') {
        currentOffset += (init.body as ArrayBuffer).byteLength;
        return new Response(null, { status: 204, headers: { 'Upload-Offset': String(currentOffset) } });
      }
      return new Response(null, { status: 200, headers: { 'Upload-Offset': String(currentOffset) } });
    };
    const progressValues: Array<[number, number]> = [];

    await uploadVideoResumable({
      supabaseUrl: 'https://project.supabase.co',
      serviceRoleKey: 'service-role-test',
      bucketName: 'videos',
      objectName: 'video-id.mp4',
      filePath,
      fetcher,
      onProgress: (uploaded, total) => progressValues.push([uploaded, total]),
    });

    assert.equal(requests[0].url, 'https://project.storage.supabase.co/storage/v1/upload/resumable');
    assert.equal(requests[0].init?.method, 'POST');
    const createHeaders = requests[0].init?.headers as Record<string, string>;
    assert.equal(createHeaders['Tus-Resumable'], '1.0.0');
    assert.equal(createHeaders['Upload-Length'], String(fileBytes.length));
    assert.equal(createHeaders['x-upsert'], 'true');
    assert.match(createHeaders['Upload-Metadata'], /bucketName dmlkZW9z/);
    assert.deepEqual(
      requests
        .filter((request) => request.init?.method === 'PATCH')
        .map((request) => {
          const headers = request.init?.headers as Record<string, string>;
          assert.equal(headers['Tus-Resumable'], '1.0.0');
          assert.equal(headers['Content-Type'], 'application/offset+octet-stream');
          assert.equal(headers['Content-Length'], undefined);
          return (request.init?.body as ArrayBuffer).byteLength;
        }),
      [6 * 1024 * 1024, 19],
    );
    assert.deepEqual(progressValues.at(-1), [fileBytes.length, fileBytes.length]);
  });

  it('resumes a partially completed TUS chunk after a dropped connection', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'expressiveai-tus-resume-test-'));
    const filePath = path.join(root, 'video.mp4');
    tempFiles.push(root);
    const fileBytes = Buffer.alloc(6 * 1024 * 1024 + 19, 3);
    await fs.writeFile(filePath, fileBytes);
    const requests: Array<{ method: string; offset?: number; bodySize?: number }> = [];
    let currentOffset = 0;
    let droppedConnection = false;
    const fetcher: typeof fetch = async (_input, init) => {
      const method = init?.method ?? 'GET';
      if (method === 'POST') {
        return new Response(null, { status: 201, headers: { Location: '/storage/v1/upload/resumable/id-2' } });
      }
      if (method === 'HEAD') {
        return new Response(null, { status: 200, headers: { 'Upload-Offset': String(currentOffset) } });
      }
      if (method === 'PATCH') {
        const headers = init.headers as Record<string, string>;
        const bodySize = (init.body as ArrayBuffer).byteLength;
        const offset = Number(headers['Upload-Offset']);
        requests.push({ method, offset, bodySize });
        if (!droppedConnection) {
          currentOffset = bodySize / 2;
          droppedConnection = true;
          throw new Error('simulated connection drop after partial write');
        }
        assert.equal(offset, currentOffset);
        currentOffset += bodySize;
        return new Response(null, { status: 204, headers: { 'Upload-Offset': String(currentOffset) } });
      }
      throw new Error(`Unexpected HTTP method: ${method}`);
    };

    await uploadVideoResumable({
      supabaseUrl: 'https://project.supabase.co',
      serviceRoleKey: 'service-role-test',
      bucketName: 'videos',
      objectName: 'resume-test.mp4',
      filePath,
      fetcher,
    });

    assert.deepEqual(requests, [
      { method: 'PATCH', offset: 0, bodySize: 6 * 1024 * 1024 },
      { method: 'PATCH', offset: 3 * 1024 * 1024, bodySize: 3 * 1024 * 1024 },
      { method: 'PATCH', offset: 6 * 1024 * 1024, bodySize: 19 },
    ]);
    assert.equal(currentOffset, fileBytes.length);
  });
});
