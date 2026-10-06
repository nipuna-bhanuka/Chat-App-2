import type { IncomingMessage, ServerResponse } from 'node:http'
import type { GenerateContentParameters, GenerateContentResponse } from '@google/genai'
export function createApiHandler(
  env: Record<string, string | undefined>,
  generateOverride?: (request: GenerateContentParameters) => Promise<GenerateContentResponse>,
): (req: IncomingMessage, res: ServerResponse, next?: () => void) => Promise<void>
