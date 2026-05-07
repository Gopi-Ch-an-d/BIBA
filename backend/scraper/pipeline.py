"""
scraper/pipeline.py — Orchestrates a full scrape run for one competitor (Updated for New Schema)
"""
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session
from sqlalchemy import select, update, func, and_, desc

from db.models import (
    Competitor, Category, BestsellerProduct, NewArrivalProduct,
    ProductSize, PriceHistory, ScrapeLog
)
from scraper.engine import get_stealth_driver, SCRAPER_REGISTRY, RawProduct

logger = logging.getLogger(__name__)


def _upsert_specialized(session: Session, competitor: Competitor, raw: RawProduct, now: datetime, model_cls):
    """Upsert into BestsellerProduct or NewArrivalProduct table."""
    p = session.execute(
        select(model_cls).where(
            model_cls.competitor_id == competitor.record_id,
            model_cls.sku == raw.sku,
        )
    ).scalar_one_or_none()

    is_new = p is None
    if is_new:
        p = model_cls(
            competitor_id=competitor.record_id,
            sku=raw.sku,
            first_seen_at=now,
            name=raw.name,
            image_url=raw.image_url,
            product_url=raw.product_url
        )
        session.add(p)
        session.flush()  # Ensure record_id is populated for new products

    # ALWAYS update price, stock, and category
    p.current_price = raw.current_price
    p.original_price = raw.original_price
    p.discount_pct = raw.discount_pct
    p.stock_available = raw.stock_available
    p.last_updated_at = now
    p.is_active = True
    p.is_deleted = False

    # Update category_id from DB
    if raw.category:
        cat = session.execute(
            select(Category).where(
                Category.competitor_id == competitor.record_id,
                Category.name == raw.category
            )
        ).scalar_one_or_none()
        if cat:
            p.category_id = cat.record_id

    # ── Size Upsert ────────────────────────────────────────────────────────────
    source_name = 'bestseller' if model_cls == BestsellerProduct else 'new_arrival'

    # ── KEY CHANGE FOR HISTORY ──
    # We only care about the LATEST snapshot to detect transitions
    latest_subq = select(
        ProductSize.size,
        func.max(ProductSize.last_updated_at).label("max_ts")
    ).where(
        ProductSize.source == source_name,
        ProductSize.product_id == p.record_id
    ).group_by(ProductSize.size).subquery()

    existing_latest = session.execute(
        select(ProductSize).join(
            latest_subq,
            and_(
                ProductSize.size == latest_subq.c.size,
                ProductSize.last_updated_at == latest_subq.c.max_ts
            )
        ).where(
            ProductSize.source == source_name,
            ProductSize.product_id == p.record_id
        )
    ).scalars().all()
    
    size_map = {s.size: s for s in existing_latest}

    if raw.sizes:
        has_all_fallback = len(raw.sizes) == 1 and "ALL" in raw.sizes
        has_specific_sizes = any(s != "ALL" for s in size_map.keys())

        # ── PROTECTION: Don't overwrite real sizes with "ALL" fallback ─────────
        if has_all_fallback and has_specific_sizes:
            logger.debug(
                f"Skipping 'ALL' fallback for product {p.record_id} "
                f"because specific sizes already exist in DB."
            )
            return p, is_new

        for s_name, s_info in raw.sizes.items():
            qty        = s_info.get("quantity", 0)
            disclosed  = s_info.get("disclosed", False)
            is_available = s_info.get("is_available", False)

            # ── Sanity guard ───────────────────────────────────────────────────
            if disclosed and qty == 0 and is_available:
                is_available = False
                logger.debug(
                    f"[{source_name}] Size {s_name} on product {p.record_id}: "
                    f"disclosed qty=0 overrides is_available to False"
                )

            # ── DEDUPLICATION: Only skip if same state AND same day ────────────
            # This ensures we have at least one record per day for the history table
            last_s = size_map.get(s_name)
            if last_s:
                if (last_s.quantity == qty and 
                    last_s.is_available == is_available and 
                    last_s.is_quantity_disclose == disclosed and
                    last_s.last_updated_at.date() == now.date()):
                    # No change since last record TODAY, skip insert
                    continue

            # ── INSERT if new or changed ──
            new_size = ProductSize(
                source             = source_name,
                product_id         = p.record_id,
                size               = s_name,
                quantity           = qty,
                is_quantity_disclose = disclosed,
                is_available       = is_available,
                last_updated_at    = now
            )
            session.add(new_size)

        # ── Mark stale sizes as unavailable ────────────────────────────────────
        if not has_all_fallback:
            stale_sizes = [s_name for s_name in size_map if s_name not in raw.sizes]
            if stale_sizes:
                for s_name in stale_sizes:
                    last_s = size_map.get(s_name)
                    # Only insert OOS record if it wasn't ALREADY recorded as OOS
                    if last_s and last_s.is_available:
                        stale_obj = ProductSize(
                            source             = source_name,
                            product_id         = p.record_id,
                            size               = s_name,
                            quantity           = 0,
                            is_quantity_disclose = False,
                            is_available       = False,
                            last_updated_at    = now
                        )
                        session.add(stale_obj)
                        logger.info(
                            f"[{source_name}] Size {s_name} for product {p.record_id} "
                            f"is now UNAVAILABLE (Transitioned to OOS)."
                        )

    return p, is_new


def _record_unified_history(session: Session, product, competitor_id: int, source: str):
    """
    Record a price/stock snapshot for trend analysis.
    Skips insert if nothing changed since the last record.
    """
    last_record = session.execute(
        select(PriceHistory)
        .where(
            PriceHistory.product_id == product.record_id,
            PriceHistory.source == source
        )
        .order_by(desc(PriceHistory.scraped_at))
        .limit(1)
    ).scalar_one_or_none()

    # Skip duplicate snapshots
    if last_record:
        if (last_record.price == product.current_price and
                last_record.stock_available == product.stock_available):
            return

    snapshot = PriceHistory(
        source         = source,
        product_id     = product.record_id,
        competitor_id  = competitor_id,
        sku            = product.sku,
        price          = product.current_price,
        original_price = product.original_price,
        discount_pct   = product.discount_pct,
        stock_available = product.stock_available,
        scraped_at     = datetime.utcnow(),
    )
    session.add(snapshot)


def run_scrape_for_competitor(competitor_name: str, db_session: Session) -> dict:
    """
    Main entry point. Runs a full scrape cycle for one competitor:
      1. Load active category URLs from DB
      2. Scrape all categories via registered scraper
      3. Upsert products + sizes into DB
      4. Soft-delete products no longer found on site
      5. Update scrape log
    """
    # ── Validate competitor ────────────────────────────────────────────────────
    competitor = db_session.execute(
        select(Competitor).where(Competitor.name == competitor_name)
    ).scalar_one_or_none()

    if not competitor:
        logger.error(f"Competitor '{competitor_name}' not found in DB.")
        return {"status": "failed", "error": "Competitor not found"}

    scraper_cls = SCRAPER_REGISTRY.get(competitor_name)
    if not scraper_cls:
        logger.error(f"No scraper registered for '{competitor_name}'.")
        return {"status": "failed", "error": "No scraper for this competitor"}

    # ── Create scrape log entry ────────────────────────────────────────────────
    log = ScrapeLog(
        competitor_id      = competitor.record_id,
        inserted_datetime  = datetime.utcnow(),
        status             = "running"
    )
    db_session.add(log)
    db_session.commit()

    now = datetime.utcnow()
    new_count = updated_count = processed_count = 0
    processed_skus = set()

    try:
        # ── Load category URLs from DB ─────────────────────────────────────────
        categories = db_session.execute(
            select(Category).where(
                Category.competitor_id == competitor.record_id,
                Category.is_active == True
            )
        ).scalars().all()

        cat_urls = [{"name": c.name, "url": c.url} for c in categories]

        if not cat_urls:
            logger.warning(f"[{competitor_name}] No active categories found in DB.")

        # ── Per-product callback (called live during scrape) ───────────────────
        def on_product(raw: RawProduct):
            nonlocal new_count, updated_count, processed_count

            if not raw or not raw.sku:
                return

            try:
                with db_session.begin_nested():  # Savepoint per product
                    p        = None
                    is_new   = False

                    if raw.is_bestseller:
                        p, is_new = _upsert_specialized(
                            db_session, competitor, raw, now, BestsellerProduct
                        )
                        db_session.flush()
                        _record_unified_history(
                            db_session, p, competitor.record_id, "bestseller"
                        )

                    if raw.is_new_launch:
                        p_na, is_new_na = _upsert_specialized(
                            db_session, competitor, raw, now, NewArrivalProduct
                        )
                        db_session.flush()
                        _record_unified_history(
                            db_session, p_na, competitor.record_id, "new_arrival"
                        )
                        if p is None:
                            is_new = is_new_na

                    if is_new:
                        new_count += 1
                    else:
                        updated_count += 1

                    processed_skus.add(raw.sku)

                # ── Commit immediately after each product ──────────────────────
                processed_count += 1
                db_session.commit()

                if processed_count % 10 == 0:
                    logger.info(
                        f"[{competitor_name}] Progress: {processed_count} products processed "
                        f"({new_count} new, {updated_count} updated)..."
                    )

            except Exception as ex:
                logger.warning(
                    f"[{competitor_name}] Product sync error (SKU: {raw.sku}): {ex}",
                    exc_info=True
                )
                # Savepoint already rolled back — safe to continue

        # ── Run scraper ────────────────────────────────────────────────────────
        was_interrupted = False
        with get_stealth_driver(use_proxy=True) as driver:
            scraper = scraper_cls(driver, category_urls=cat_urls, callback=on_product)
            raw_products = scraper.scrape_all_categories()
            was_interrupted = getattr(scraper, "was_interrupted", False)

        # ── Cleanup: Soft-delete products no longer seen on site ───────────────
        if was_interrupted:
            logger.warning(f"[{competitor_name}] Scrape was interrupted. Skipping soft-delete cleanup to protect data.")
            return

        logger.info(f"[{competitor_name}] Starting soft-delete cleanup for delisted products...")

        to_deactivate_bs = db_session.execute(
            select(BestsellerProduct.record_id)
            .where(BestsellerProduct.competitor_id == competitor.record_id)
            .where(BestsellerProduct.last_updated_at < now)
            .where(BestsellerProduct.is_active == True)
        ).scalars().all()

        to_deactivate_na = db_session.execute(
            select(NewArrivalProduct.record_id)
            .where(NewArrivalProduct.competitor_id == competitor.record_id)
            .where(NewArrivalProduct.last_updated_at < now)
            .where(NewArrivalProduct.is_active == True)
        ).scalars().all()

        if to_deactivate_bs:
            logger.info(
                f"[{competitor_name}] Deactivating {len(to_deactivate_bs)} bestsellers no longer on site."
            )
            db_session.execute(
                update(BestsellerProduct)
                .where(BestsellerProduct.record_id.in_(to_deactivate_bs))
                .values(is_active=False, last_updated_at=now)
            )

        if to_deactivate_na:
            logger.info(
                f"[{competitor_name}] Deactivating {len(to_deactivate_na)} new arrivals no longer on site."
            )
            db_session.execute(
                update(NewArrivalProduct)
                .where(NewArrivalProduct.record_id.in_(to_deactivate_na))
                .values(is_active=False, last_updated_at=now)
            )

        # ── Final commit ───────────────────────────────────────────────────────
        db_session.commit()
        logger.info(f"[{competitor_name}] Soft-cleanup complete. Historical data preserved.")

        # ── Update scrape log ──────────────────────────────────────────────────
        log.status           = "success"
        log.total_products   = len(raw_products)
        log.new_products     = new_count
        log.updated_products = updated_count
        db_session.commit()

        logger.info(
            f"[{competitor_name}] Pipeline finished — "
            f"{len(raw_products)} scraped, {new_count} new, {updated_count} updated."
        )
        return {
            "status":  "success",
            "found":   len(raw_products),
            "new":     new_count,
            "updated": updated_count
        }

    except Exception as e:
        logger.exception(f"[{competitor_name}] Scrape pipeline failed: {e}")
        log.status  = "failed"
        log.message = str(e)
        db_session.commit()
        return {"status": "failed", "error": str(e)}