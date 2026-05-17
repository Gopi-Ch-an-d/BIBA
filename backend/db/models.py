from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, Date, UniqueConstraint, Index
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()

# =========================
# MASTER SCHEMA
# =========================

class Role(Base):
    __tablename__ = 'roles'
    __table_args__ = {'schema': 'master'}
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    inserted_datetime = Column(DateTime, default=datetime.utcnow)
    updated_datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base):
    __tablename__ = 'users'
    __table_args__ = {'schema': 'master'}
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    role_id = Column(Integer, ForeignKey('master.roles.record_id'))
    first_name = Column(String(100))
    last_name = Column(String(100))
    email = Column(String(255), unique=True, nullable=False)
    phone = Column(String(50))
    password_hash = Column(Text)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    inserted_datetime = Column(DateTime, default=datetime.utcnow)
    updated_datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Employee(Base):
    __tablename__ = 'employees'
    __table_args__ = {'schema': 'master'}
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey('master.users.record_id', ondelete='CASCADE'), unique=True)
    employee_code = Column(String(50), unique=True)
    department = Column(String(100))
    designation = Column(String(100))
    joined_date = Column(Date)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    inserted_datetime = Column(DateTime, default=datetime.utcnow)
    updated_datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class PicklistType(Base):
    __tablename__ = 'picklist_type'
    __table_args__ = {'schema': 'master'}
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    code = Column(String(100), unique=True)
    name = Column(String(100))
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    inserted_datetime = Column(DateTime, default=datetime.utcnow)
    updated_datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class Picklist(Base):
    __tablename__ = 'picklist'
    __table_args__ = {'schema': 'master'}
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    picklist_type_id = Column(Integer, ForeignKey('master.picklist_type.record_id'))
    value = Column(String(100))
    display_value = Column(String(255))
    parent_id = Column(Integer, ForeignKey('master.picklist.record_id'))
    order_num = Column(Integer)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    inserted_datetime = Column(DateTime, default=datetime.utcnow)
    updated_datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

# =========================
# INTELLIGENCE SCHEMA
# =========================

class Competitor(Base):
    __tablename__ = 'competitors'
    __table_args__ = {'schema': 'master'}
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    code = Column(String(50), unique=True, nullable=False)
    base_url = Column(Text, nullable=False)
    scraper_name = Column(String(100))
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    inserted_datetime = Column(DateTime, default=datetime.utcnow)
    updated_datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    categories = relationship("Category", back_populates="competitor", cascade="all, delete-orphan", lazy="selectin")

class Category(Base):
    __tablename__ = 'categories'
    __table_args__ = (
        UniqueConstraint('competitor_id', 'slug'),
        {'schema': 'master'}
    )
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    competitor_id = Column(Integer, ForeignKey('master.competitors.record_id', ondelete='CASCADE'), nullable=False)
    name = Column(String(255), nullable=False)
    slug = Column(String(255))
    url = Column(Text)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)
    inserted_datetime = Column(DateTime, default=datetime.utcnow)
    updated_datetime = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    competitor = relationship("Competitor", back_populates="categories", lazy="selectin")

class BestsellerProduct(Base):
    __tablename__ = 'bestseller_products'
    __table_args__ = (
        UniqueConstraint('competitor_id', 'sku'),
        {'schema': 'intelligence'}
    )
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    competitor_id = Column(Integer, ForeignKey('master.competitors.record_id', ondelete='CASCADE'), nullable=False)
    category_id = Column(Integer, ForeignKey('master.categories.record_id', ondelete='SET NULL'))
    
    sku = Column(String(200), nullable=False)
    name = Column(String(500), nullable=False)
    current_price = Column(Float)
    original_price = Column(Float)
    discount_pct = Column(Float)
    stock_available = Column(Boolean, nullable=False, default=True)
    image_url = Column(Text, nullable=False)
    product_url = Column(Text, nullable=False)
    
    first_seen_at = Column(DateTime, default=datetime.utcnow)
    last_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)

    sizes = relationship(
        "ProductSize",
        primaryjoin="and_(ProductSize.product_id==BestsellerProduct.record_id, ProductSize.source=='bestseller')",
        foreign_keys="[ProductSize.product_id]",
        viewonly=True,
        overlaps="sizes"
    )

class NewArrivalProduct(Base):
    __tablename__ = 'new_arrival_products'
    __table_args__ = (
        UniqueConstraint('competitor_id', 'sku'),
        {'schema': 'intelligence'}
    )
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    competitor_id = Column(Integer, ForeignKey('master.competitors.record_id', ondelete='CASCADE'), nullable=False)
    category_id = Column(Integer, ForeignKey('master.categories.record_id', ondelete='SET NULL'))
    
    sku = Column(String(200), nullable=False)
    name = Column(String(500), nullable=False)
    current_price = Column(Float)
    original_price = Column(Float)
    discount_pct = Column(Float)
    stock_available = Column(Boolean, nullable=False, default=True)
    image_url = Column(Text, nullable=False)
    product_url = Column(Text, nullable=False)
    
    first_seen_at = Column(DateTime, default=datetime.utcnow)
    last_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    is_deleted = Column(Boolean, default=False)

    sizes = relationship(
        "ProductSize",
        primaryjoin="and_(ProductSize.product_id==NewArrivalProduct.record_id, ProductSize.source=='new_arrival')",
        foreign_keys="[ProductSize.product_id]",
        viewonly=True,
        overlaps="sizes"
    )

class ProductSize(Base):
    """Table to store size availability and quantities for products."""
    __tablename__ = 'product_sizes'
    __table_args__ = (
        Index('idx_product_size_lookup', 'source', 'product_id', 'size'),
        {'schema': 'intelligence'}
    )
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(50), nullable=False) # 'bestseller' or 'new_arrival'
    product_id = Column(Integer, nullable=False)
    size = Column(String(50), nullable=False) # XS, S, M, L, XL, XXL
    quantity = Column(Integer, nullable=True)
    is_quantity_disclose = Column(Boolean, default=True)
    is_available = Column(Boolean, default=True)
    last_updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    inserted_datetime = Column(DateTime, default=datetime.utcnow)

class PriceHistory(Base):
    """Unified Price History Table"""
    __tablename__ = 'price_history'
    __table_args__ = {'schema': 'intelligence'}
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    source = Column(String(50), nullable=False) # 'bestseller' or 'new_arrival'
    product_id = Column(Integer, nullable=False)
    competitor_id = Column(Integer, ForeignKey('master.competitors.record_id', ondelete='CASCADE'))
    sku = Column(String(200))
    price = Column(Float)
    original_price = Column(Float)
    discount_pct = Column(Float)
    stock_available = Column(Boolean)
    scraped_at = Column(DateTime, default=datetime.utcnow)
    inserted_datetime = Column(DateTime, default=datetime.utcnow)

class ScrapeLog(Base):
    __tablename__ = 'scrape_logs'
    __table_args__ = {'schema': 'intelligence'}
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    competitor_id = Column(Integer, ForeignKey('master.competitors.record_id', ondelete='CASCADE'))
    scrape_type = Column(String(50), default='all')
    total_products = Column(Integer)
    new_products = Column(Integer)
    updated_products = Column(Integer)
    status = Column(String(50))
    message = Column(Text)
    ip_address = Column(String(50))
    proxy_provider = Column(String(100))
    user_agent = Column(Text)
    inserted_datetime = Column(DateTime, default=datetime.utcnow)

class RequestLog(Base):
    __tablename__ = 'request_logs'
    __table_args__ = {'schema': 'intelligence'}
    
    record_id = Column(Integer, primary_key=True, autoincrement=True)
    competitor_id = Column(Integer, ForeignKey('master.competitors.record_id', ondelete='CASCADE'))
    url = Column(Text)
    ip_address = Column(String(50))
    proxy_provider = Column(String(100))
    user_agent = Column(Text)
    response_status = Column(Integer)
    response_time_ms = Column(Integer)
    success = Column(Boolean, default=True)
    error_message = Column(Text)
    inserted_datetime = Column(DateTime, default=datetime.utcnow)
