from fastapi import APIRouter

router = APIRouter()


@router.get('/auth/health')
def auth_health():
    return {'status': 'ok'}
