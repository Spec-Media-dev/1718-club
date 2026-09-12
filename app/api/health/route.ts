import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: '1718-club',
    version: '0.2.0',
    timestamp: new Date().toISOString(),
  })
}
