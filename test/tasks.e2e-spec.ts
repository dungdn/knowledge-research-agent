import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Tasks API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/tasks should return paginated list', () => {
    return request(app.getHttpServer())
      .get('/api/v1/tasks')
      .expect(200)
      .expect((res) => {
        expect(res.body).toHaveProperty('items');
        expect(res.body).toHaveProperty('total');
        expect(res.body).toHaveProperty('page', 1);
        expect(res.body).toHaveProperty('limit', 10);
      });
  });

  it('POST /api/v1/tasks (queued) -> GET -> CANCEL workflow', async () => {
    // 1. Create queued task
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .send({
        goal: 'Research Vector Databases for RAG',
        executeImmediately: false,
      })
      .expect(201);

    const taskId = createRes.body.id;
    expect(taskId).toBeDefined();
    expect(createRes.body.status).toBe('queued');

    // 2. Query task by ID
    const getRes = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${taskId}`)
      .expect(200);

    expect(getRes.body.id).toBe(taskId);
    expect(getRes.body.status).toBe('queued');

    // 3. Query events for task
    const eventsRes = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${taskId}/events`)
      .expect(200);

    expect(Array.isArray(eventsRes.body)).toBe(true);

    // 4. Cancel task
    const cancelRes = await request(app.getHttpServer())
      .post(`/api/v1/tasks/${taskId}/cancel`)
      .expect(200);

    expect(cancelRes.body.status).toBe('cancelled');
  });

  it('POST /api/v1/tasks with invalid payload should return 400', () => {
    return request(app.getHttpServer())
      .post('/api/v1/tasks')
      .send({ goal: 'ab' }) // shorter than 3 chars
      .expect(400);
  });
});
