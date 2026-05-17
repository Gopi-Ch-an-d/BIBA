"""
api/schemas.py — Pydantic response/request models
"""
from __future__ import annotations
from datetime import datetime, date
from typing import Optional, Any
from pydantic import BaseModel, Field


# ── Roles ──────────────────────────────────────────────────────────────────

class RoleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None

class RoleOut(BaseModel):
    id: int = Field(validation_alias="record_id")
    name: str
    code: str
    description: Optional[str]
    is_active: bool
    inserted_datetime: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

# ── Users ──────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    password: str = Field(..., min_length=6)
    role_id: Optional[int] = None

class UserOut(BaseModel):
    id: int = Field(validation_alias="record_id")
    first_name: Optional[str]
    last_name: Optional[str]
    email: str
    phone: Optional[str]
    role_id: Optional[int]
    is_active: bool
    inserted_datetime: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None


# ── Employees ──────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    user_id: Optional[int] = None
    employee_code: str = Field(..., min_length=1, max_length=50)
    department: Optional[str] = None
    designation: Optional[str] = None
    joined_date: Optional[date] = None

class EmployeeOut(BaseModel):
    id: int = Field(validation_alias="record_id")
    user_id: Optional[int]
    employee_code: Optional[str]
    department: Optional[str]
    designation: Optional[str]
    joined_date: Optional[date]
    is_active: bool
    inserted_datetime: datetime

    class Config:
        from_attributes = True
        populate_by_name = True

class EmployeeUpdate(BaseModel):
    department: Optional[str] = None
    designation: Optional[str] = None
    joined_date: Optional[date] = None
    is_active: Optional[bool] = None


# ── Competitors ────────────────────────────────────────────────────────────────

# ── Categories ────────────────────────────────────────────────────────────────

class CategoryOut(BaseModel):
    id: int = Field(validation_alias="record_id")
    competitor_id: int
    name: str
    slug: str
    url: Optional[str]
    is_active: bool

    class Config:
        from_attributes = True
        populate_by_name = True


# ── Competitors ────────────────────────────────────────────────────────────────

class CompetitorBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=20, pattern=r"^[A-Z0-9_]+$")
    base_url: str = Field("", max_length=1000) # Lenient for display
    scraper_name: Optional[str] = Field(None, min_length=1)
    is_active: bool = True

class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: str = Field(..., pattern=r"^https?://")
    slug: Optional[str] = None

class CompetitorCreate(CompetitorBase):
    base_url: str = Field(..., pattern=r"^https?://")
    categories: list[CategoryCreate] = []

class CompetitorUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=20, pattern=r"^[A-Z0-9_]+$")
    base_url: Optional[str] = Field(None, pattern=r"^https?://")
    scraper_name: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None
    categories: Optional[list[CategoryCreate]] = None

class CompetitorOut(CompetitorBase):
    id: int = Field(validation_alias="record_id")
    categories: list[CategoryOut] = []
    inserted_datetime: datetime
    updated_datetime: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


# ── Products ───────────────────────────────────────────────────────────────────

class ProductOut(BaseModel):
    id: int = Field(validation_alias="record_id")
    competitor_id: int
    competitor_name: Optional[str] = None
    category_id: Optional[int] = None
    sku: str
    name: str
    category: Optional[str]
    current_price: Optional[float]
    original_price: Optional[float]
    discount_pct: Optional[float]
    stock_available: bool
    is_bestseller: bool = False
    is_new_launch: bool = False
    image_url: Optional[str]
    product_url: Optional[str]
    total_quantity: Optional[int] = 0
    is_quantity_disclose: bool = True
    first_seen_at: datetime
    last_updated_at: datetime
    is_active: bool

    class Config:
        from_attributes = True
        populate_by_name = True


class ProductListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    products: list[ProductOut]


# ── Price History ──────────────────────────────────────────────────────────────

class PriceHistoryPoint(BaseModel):
    scraped_at: datetime
    price: Optional[float]
    original_price: Optional[float]
    discount_pct: Optional[float]

    class Config:
        from_attributes = True


class NewArrivalTrendPoint(BaseModel):
    date: date
    count: int
    competitor_name: str

    class Config:
        from_attributes = True


# ── Dashboard Overview ─────────────────────────────────────────────────────────

class CompetitorOverviewCard(BaseModel):
    competitor_id: int
    competitor_name: str
    total_products: int
    avg_price: Optional[float]
    avg_discount_pct: Optional[float]
    new_arrivals_count: int
    bestsellers_count: int
    out_of_stock_count: int
    daily_new_products_count: int
    last_scraped_at: Optional[datetime]


# ── Scrape Logs ────────────────────────────────────────────────────────────────

class ScrapeLogOut(BaseModel):
    id: int = Field(validation_alias="record_id")
    competitor_id: Optional[int]
    scrape_type: str
    total_products: Optional[int]
    new_products: Optional[int]
    updated_products: Optional[int]
    status: str
    message: Optional[str]
    inserted_datetime: datetime

    class Config:
        from_attributes = True
        populate_by_name = True


# ── Trigger ────────────────────────────────────────────────────────────────────

class TriggerScrapeResponse(BaseModel):
    message: str
    competitor_name: Optional[str]
    task_id: Optional[str]
# ── Authentication ─────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str
