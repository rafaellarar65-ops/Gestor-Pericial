from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx
import os

app = FastAPI(title="Gestor Pericial Proxy")

# Railway backend URL
RAILWAY_BACKEND = "https://gestor-pericial-production.up.railway.app"

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def proxy(request: Request, path: str):
    """Proxy all /api requests to Railway backend"""
    
    # Build target URL
    target_url = f"{RAILWAY_BACKEND}/api/{path}"
    
    # Get query params
    if request.query_params:
        target_url += f"?{request.query_params}"
    
    # Get request body
    body = await request.body()
    
    # Forward headers (excluding host)
    headers = dict(request.headers)
    headers.pop("host", None)
    headers.pop("content-length", None)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.request(
                method=request.method,
                url=target_url,
                content=body,
                headers=headers,
            )
            
            # Return proxied response
            return Response(
                content=response.content,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.headers.get("content-type")
            )
        except httpx.RequestError as e:
            return Response(
                content=f'{{"error": "Proxy error: {str(e)}"}}',
                status_code=502,
                media_type="application/json"
            )

@app.get("/health")
async def health():
    """Local health check"""
    return {"status": "ok", "proxy": "active", "target": RAILWAY_BACKEND}
