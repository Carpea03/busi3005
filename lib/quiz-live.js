import { createRedisSubscriber, publishRedisMessage } from './redis.js';

function publicQuizChannel(quizId) {
  return `quiz-live:public:${quizId}`;
}

function adminQuizChannel(quizId) {
  return `quiz-live:admin:${quizId}`;
}

function encodeEvent(event, data) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function publishQuizLiveEvent({ quizId, visibility = 'both', reason = 'updated', questionId = null }) {
  const payload = {
    quizId,
    reason,
    questionId,
    at: new Date().toISOString(),
  };

  const channels = [];

  if (visibility === 'both' || visibility === 'public') {
    channels.push(publicQuizChannel(quizId));
  }

  if (visibility === 'both' || visibility === 'admin') {
    channels.push(adminQuizChannel(quizId));
  }

  await Promise.all(channels.map((channel) => publishRedisMessage(channel, payload)));
}

export async function createQuizEventStream({ request, quizId, audience = 'public' }) {
  const subscriber = await createRedisSubscriber();
  const channel = audience === 'admin' ? adminQuizChannel(quizId) : publicQuizChannel(quizId);
  const encoder = new TextEncoder();
  let heartbeatId;
  let subscribed = false;
  let closed = false;

  async function closeStream(controller) {
    if (closed) {
      return;
    }

    closed = true;
    if (heartbeatId) {
      clearInterval(heartbeatId);
    }

    try {
      if (subscribed && subscriber.isOpen) {
        await subscriber.unsubscribe(channel);
      }
    } catch {
      // Ignore unsubscribe errors during teardown.
    }

    try {
      if (subscriber.isOpen) {
        await subscriber.quit();
      }
    } catch {
      // Ignore quit errors during teardown.
    }

    try {
      controller.close();
    } catch {
      // Ignore double-close attempts.
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event, data) => {
        controller.enqueue(encoder.encode(encodeEvent(event, data)));
      };

      request.signal.addEventListener('abort', () => {
        void closeStream(controller);
      }, { once: true });

      send('ready', { quizId, audience, at: new Date().toISOString() });
      heartbeatId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': keep-alive\n\n'));
        } catch {
          void closeStream(controller);
        }
      }, 15000);

      try {
        await subscriber.subscribe(channel, (message) => {
          if (closed) {
            return;
          }

          try {
            send('update', JSON.parse(message));
          } catch {
            send('update', { quizId, audience, reason: 'updated', at: new Date().toISOString() });
          }
        });
        subscribed = true;
      } catch (error) {
        controller.error(error);
        await closeStream(controller);
      }
    },
    async cancel() {
      const noopController = { close() {} };
      await closeStream(noopController);
    },
  });

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream; charset=utf-8',
      'X-Accel-Buffering': 'no',
    },
  });
}