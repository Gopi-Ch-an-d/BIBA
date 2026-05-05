"""
api/routes.py — All FastAPI route definitions (Updated for New Schema)
"""
import io
import logging
from datetime import datetime, timedelta
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from db.database import get_db
from db.models import (
    Competitor, BestsellerProduct, NewArrivalProduct, 
    PriceHistory, ScrapeLog, User, Category, ProductSize
)
from api.auth import create_access_token, verify_password, get_current_user
from api.schemas import (
    CompetitorCreate, CompetitorOut,
    ProductOut, ProductListResponse,
    PriceHistoryPoint,
    CompetitorOverviewCard,
    ScrapeLogOut,
    TriggerScrapeResponse,
    Token, LoginRequest
)

logger = logging.getLogger(__name__)
router = APIRouter()


# ══════════════════════════════════════════════════════════════════════════════
#  AUTHENTICATION
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/auth/login", response_model=Token, tags=["Auth"])
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}


# ══════════════════════════════════════════════════════════════════════════════
#  COMPETITORS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/competitors", response_model=list[CompetitorOut], tags=["Competitors"])
async def list_competitors(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Competitor)
        .options(selectinload(Competitor.categories))
        .where(Competitor.is_deleted == False)
        .order_by(Competitor.name)
    )
    return result.scalars().all()


@router.post("/competitors", response_model=CompetitorOut, tags=["Competitors"])
async def create_competitor(payload: CompetitorCreate, db: AsyncSession = Depends(get_db)):
    # Check for existing code
    existing = await db.execute(select(Competitor).where(Competitor.code == payload.code))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Competitor with code '{payload.code}' already exists")

    # Create competitor object
    competitor_data = payload.model_dump()
    categories_data = competitor_data.pop("categories", [])
    
    competitor = Competitor(**competitor_data)
    db.add(competitor)
    await db.flush() # Get the competitor_id
    
    # Create categories
    for cat_data in categories_data:
        # Default slug if not provided
        if not cat_data.get("slug"):
            cat_data["slug"] = cat_data["name"].lower().replace(" ", "_")
        
        category = Category(competitor_id=competitor.record_id, **cat_data)
        db.add(category)
    
    await db.flush()
    await db.refresh(competitor)
    return competitor


# ══════════════════════════════════════════════════════════════════════════════
#  DASHBOARD OVERVIEW
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard/overview", response_model=list[CompetitorOverviewCard], tags=["Dashboard"])
async def dashboard_overview(db: AsyncSession = Depends(get_db)):
    competitors = (await db.execute(select(Competitor).where(Competitor.is_deleted == False))).scalars().all()
    cards = []

    for comp in competitors:
        today_midnight = datetime.combine(datetime.utcnow().date(), datetime.min.time())
        yesterday_midnight = today_midnight - timedelta(days=1)
        
        # Check if we have any updates today. If not, use yesterday as threshold.
        # This ensures the dashboard always shows the latest "Live" snapshot.
        has_today = (await db.execute(
            select(func.count(NewArrivalProduct.record_id))
            .where(NewArrivalProduct.competitor_id == comp.record_id, NewArrivalProduct.last_updated_at >= today_midnight)
        )).scalar()
        
        threshold = today_midnight if has_today > 0 else yesterday_midnight

        # Bestseller stats (Active only)
        bs_stats = (await db.execute(
            select(
                func.count().label("count"),
                func.avg(BestsellerProduct.current_price).label("avg_price"),
                func.avg(BestsellerProduct.discount_pct).label("avg_disc"),
                func.count().filter(BestsellerProduct.stock_available == False).label("oos_count"),
                func.count().filter(BestsellerProduct.first_seen_at >= today_midnight).label("daily_new_count")
            ).where(
                BestsellerProduct.competitor_id == comp.record_id,
                BestsellerProduct.is_deleted == False
            )
        )).first()

        # New Arrival stats (Active only)
        na_stats = (await db.execute(
            select(
                func.count().label("count"),
                func.avg(NewArrivalProduct.current_price).label("avg_price"),
                func.avg(NewArrivalProduct.discount_pct).label("avg_disc"),
                func.count().filter(NewArrivalProduct.stock_available == False).label("oos_count"),
                func.count().filter(NewArrivalProduct.first_seen_at >= today_midnight).label("daily_new_count")
            ).where(
                NewArrivalProduct.competitor_id == comp.record_id,
                NewArrivalProduct.is_deleted == False
            )
        )).first()

        total_products = (bs_stats.count or 0) + (na_stats.count or 0)
        daily_new_total = (bs_stats.daily_new_count or 0) + (na_stats.daily_new_count or 0)
        
        # Combined averages (rough)
        all_prices = []
        if bs_stats.avg_price: all_prices.append(bs_stats.avg_price)
        if na_stats.avg_price: all_prices.append(na_stats.avg_price)
        avg_price = sum(all_prices) / len(all_prices) if all_prices else None

        all_discs = []
        if bs_stats.avg_disc: all_discs.append(bs_stats.avg_disc)
        if na_stats.avg_disc: all_discs.append(na_stats.avg_disc)
        avg_disc = sum(all_discs) / len(all_discs) if all_discs else None

        oos_total = (bs_stats.oos_count or 0) + (na_stats.oos_count or 0)

        # Last scrape time
        last_log = (await db.execute(
            select(ScrapeLog.inserted_datetime)
            .where(ScrapeLog.competitor_id == comp.record_id, ScrapeLog.status == "success")
            .order_by(ScrapeLog.inserted_datetime.desc())
            .limit(1)
        )).scalar()

        cards.append(CompetitorOverviewCard(
            competitor_id=comp.record_id,
            competitor_name=comp.name,
            total_products=total_products,
            avg_price=round(avg_price, 0) if avg_price else None,
            avg_discount_pct=round(avg_disc, 1) if avg_disc else None,
            new_arrivals_count=na_stats.count or 0,
            bestsellers_count=bs_stats.count or 0,
            out_of_stock_count=oos_total,
            daily_new_products_count=daily_new_total,
            last_scraped_at=last_log,
        ))

    return cards


# ══════════════════════════════════════════════════════════════════════════════
#  PRODUCTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/products", response_model=ProductListResponse, tags=["Products"])
async def list_products(
    competitor_id: Optional[int] = Query(None),
    category: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    is_bestseller: Optional[bool] = Query(None),
    is_new_launch: Optional[bool] = Query(None),
    in_stock: Optional[bool] = Query(None),
    search: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    sort_by: str = Query("last_updated_at", enum=["last_updated_at", "current_price", "discount_pct", "first_seen_at"]),
    sort_dir: str = Query("desc", enum=["asc", "desc"]),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import union_all, literal, cast, Date
    from datetime import datetime

    def build_query(model, is_bs, is_nl, ts_threshold=None):
        source_name = 'bestseller' if model == BestsellerProduct else 'new_arrival'
        # ── FIXED: Only sum the LATEST snapshot for each size ──────────────
        latest_snaps = select(
            ProductSize.size,
            func.max(ProductSize.last_updated_at).label("max_ts")
        ).where(
            ProductSize.product_id == model.record_id,
            ProductSize.source == source_name
        ).group_by(ProductSize.size).subquery()

        qty_subq = select(func.sum(ProductSize.quantity)).join(
            latest_snaps,
            and_(
                ProductSize.size == latest_snaps.c.size,
                ProductSize.last_updated_at == latest_snaps.c.max_ts
            )
        ).where(
            ProductSize.product_id == model.record_id,
            ProductSize.source == source_name
        ).scalar_subquery()

        disclose_subq = select(func.bool_and(ProductSize.is_quantity_disclose)).join(
            latest_snaps,
            and_(
                ProductSize.size == latest_snaps.c.size,
                ProductSize.last_updated_at == latest_snaps.c.max_ts
            )
        ).where(
            ProductSize.product_id == model.record_id,
            ProductSize.source == source_name
        ).scalar_subquery()

        q = select(
            model.record_id,
            model.competitor_id,
            model.category_id,
            model.sku,
            model.name,
            Category.name.label("category"),
            model.current_price,
            model.original_price,
            model.discount_pct,
            model.stock_available,
            model.image_url,
            model.product_url,
            model.first_seen_at,
            model.last_updated_at,
            model.is_active,
            model.is_deleted,
            Competitor.name.label("competitor_name"),
            literal(is_bs).label("is_bestseller"),
            literal(is_nl).label("is_new_launch"),
            func.coalesce(qty_subq, 0).label("total_quantity"),
            func.coalesce(disclose_subq, True).label("is_quantity_disclose")
        ).join(Competitor, model.competitor_id == Competitor.record_id)\
         .outerjoin(Category, model.category_id == Category.record_id)
        
        filters = []
        if competitor_id: filters.append(model.competitor_id == competitor_id)
        if category: filters.append(Category.name.ilike(f"%{category}%"))
        if min_price is not None: filters.append(model.current_price >= min_price)
        if max_price is not None: filters.append(model.current_price <= max_price)
        if in_stock is not None: filters.append(model.stock_available == in_stock)
        if search: filters.append(model.name.ilike(f"%{search}%"))
        
        # Default behavior: Show all active products (Live data)
        if not date:
            # We no longer restrict to last 24h to ensure full catalog visibility
            pass
            filters.append(model.is_deleted == False)
            # We show all products regardless of is_active status as per user request

        if date:
            try:
                parsed_date = datetime.strptime(date, "%Y-%m-%d").date()
                # For New Arrivals, "Added on date" means first_seen_at
                filters.append(cast(model.first_seen_at, Date) == parsed_date)
            except ValueError:
                pass
        
        if filters:
            q = q.where(and_(*filters))
        return q

    # Determine latest update threshold across relevant models
    ts_threshold = None
    if not date:
        # Get the max last_updated_at from NewArrivalProduct for this competitor
        # This represents the start time of the most recent scrape
        ts_q = select(func.max(NewArrivalProduct.last_updated_at))
        if competitor_id:
            ts_q = ts_q.where(NewArrivalProduct.competitor_id == competitor_id)
        ts_threshold = (await db.execute(ts_q)).scalar()

    queries = []
    if is_bestseller is True or (is_bestseller is None and is_new_launch is None):
        queries.append(build_query(BestsellerProduct, True, False, ts_threshold))
        
    if is_new_launch is True or (is_bestseller is None and is_new_launch is None):
        queries.append(build_query(NewArrivalProduct, False, True, ts_threshold))

    if not queries:
        return ProductListResponse(total=0, page=page, page_size=page_size, products=[])

    if len(queries) == 1:
        combined_q = queries[0]
    else:
        combined_q = union_all(*queries)

    subq = combined_q.subquery()
    
    total_q = select(func.count()).select_from(subq)
    total = (await db.execute(total_q)).scalar() or 0

    sort_col = getattr(subq.c, sort_by)
    order = sort_col.desc() if sort_dir == "desc" else sort_col.asc()
    
    final_q = select(subq).order_by(order).offset((page - 1) * page_size).limit(page_size)
    results = (await db.execute(final_q)).all()

    items = [ProductOut(**row._mapping) for row in results]

    return ProductListResponse(total=total, page=page, page_size=page_size, products=items)


# ══════════════════════════════════════════════════════════════════════════════
#  TREND ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/analytics/price-trend", response_model=list[PriceHistoryPoint], tags=["Analytics"])
async def price_trend(
    competitor_id: int = Query(...),
    days: int = Query(30, ge=7, le=90),
    is_new_launch: bool = Query(False),
    db: AsyncSession = Depends(get_db),
):
    """Average daily price & discount for a competitor over the last N days."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    
    # Use unified history table
    HistModel = PriceHistory
    source = "new_arrival" if is_new_launch else "bestseller"
    ProdModel = NewArrivalProduct if is_new_launch else BestsellerProduct

    q = (
        select(
            func.date_trunc("day", HistModel.scraped_at).label("scraped_at"),
            func.avg(HistModel.price).label("price"),
            func.avg(HistModel.original_price).label("original_price"),
            func.avg(HistModel.discount_pct).label("discount_pct"),
        )
        .join(ProdModel, HistModel.product_id == ProdModel.record_id)
        .where(
            ProdModel.competitor_id == competitor_id, 
            HistModel.scraped_at >= cutoff,
            HistModel.source == source
        )
        .group_by("scraped_at")
        .order_by("scraped_at")
    )
    rows = (await db.execute(q)).all()
    return [
        PriceHistoryPoint(
            scraped_at=r.scraped_at,
            price=round(r.price, 2) if r.price else None,
            original_price=round(r.original_price, 2) if r.original_price else None,
            discount_pct=round(r.discount_pct, 1) if r.discount_pct else None,
        )
        for r in rows
    ]


@router.get("/analytics/product/{source}/{p_id}/size-history", tags=["Analytics"])
async def product_size_history(
    source: str, # 'bestseller' or 'new_arrival'
    p_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get current size availability and quantities for a product."""
    from db.models import ProductSize
    
    q = select(ProductSize).where(
        ProductSize.source == source,
        ProductSize.product_id == p_id
    ).order_by(ProductSize.size)
    
    rows = (await db.execute(q)).scalars().all()
    
    # Return in format expected by frontend: [{captured_at, size, quantity}]
    return [
        {
            "captured_at": r.last_updated_at,
            "size": r.size,
            "quantity": r.quantity,
            "is_available": r.is_available,
            "is_quantity_disclose": r.is_quantity_disclose
        }
        for r in rows
    ]


@router.get("/analytics/product/{sku}/history", tags=["Analytics"])
async def product_sku_history(
    sku: str,
    db: AsyncSession = Depends(get_db)
):
    """Get full price history for a specific SKU, deduplicated by day."""
    from sqlalchemy import cast, Date
    
    # We use a subquery to get the latest record for each day to avoid duplicates
    subq = (
        select(
            func.max(PriceHistory.scraped_at).label("max_ts")
        )
        .where(PriceHistory.sku == sku)
        .group_by(cast(PriceHistory.scraped_at, Date))
    ).subquery()

    q = (
        select(PriceHistory)
        .join(subq, PriceHistory.scraped_at == subq.c.max_ts)
        .where(PriceHistory.sku == sku)
        .order_by(PriceHistory.scraped_at.desc())
    )
    
    rows = (await db.execute(q)).scalars().all()
    return rows


# ══════════════════════════════════════════════════════════════════════════════
#  EXPORTS
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/exports/excel", tags=["Exports"])
async def export_excel(
    competitor_id: Optional[int] = Query(None),
    is_new_launch: Optional[bool] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Generates an Excel file containing product data based on filters."""
    # Logic to fetch products
    model = NewArrivalProduct if is_new_launch is True else BestsellerProduct
    
    q = select(
        model, 
        Competitor.name.label("competitor_name"),
        Category.name.label("cat_name")
    ).join(Competitor, model.competitor_id == Competitor.record_id)\
     .outerjoin(Category, model.category_id == Category.record_id)
    if competitor_id:
        q = q.where(model.competitor_id == competitor_id)
    
    results = (await db.execute(q)).all()
    
    data = []
    for row in results:
        p = row[0]
        data.append({
            "Competitor": row[1],
            "SKU": p.sku,
            "Name": p.name,
            "Category": row[2] or "",
            "Current Price": p.current_price,
            "Original Price": p.original_price,
            "Discount %": p.discount_pct,
            "In Stock": p.stock_available,
            "First Seen": p.first_seen_at.strftime("%Y-%m-%d") if p.first_seen_at else "",
            "Last Updated": p.last_updated_at.strftime("%Y-%m-%d") if p.last_updated_at else "",
            "Product URL": p.product_url
        })
    
    df = pd.DataFrame(data)
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Intelligence Data')
    
    output.seek(0)
    
    filename = f"biba_ci_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/exports/pdf", tags=["Exports"])
async def export_pdf():
    """Placeholder for PDF export - normally would use ReportLab or similar."""
    raise HTTPException(status_code=501, detail="PDF export not yet implemented. Please use Excel for now.")


# ══════════════════════════════════════════════════════════════════════════════
#  SCRAPE CONTROL
# ══════════════════════════════════════════════════════════════════════════════

@router.post("/scrape/trigger", response_model=TriggerScrapeResponse, tags=["Scrape Control"])
async def trigger_scrape(
    competitor_name: Optional[str] = None
):
    try:
        from scheduler.tasks import scrape_all_competitors, scrape_single_competitor
        if competitor_name:
            task = scrape_single_competitor.delay(competitor_name)
            return TriggerScrapeResponse(
                message=f"Scrape queued for {competitor_name}",
                competitor_name=competitor_name,
                task_id=task.id,
            )
        else:
            task = scrape_all_competitors.delay()
            return TriggerScrapeResponse(
                message="Scrape queued for all active competitors",
                competitor_name=None,
                task_id=task.id,
            )
    except Exception as e:
        raise HTTPException(500, f"Failed to queue task: {e}")


@router.post("/scrape/stop", tags=["Scrape Control"])
async def stop_scrape():
    try:
        from scheduler.tasks import celery_app
        # Purge waiting tasks
        purged = celery_app.control.purge()
        
        # Revoke currently running tasks
        # Note: terminate=True is needed to kill active subprocesses
        i = celery_app.control.inspect()
        active = i.active()
        count = 0
        if active:
            for node, tasks in active.items():
                for t in tasks:
                    celery_app.control.revoke(t['id'], terminate=True)
                    count += 1
        
        return {
            "message": f"Scraper stopped. Purged {purged} tasks. Terminated {count} active tasks.",
            "purged": purged,
            "terminated": count
        }
    except Exception as e:
        raise HTTPException(500, f"Failed to stop scraper: {e}")


@router.get("/scrape/logs", response_model=list[ScrapeLogOut], tags=["Scrape Control"])
async def scrape_logs(
    competitor_id: Optional[int] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    q = select(ScrapeLog).order_by(ScrapeLog.inserted_datetime.desc()).limit(limit)
    if competitor_id:
        q = q.where(ScrapeLog.competitor_id == competitor_id)
    rows = (await db.execute(q)).scalars().all()
    return rows
