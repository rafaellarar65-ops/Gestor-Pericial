import { APIRequestContext, expect } from '@playwright/test';

export const loginByApi = async (request: APIRequestContext, email: string, password: string) => {
  const response = await request.post('/api/auth/login', { data: { email, password } });
  expect(response.ok()).toBeTruthy();
  return response.json();
};

export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });
