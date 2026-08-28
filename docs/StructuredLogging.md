# Structured Logging

Setting `log_format: json` (or `FGC_LOG_FORMAT=json`) makes Fileglancer write one JSON object per line to stdout instead of human-readable text. The field names follow the [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/index.html) (ECS), so Kibana's built-in visualizations understand them without any mapping work.

The default remains `text`; nothing changes unless you turn this on. Turn it on in production, leave it off for development.

## What gets logged

Every log record carries `@timestamp`, `log.level`, `log.logger`, `message`, `service.name`, `service.version` and `process.pid`. Records emitted while serving a request also carry `trace.id`, which is returned to the client in the `x-request-id` response header — so a user reporting a problem can quote an id that pulls up every line for that request, including the ones logged inside the handler.

One access line is logged per request, tagged `event.dataset: fileglancer.access`, with:

| Field | Notes |
|---|---|
| `event.duration` | Request duration in **nanoseconds** (the ECS unit). |
| `http.request.method`, `http.version` | |
| `http.response.status_code` | |
| `http.response.body.bytes` | Present when the response declared a Content-Length. |
| `url.path`, `url.query`, `url.domain` | Path is logged as the client encoded it. |
| `client.ip`, `client.port` | Corrected for the reverse proxy when running behind one. |
| `user_agent.original` | |
| `user.name` | Session or API-token user, absent when unauthenticated. |
| `labels.token_id` | Present on API-token requests; the id to revoke. |
| `labels.endpoint` | Handler function name. Group latency by this — raw paths have unbounded cardinality and are useless to aggregate over. |
| `error.type`, `error.message`, `error.stack_trace` | On records logged with an exception. |

Per-user worker subprocesses log in the same format. In text mode their output is forwarded through the parent tagged `[worker:username]`; in JSON mode they write their own records straight to the shared stdout, identifiable by `process.pid`.

## Shipping to Elasticsearch

Fileglancer logs to stdout, so a shipper reading the container's log files needs only to parse the JSON. For Filebeat:

```yaml
filebeat.inputs:
  - type: container
    paths:
      - /var/lib/docker/containers/*/*.log
    json.keys_under_root: true
    json.add_error_key: true
```

Since ECS field names are written as dotted keys, Elasticsearch expands them into the usual nested ECS document on ingest.

## Kibana

`event.duration` is a plain number, so a percentile aggregation over it gives p95/p99 directly. Set the field's format to *Duration* (input: nanoseconds) in the data view to have Kibana render it readably. Break it down by `labels.endpoint` to find a slow API route, by `user.name` to find a heavy user, or by `http.response.status_code` for error rates.

## Known limitation

`event.duration` is measured until the response starts, not until the last byte is sent, so file downloads are recorded as time-to-first-byte rather than transfer time. (x2s3, which serves the bulk data, does measure full transfer time.) Charting download latency here would mean rewriting the access log middleware as pure ASGI, the way x2s3's is.

Uvicorn logs two lines ("Started server process", "Waiting for application startup") before it imports the app, so those stay plain text on every start. Everything after that is JSON.
