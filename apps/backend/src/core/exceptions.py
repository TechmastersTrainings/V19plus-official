from typing import Any, Dict, Optional
from fastapi import Request, status
from fastapi.responses import JSONResponse


class V19plusException(Exception):
    """Base domain exception for V19plus platform"""
    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        error_code: str = "BAD_REQUEST",
        details: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class NotFoundException(V19plusException):
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} with identifier '{identifier}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
            error_code="NOT_FOUND",
        )


class UnauthorizedException(V19plusException):
    def __init__(self, message: str = "Authentication required or invalid credentials."):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            error_code="UNAUTHORIZED",
        )


class ForbiddenException(V19plusException):
    def __init__(self, message: str = "You do not have permission to perform this action."):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            error_code="FORBIDDEN",
        )


class EntitlementRequiredException(V19plusException):
    def __init__(self, message: str = "Active subscription or specific entitlement required to access this content."):
        super().__init__(
            message=message,
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            error_code="ENTITLEMENT_REQUIRED",
        )


class ConflictException(V19plusException):
    def __init__(self, message: str):
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            error_code="CONFLICT",
        )


async def v19plus_exception_handler(request: Request, exc: V19plusException) -> JSONResponse:
    """RFC 7807 compliant problem details response format"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "type": f"https://v19plus.com/errors/{exc.error_code.lower()}",
            "title": exc.error_code,
            "status": exc.status_code,
            "detail": exc.message,
            "instance": str(request.url),
            "details": exc.details,
        },
    )
