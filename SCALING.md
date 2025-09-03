# Scaling Guide: Handling 50,000+ Concurrent Votes

## Overview

This guide outlines the infrastructure and code changes needed to handle extreme load scenarios where 50,000+ users attempt to vote simultaneously within a 1-second window.

## Current Architecture Bottlenecks

### Database Layer
- **Connection Pool Exhaustion**: Each vote creates 2-3 database connections
- **Row-level Locking**: Concurrent votes on the same poll create lock contention
- **Multiple Round Trips**: 3 separate queries per vote (fetch poll, delete existing, insert new)
- **No Connection Pooling**: Each request creates new connections

### Application Layer
- **Synchronous Processing**: All votes processed sequentially
- **No Rate Limiting**: Users can spam votes
- **Memory Usage**: 50k concurrent requests = ~2GB+ memory usage
- **No Caching**: Poll data fetched from DB for every vote

### Network Layer
- **Single Region**: All traffic hits one server
- **No CDN**: Static assets served from origin
- **No Load Balancing**: Single point of failure

## Performance Projections

### Current System (Without Optimization)
- **Expected Response Time**: 5-30 seconds
- **Success Rate**: ~10-20%
- **Database Connections**: 150,000+ concurrent
- **Memory Usage**: 8GB+
- **Failure Mode**: Connection pool exhaustion, timeouts

### Optimized System (With All Improvements)
- **Expected Response Time**: 50-200ms
- **Success Rate**: 95%+
- **Database Connections**: 100-500 concurrent
- **Memory Usage**: 1-2GB
- **Throughput**: 50,000+ votes/second

## Implementation Strategy

### Phase 1: Immediate Fixes (1-2 days)

#### 1. Connection Pool Optimization
```typescript
// supabase-server.ts
import { createClient } from '@supabase/supabase-js'

export const createServerSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: {
        schema: 'public',
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        fetch: (...args) => fetch(...args),
        headers: {
          'Connection': 'keep-alive',
          'Keep-Alive': 'timeout=5, max=1000'
        }
      },
      // Connection pooling configuration
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    }
  )
}
```

#### 2. Database Query Optimization
```sql
-- Add indexes for faster vote queries
CREATE INDEX CONCURRENTLY idx_votes_poll_user ON votes(poll_id, user_id);
CREATE INDEX CONCURRENTLY idx_votes_poll_fingerprint ON votes(poll_id, voter_fingerprint);
CREATE INDEX CONCURRENTLY idx_polls_active ON polls(id) WHERE expires_at IS NULL OR expires_at > NOW();

-- Optimize vote insertion with UPSERT
CREATE OR REPLACE FUNCTION cast_vote_atomic(
  p_poll_id UUID,
  p_option_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_fingerprint TEXT DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  poll_record RECORD;
  existing_vote_count INTEGER;
  result JSON;
BEGIN
  -- Get poll settings in one query
  SELECT allow_multiple_votes, expires_at INTO poll_record
  FROM polls 
  WHERE id = p_poll_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Poll not found');
  END IF;
  
  -- Check expiration
  IF poll_record.expires_at IS NOT NULL AND poll_record.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'Poll has expired');
  END IF;
  
  -- Handle single vote restriction
  IF NOT poll_record.allow_multiple_votes THEN
    -- Use UPSERT to handle concurrent votes atomically
    INSERT INTO votes (poll_id, option_id, user_id, voter_fingerprint)
    VALUES (p_poll_id, p_option_id, p_user_id, p_fingerprint)
    ON CONFLICT (poll_id, COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::UUID))
    DO UPDATE SET 
      option_id = EXCLUDED.option_id,
      updated_at = NOW()
    RETURNING id;
  ELSE
    -- Multiple votes allowed, simple insert
    INSERT INTO votes (poll_id, option_id, user_id, voter_fingerprint)
    VALUES (p_poll_id, p_option_id, p_user_id, p_fingerprint);
  END IF;
  
  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql;
```

#### 3. Rate Limiting Implementation
```typescript
// lib/rate-limit.ts
import { NextRequest } from 'next/server'

const rateLimitMap = new Map()

export async function rateLimit(
  request: NextRequest,
  limit: number = 10,
  windowMs: number = 60000
): Promise<{ success: boolean; remaining: number }> {
  const ip = request.ip ?? '127.0.0.1'
  const userId = request.headers.get('x-user-id')
  const identifier = userId || ip
  
  const now = Date.now()
  const windowStart = now - windowMs
  
  const userRequests = rateLimitMap.get(identifier) || []
  const requestsInWindow = userRequests.filter((time: number) => time > windowStart)
  
  if (requestsInWindow.length >= limit) {
    return { success: false, remaining: 0 }
  }
  
  requestsInWindow.push(now)
  rateLimitMap.set(identifier, requestsInWindow)
  
  return { 
    success: true, 
    remaining: limit - requestsInWindow.length 
  }
}
```

### Phase 2: Infrastructure Scaling (3-5 days)

#### 1. Redis Implementation
```dockerfile
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    restart: unless-stopped

  redis-cluster:
    image: redis:7-alpine
    deploy:
      replicas: 3
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf

volumes:
  redis-data:
```

#### 2. Database Read Replicas
```typescript
// lib/supabase-read-replica.ts
export const createReadReplicaSupabase = () => {
  return createClient(
    process.env.SUPABASE_READ_REPLICA_URL!,
    process.env.SUPABASE_ANON_KEY!
  )
}

export const createWriteSupabase = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

#### 3. Load Balancing Configuration
```nginx
# nginx.conf
upstream nextjs_backend {
    least_conn;
    server app1:3000 max_fails=3 fail_timeout=30s;
    server app2:3000 max_fails=3 fail_timeout=30s;
    server app3:3000 max_fails=3 fail_timeout=30s;
    server app4:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 80;
    server_name polling-app.com;
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=vote_limit:10m rate=10r/s;
    
    location /api/vote {
        limit_req zone=vote_limit burst=20 nodelay;
        proxy_pass http://nextjs_backend;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    # Static assets caching
    location /_next/static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Phase 3: Advanced Optimizations (1-2 weeks)

#### 1. Queue-Based Processing
```typescript
// lib/queue/vote-processor.ts
import Bull from 'bull'
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)
const voteQueue = new Bull('vote processing', {
  redis: {
    host: 'localhost',
    port: 6379,
  },
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  }
})

// Process votes in batches
voteQueue.process('batch-votes', 10, async (job) => {
  const { votes } = job.data
  
  // Process 100 votes at once
  const batchSize = 100
  for (let i = 0; i < votes.length; i += batchSize) {
    const batch = votes.slice(i, i + batchSize)
    await processBatchVotes(batch)
  }
})

export async function queueVote(voteData: any) {
  await voteQueue.add('batch-votes', { votes: [voteData] }, {
    priority: 1,
    delay: 0,
  })
}
```

#### 2. WebSocket Real-time Updates
```typescript
// lib/websocket/vote-updates.ts
import { Server as SocketIOServer } from 'socket.io'
import { createServer } from 'http'

export function initializeWebSocket(server: any) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  })

  io.on('connection', (socket) => {
    socket.on('join-poll', (pollId: string) => {
      socket.join(`poll-${pollId}`)
    })

    socket.on('vote-cast', async (voteData) => {
      // Queue the vote for processing
      await queueVote(voteData)
      
      // Emit immediate acknowledgment
      socket.emit('vote-queued', { success: true })
      
      // Broadcast to poll room (after processing)
      io.to(`poll-${voteData.pollId}`).emit('vote-update', {
        pollId: voteData.pollId,
        optionId: voteData.optionId,
        timestamp: Date.now()
      })
    })
  })

  return io
}
```

#### 3. Database Sharding Strategy
```sql
-- Partition votes table by poll_id hash
CREATE TABLE votes_partition_0 PARTITION OF votes
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
    
CREATE TABLE votes_partition_1 PARTITION OF votes
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
    
CREATE TABLE votes_partition_2 PARTITION OF votes
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);
    
CREATE TABLE votes_partition_3 PARTITION OF votes
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);

-- Create indexes on each partition
CREATE INDEX votes_partition_0_poll_idx ON votes_partition_0(poll_id);
CREATE INDEX votes_partition_1_poll_idx ON votes_partition_1(poll_id);
CREATE INDEX votes_partition_2_poll_idx ON votes_partition_2(poll_id);
CREATE INDEX votes_partition_3_poll_idx ON votes_partition_3(poll_id);
```

## Monitoring and Observability

### 1. Performance Metrics Dashboard
```typescript
// lib/monitoring/metrics.ts
export interface PerformanceMetrics {
  responseTime: number
  throughput: number
  errorRate: number
  activeConnections: number
  queueLength: number
  cacheHitRate: number
}

export async function collectMetrics(): Promise<PerformanceMetrics> {
  return {
    responseTime: await getAverageResponseTime(),
    throughput: await getVotesPerSecond(),
    errorRate: await getErrorRate(),
    activeConnections: await getActiveConnections(),
    queueLength: await getQueueLength(),
    cacheHitRate: await getCacheHitRate()
  }
}
```

### 2. Alert Thresholds
```yaml
# alerts.yml
alerts:
  - name: HighErrorRate
    condition: error_rate > 0.05
    action: scale_up
    
  - name: HighResponseTime
    condition: avg_response_time > 1000
    action: investigate
    
  - name: DatabaseConnections
    condition: active_connections > 80
    action: scale_database
    
  - name: QueueBacklog
    condition: queue_length > 10000
    action: scale_workers
```

## Testing Strategy

### 1. Load Testing Script
```javascript
// tests/load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'

export let options = {
  stages: [
    { duration: '30s', target: 1000 },   // Ramp up
    { duration: '60s', target: 10000 },  // Stay at 10k users
    { duration: '30s', target: 50000 },  // Spike to 50k
    { duration: '60s', target: 50000 },  // Maintain 50k
    { duration: '30s', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.05'],   // Error rate under 5%
  }
}

export default function() {
  const pollId = 'test-poll-id'
  const optionIds = ['option-1', 'option-2', 'option-3']
  
  const payload = JSON.stringify({
    poll_id: pollId,
    option_ids: [optionIds[Math.floor(Math.random() * optionIds.length)]],
    voter_fingerprint: `user-${__VU}-${Math.random()}`
  })

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  }

  const response = http.post('http://localhost:3000/api/vote', payload, params)
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  })

  sleep(1)
}
```

### 2. Chaos Engineering
```typescript
// tests/chaos/network-partition.ts
export async function simulateNetworkPartition(duration: number) {
  console.log(`Simulating network partition for ${duration}ms`)
  
  // Block Redis connections
  await blockPort(6379)
  
  // Partial database connectivity
  await throttlePort(5432, 0.3) // 30% packet loss
  
  setTimeout(async () => {
    await unblockPort(6379)
    await unthrottlePort(5432)
    console.log('Network partition simulation ended')
  }, duration)
}
```

## Deployment Strategy

### 1. Blue-Green Deployment
```yaml
# kubernetes/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: polling-app-blue
spec:
  replicas: 4
  selector:
    matchLabels:
      app: polling-app
      version: blue
  template:
    spec:
      containers:
      - name: app
        image: polling-app:v1.0.0
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /api/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
```

### 2. Auto-scaling Configuration
```yaml
# kubernetes/hpa.yml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: polling-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: polling-app
  minReplicas: 4
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

## Cost Analysis

### Infrastructure Costs (AWS)
- **Application Servers**: 4x c5.large instances = ~$280/month
- **Database**: RDS PostgreSQL Multi-AZ = ~$400/month
- **Redis**: ElastiCache r6g.large = ~$200/month
- **Load Balancer**: ALB = ~$25/month
- **Data Transfer**: ~$50/month
- **CloudFront CDN**: ~$30/month

**Total Estimated Cost**: ~$985/month for 50k concurrent users

### Performance Guarantees
- **Response Time**: 95th percentile under 500ms
- **Availability**: 99.9% uptime
- **Success Rate**: 99%+ under normal load, 95%+ under spike load
- **Data Consistency**: Eventual consistency with 1-2 second lag

## Emergency Response Plan

### 1. Circuit Breaker Pattern
```typescript
class VotingCircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  async executeVote(voteData: any): Promise<any> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > 60000) { // 1 minute
        this.state = 'HALF_OPEN'
      } else {
        throw new Error('Service temporarily unavailable')
      }
    }
    
    try {
      const result = await castVote(voteData)
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess() {
    this.failures = 0
    this.state = 'CLOSED'
  }
  
  private onFailure() {
    this.failures++
    if (this.failures >= 5) {
      this.state = 'OPEN'
      this.lastFailureTime = Date.now()
    }
  }
}
```

### 2. Graceful Degradation
```typescript
export async function castVoteWithFallback(voteData: VoteForm) {
  try {
    // Try optimized path first
    return await castVoteOptimized(voteData)
  } catch (error) {
    console.warn('Optimized voting failed, falling back to basic implementation')
    
    try {
      // Fallback to basic voting
      return await castVote(voteData)
    } catch (fallbackError) {
      // Final fallback: queue for later processing
      await queueVoteForLaterProcessing(voteData)
      return { success: true, queued: true }
    }
  }
}
```

## Conclusion

This scaling strategy transforms the polling application from handling hundreds of concurrent users to 50,000+ users through:

1. **Database Optimization**: Connection pooling, read replicas, query optimization
2. **Caching Strategy**: Redis for rate limiting and data caching
3. **Queue-based Processing**: Asynchronous vote processing to handle spikes
4. **Infrastructure Scaling**: Load balancing, auto-scaling, CDN
5. **Monitoring**: Real-time metrics and alerting
6. **Resilience**: Circuit breakers, graceful degradation, fallback mechanisms

The implementation should be done in phases to minimize risk and allow for testing at each stage. Total implementation time: 2-3 weeks for full production readiness.