import { test, expect, describe } from 'bun:test';
import { Efw } from '../src/framework';
import { Router } from '../src/router';
import { SchemaValidator, createSchema, commonSchemas } from '../src/validation/schema';
import { EfwError, ValidationError } from '../src/utils/errors';

describe('Efw Core', () => {
  test('should create efw instance', () => {
    const app = new Efw();
    expect(app).toBeDefined();
  });

  test('should register routes', () => {
    const app = new Efw();
    app.get('/test', (req, res) => {
      res.json({ test: true });
    });
    expect(app).toBeDefined();
  });
});

describe('Router', () => {
  test('should match simple routes', () => {
    const router = new Router();
    router.get('/users', () => {});
    
    const match = router.findRoute('GET', '/users');
    expect(match).toBeDefined();
    expect(match?.route.path).toBe('/users');
  });

  test('should extract route parameters', () => {
    const router = new Router();
    router.get('/users/:id', () => {});
    
    const match = router.findRoute('GET', '/users/123');
    expect(match).toBeDefined();
    expect(match?.params.id).toBe('123');
  });

  test('should handle multiple parameters', () => {
    const router = new Router();
    router.get('/users/:userId/posts/:postId', () => {});
    
    const match = router.findRoute('GET', '/users/123/posts/456');
    expect(match).toBeDefined();
    expect(match?.params.userId).toBe('123');
    expect(match?.params.postId).toBe('456');
  });

  test('should return null for non-matching routes', () => {
    const router = new Router();
    router.get('/users', () => {});
    
    const match = router.findRoute('GET', '/posts');
    expect(match).toBeNull();
  });
});

describe('Validation', () => {
  test('should validate required fields', () => {
    const schema = createSchema({
      name: { type: 'string', required: true }
    });
    
    const validator = new SchemaValidator(schema);
    const { errors } = validator.validate({});
    
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('required');
  });

  test('should validate email format', () => {
    const schema = createSchema({
      email: commonSchemas.email
    });
    
    const validator = new SchemaValidator(schema);
    const { errors } = validator.validate({ email: 'invalid-email' });
    
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('format is invalid');
  });

  test('should validate string length', () => {
    const schema = createSchema({
      name: { type: 'string', min: 3, max: 10, required: true }
    });
    
    const validator = new SchemaValidator(schema);
    
    // Too short
    let { errors } = validator.validate({ name: 'ab' });
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('at least 3');
    
    // Too long
    ({ errors } = validator.validate({ name: 'this-is-too-long' }));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('at most 10');
    
    // Valid
    ({ errors } = validator.validate({ name: 'valid' }));
    expect(errors).toHaveLength(0);
  });

  test('should validate number ranges', () => {
    const schema = createSchema({
      age: { type: 'number', min: 18, max: 100, required: true }
    });
    
    const validator = new SchemaValidator(schema);
    
    // Too low
    let { errors } = validator.validate({ age: 17 });
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('at least 18');
    
    // Too high
    ({ errors } = validator.validate({ age: 101 }));
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('at most 100');
    
    // Valid
    ({ errors } = validator.validate({ age: 25 }));
    expect(errors).toHaveLength(0);
  });
});

describe('Error Handling', () => {
  test('should create efw error with status code', () => {
    const error = new EfwError('Test error', 400);
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe('Test error');
    expect(error.isOperational).toBe(true);
  });

  test('should create validation error', () => {
    const error = new ValidationError('Invalid field', 'email', 'invalid@');
    expect(error.statusCode).toBe(400);
    expect(error.field).toBe('email');
    expect(error.value).toBe('invalid@');
  });
});

describe('Common Schemas', () => {
  test('should validate email schema', () => {
    const validator = new SchemaValidator({ email: commonSchemas.email });
    
    // Valid emails
    let { errors } = validator.validate({ email: 'test@example.com' });
    expect(errors).toHaveLength(0);
    
    ({ errors } = validator.validate({ email: 'user+tag@domain.co.uk' }));
    expect(errors).toHaveLength(0);
    
    // Invalid emails
    ({ errors } = validator.validate({ email: 'invalid' }));
    expect(errors).toHaveLength(1);
    
    ({ errors } = validator.validate({ email: '@domain.com' }));
    expect(errors).toHaveLength(1);
  });

  test('should validate strong password schema', () => {
    const validator = new SchemaValidator({ password: commonSchemas.strongPassword });
    
    // Valid strong password
    let { errors } = validator.validate({ password: 'StrongP@ss123' });
    expect(errors).toHaveLength(0);
    
    // Too weak (will fail both length and pattern requirements)
    ({ errors } = validator.validate({ password: 'weak' }));
    expect(errors.length).toBeGreaterThan(0);
    
    // No special chars (will fail pattern requirement)
    ({ errors } = validator.validate({ password: '12345678' }));
    expect(errors.length).toBeGreaterThan(0);
  });
});