import { z } from 'zod';
import { LlmToolParameterProperty } from '../../llm/interfaces/llm.types';

export function zodToJsonSchema(schema: z.ZodTypeAny): {
  type: 'object';
  properties: Record<string, LlmToolParameterProperty>;
  required?: string[];
} {
  if (!(schema instanceof z.ZodObject)) {
    return {
      type: 'object',
      properties: {},
    };
  }

  const shape = schema.shape;
  const properties: Record<string, LlmToolParameterProperty> = {};
  const required: string[] = [];

  for (const [key, fieldDef] of Object.entries<z.ZodTypeAny>(shape)) {
    let currentDef = fieldDef;
    let isOptional = false;

    if (currentDef instanceof z.ZodOptional || currentDef instanceof z.ZodDefault) {
      isOptional = true;
      if (currentDef instanceof z.ZodOptional) {
        currentDef = currentDef._def.innerType;
      } else if (currentDef instanceof z.ZodDefault) {
        currentDef = currentDef._def.innerType;
      }
    }

    if (!isOptional) {
      required.push(key);
    }

    properties[key] = mapZodTypeToProperty(currentDef);
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
  };
}

function mapZodTypeToProperty(zodType: z.ZodTypeAny): LlmToolParameterProperty {
  const description = zodType.description;

  if (zodType instanceof z.ZodString) {
    return { type: 'string', description };
  }

  if (zodType instanceof z.ZodNumber) {
    return { type: 'number', description };
  }

  if (zodType instanceof z.ZodBoolean) {
    return { type: 'boolean', description };
  }

  if (zodType instanceof z.ZodEnum) {
    return {
      type: 'string',
      enum: zodType._def.values,
      description,
    };
  }

  if (zodType instanceof z.ZodArray) {
    return {
      type: 'array',
      items: mapZodTypeToProperty(zodType.element),
      description,
    };
  }

  if (zodType instanceof z.ZodObject) {
    const nested = zodToJsonSchema(zodType);
    return {
      type: 'object',
      properties: nested.properties,
      description,
    };
  }

  return { type: 'string', description };
}
