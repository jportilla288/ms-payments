import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports the service as available with a timestamp', () => {
    const response = new HealthController().check();

    expect(response.status).toBe('ok');
    expect(Number.isNaN(Date.parse(response.timestamp))).toBe(false);
  });
});
