package job

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/motionmesh/server/shared/logger"
	"github.com/nats-io/nats.go"
)

type Consumer struct {
	nc      *nats.Conn
	handler *Handler
	log     *logger.Logger
}

func NewConsumer(nc *nats.Conn, handler *Handler, log *logger.Logger) *Consumer {
	return &Consumer{
		nc:      nc,
		handler: handler,
		log:     log,
	}
}

type TranscodeJobMessage struct {
	VideoID           string  `json:"video_id"`
	SourceObjectKey   string  `json:"source_object_key"`
	TranscodeBucketID *string `json:"transcode_bucket_id,omitempty"`
}

// jobTimeout is the hard deadline for one transcode job.
const jobTimeout = 90 * time.Minute

// heartbeatInterval controls how often we send InProgress pings to NATS.
// Must be less than AckWait on the consumer config.
const heartbeatInterval = 20 * time.Minute

func (c *Consumer) Start(ctx context.Context) error {
	js, err := c.nc.JetStream()
	if err != nil {
		return fmt.Errorf("failed to get jetstream context: %w", err)
	}

	// Ensure stream exists
	_, err = js.AddStream(&nats.StreamConfig{
		Name:     "TRANSCODE",
		Subjects: []string{"transcode.jobs"},
		Storage:  nats.FileStorage,
	})
	if err != nil {
		c.log.Error("failed to add stream (might already exist): %v", err)
	}

	// AckWait MUST be > heartbeatInterval so the message is never redelivered
	// while the worker is actively sending InProgress heartbeats.
	// MaxDeliver=3: after 3 permanent failures the message is discarded.
	_, err = js.AddConsumer("TRANSCODE", &nats.ConsumerConfig{
		Durable:       "transcode_worker",
		AckPolicy:     nats.AckExplicitPolicy,
		MaxDeliver:    3,
		AckWait:       jobTimeout + 5*time.Minute, // slightly longer than job timeout
		FilterSubject: "transcode.jobs",
	})
	if err != nil {
		c.log.Error("failed to add consumer (might already exist): %v", err)
	}

	sub, err := js.PullSubscribe("transcode.jobs", "transcode_worker")
	if err != nil {
		return fmt.Errorf("failed to pull subscribe: %w", err)
	}

	c.log.Info("Started NATS consumer for transcode.jobs")

	for {
		select {
		case <-ctx.Done():
			c.log.Info("Consumer shutting down")
			return nil
		default:
			msgs, err := sub.Fetch(1, nats.MaxWait(5*time.Second))
			if err != nil {
				if err != nats.ErrTimeout {
					c.log.Error("fetch error: %v", err)
				}
				continue
			}

			for _, msg := range msgs {
				c.handleMessage(ctx, msg)
			}
		}
	}
}

func (c *Consumer) handleMessage(ctx context.Context, msg *nats.Msg) {
	var payload TranscodeJobMessage
	if err := json.Unmarshal(msg.Data, &payload); err != nil {
		c.log.Error("failed to unmarshal message: %v", err)
		msg.Term() // Terminal error, don't retry
		return
	}

	c.log.Info("Processing job for video %s", payload.VideoID)

	jobCtx, cancel := context.WithTimeout(ctx, jobTimeout)
	defer cancel()

	// Send periodic InProgress heartbeats so NATS doesn't redeliver
	// the message while FFmpeg is running a long encode.
	heartbeatDone := make(chan struct{})
	go func() {
		ticker := time.NewTicker(heartbeatInterval)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				if err := msg.InProgress(); err != nil {
					c.log.Error("heartbeat InProgress failed for video %s: %v", payload.VideoID, err)
				} else {
					c.log.Info("Heartbeat sent for video %s", payload.VideoID)
				}
			case <-heartbeatDone:
				return
			case <-jobCtx.Done():
				return
			}
		}
	}()

	err := c.handler.Process(jobCtx, payload.VideoID, payload.SourceObjectKey, payload.TranscodeBucketID)
	close(heartbeatDone)

	if err != nil {
		c.log.Error("job failed for video %s: %v", payload.VideoID, err)
		// Job is marked failed in DB by handler; Term to discard from queue
		msg.Term()
		return
	}

	c.log.Info("Job completed successfully for video %s", payload.VideoID)
	msg.Ack()
}
