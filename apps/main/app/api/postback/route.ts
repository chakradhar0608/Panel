import { handleGlobalPostback } from './_handler'

export async function GET(req: Request) {
  return handleGlobalPostback(req)
}

export async function POST(req: Request) {
  return handleGlobalPostback(req)
}
