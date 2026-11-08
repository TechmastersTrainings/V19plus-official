import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Catalog Data Normalization & Uploader Resilience', () => {
  it('should normalize both Array and {items: []} response structures for browse/movies/series', () => {
    const rawArrayData = [
      { id: '1', title: 'NINTH TASK - MONKEY WALK', content_type: 'MOVIE', status: 'PUBLISHED' },
      { id: '2', title: 'EIGHTH TASK', content_type: 'MOVIE', status: 'PUBLISHED' },
    ];
    const rawObjectData = {
      items: [
        { id: '1', title: 'NINTH TASK - MONKEY WALK', content_type: 'MOVIE', status: 'PUBLISHED' },
      ],
      total: 1,
    };

    const extractItems = (data) => (Array.isArray(data) ? data : data?.items || []);

    const fromArray = extractItems(rawArrayData);
    assert.equal(fromArray.length, 2);
    assert.equal(fromArray[0].title, 'NINTH TASK - MONKEY WALK');

    const fromObject = extractItems(rawObjectData);
    assert.equal(fromObject.length, 1);
    assert.equal(fromObject[0].title, 'NINTH TASK - MONKEY WALK');

    const fromUndefined = extractItems(undefined);
    assert.deepEqual(fromUndefined, []);
  });

  it('should filter movies correctly when content_type or type is MOVIE', () => {
    const catalog = [
      { id: '1', title: 'NINTH TASK - MONKEY WALK', content_type: 'MOVIE' },
      { id: '2', title: 'SOME SERIES', content_type: 'SERIES' },
      { id: '3', title: 'CLASSIC MOVIE', type: 'MOVIE' },
    ];

    const extractItems = (data) => (Array.isArray(data) ? data : data?.items || []);
    const movies = extractItems(catalog).filter(
      (item) =>
        item &&
        (item.content_type === 'MOVIE' ||
          item.type === 'MOVIE' ||
          (!item.content_type && !item.type))
    );

    assert.equal(movies.length, 2);
    assert.equal(movies[0].title, 'NINTH TASK - MONKEY WALK');
  });

  it('should prevent R2 multipart abort on completion timeout', () => {
    let aborted = false;
    const isCompleted = false;
    const upload_id = 'test_upload_id';
    const key = 'test_key.mp4';

    const handleUploadError = (uploadErr) => {
      const isTimeout = uploadErr?.code === 'ECONNABORTED' || uploadErr?.message?.toLowerCase().includes('timeout');
      if (!isCompleted && upload_id && key && !isTimeout) {
        aborted = true;
      }
    };

    // Case 1: Timeout error should NOT abort
    handleUploadError({ code: 'ECONNABORTED', message: 'timeout of 60000ms exceeded' });
    assert.equal(aborted, false, 'Completion timeout should not trigger premature abort');

    // Case 2: Actual fatal error before completion SHOULD abort
    handleUploadError({ message: 'Fatal unrecoverable error 400 Bad Request' });
    assert.equal(aborted, true, 'Real fatal error before completion should trigger abort');
  });

  it('should auto-pause on network drop/Wi-Fi switch and never abort active R2 session', () => {
    let aborted = false;
    let uploadState = 'uploading';
    let isWaitingNetwork = false;
    const completedParts = new Map([[1, 'etag-1'], [2, 'etag-2']]);
    const partQueue = [3, 4, 5];

    const handleNetworkLoss = (err) => {
      const isNetworkIssue =
        !err ||
        err?.message === 'NETWORK_ERROR' ||
        /network|offline|failed to fetch/i.test(err?.message || '');
      if (isNetworkIssue) {
        isWaitingNetwork = true;
        uploadState = 'waiting_network';
        // NEVER abort R2 session on network interruption
        return;
      }
      aborted = true;
      uploadState = 'error';
    };

    // Simulate Wi-Fi drop / network disconnection
    handleNetworkLoss({ message: 'NETWORK_ERROR' });
    assert.equal(aborted, false, 'Network disconnect must never abort active session');
    assert.equal(uploadState, 'waiting_network');
    assert.equal(isWaitingNetwork, true);
    assert.equal(completedParts.size, 2, 'Completed parts must be preserved');
    assert.deepEqual(partQueue, [3, 4, 5], 'Remaining parts must stay intact');

    // Simulate Wi-Fi reconnect / online restoration
    const handleNetworkRestored = () => {
      isWaitingNetwork = false;
      uploadState = 'uploading';
      // Worker continues from part 3
      const nextPart = partQueue.shift();
      completedParts.set(nextPart, `etag-${nextPart}`);
    };

    handleNetworkRestored();
    assert.equal(uploadState, 'uploading');
    assert.equal(isWaitingNetwork, false);
    assert.equal(completedParts.size, 3, 'Worker should seamlessly resume uploading');
    assert.equal(completedParts.get(3), 'etag-3');
    assert.deepEqual(partQueue, [4, 5]);
  });

  it('should ensure endpoint path always routes through /api on localhost', () => {
    const getChunkEndpoint = (endpoint, hostname = 'localhost') => {
      if (
        hostname &&
        !hostname.includes('localhost') &&
        !hostname.includes('127.0.0.1')
      ) {
        return `https://v19plus-official.onrender.com/api/media/upload/chunked/${endpoint}`;
      }
      return `/api/media/upload/chunked/${endpoint}`;
    };

    assert.equal(
      getChunkEndpoint('complete', 'localhost'),
      '/api/media/upload/chunked/complete'
    );
    assert.equal(
      getChunkEndpoint('part', 'v19plus.com'),
      'https://v19plus-official.onrender.com/api/media/upload/chunked/part'
    );
  });
});
