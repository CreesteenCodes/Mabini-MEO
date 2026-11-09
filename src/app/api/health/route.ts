export async function GET() {
  return Response.json({
    status: 'ok',
    service: 'local-road',
    environment: 'development',
    mode: 'local-nextjs-sqlite',
  });
}
