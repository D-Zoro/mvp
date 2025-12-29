BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> 239688c9b228

CREATE TYPE user_role AS ENUM ('BUYER', 'SELLER', 'ADMIN');

CREATE TYPE oauth_provider AS ENUM ('GOOGLE', 'FACEBOOK', 'GITHUB');

CREATE TABLE users (
    email VARCHAR(255) NOT NULL, 
    password_hash VARCHAR(255), 
    role user_role NOT NULL, 
    email_verified BOOLEAN NOT NULL, 
    is_active BOOLEAN NOT NULL, 
    first_name VARCHAR(100), 
    last_name VARCHAR(100), 
    avatar_url TEXT, 
    oauth_provider oauth_provider, 
    oauth_provider_id VARCHAR(255), 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    deleted_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE INDEX ix_users_oauth ON users (oauth_provider, oauth_provider_id);

CREATE INDEX ix_users_role_active ON users (role, is_active);

CREATE TYPE book_condition AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'ACCEPTABLE');

CREATE TYPE book_status AS ENUM ('DRAFT', 'ACTIVE', 'SOLD', 'ARCHIVED');

CREATE TABLE books (
    seller_id UUID NOT NULL, 
    isbn VARCHAR(20), 
    title VARCHAR(500) NOT NULL, 
    author VARCHAR(255) NOT NULL, 
    description TEXT, 
    condition book_condition NOT NULL, 
    price DECIMAL(10, 2) NOT NULL, 
    quantity INTEGER NOT NULL, 
    images JSONB, 
    status book_status NOT NULL, 
    category VARCHAR(100), 
    publisher VARCHAR(255), 
    publication_year INTEGER, 
    language VARCHAR(50) NOT NULL, 
    page_count INTEGER, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    deleted_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(seller_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_books_category ON books (category);

CREATE INDEX ix_books_category_status ON books (category, status);

CREATE INDEX ix_books_isbn ON books (isbn);

CREATE INDEX ix_books_price_status ON books (price, status);

CREATE INDEX ix_books_seller_id ON books (seller_id);

CREATE INDEX ix_books_seller_status ON books (seller_id, status);

CREATE INDEX ix_books_status ON books (status);

CREATE INDEX ix_books_status_created ON books (status, created_at);

CREATE TYPE order_status AS ENUM ('PENDING', 'PAYMENT_PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

CREATE TABLE orders (
    buyer_id UUID NOT NULL, 
    total_amount DECIMAL(10, 2) NOT NULL, 
    status order_status NOT NULL, 
    stripe_payment_id VARCHAR(255), 
    stripe_session_id VARCHAR(255), 
    shipping_address TEXT, 
    notes TEXT, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    deleted_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(buyer_id) REFERENCES users (id) ON DELETE CASCADE, 
    UNIQUE (stripe_payment_id), 
    UNIQUE (stripe_session_id)
);

CREATE INDEX ix_orders_buyer_id ON orders (buyer_id);

CREATE INDEX ix_orders_buyer_status ON orders (buyer_id, status);

CREATE INDEX ix_orders_status ON orders (status);

CREATE INDEX ix_orders_status_created ON orders (status, created_at);

CREATE TABLE messages (
    sender_id UUID NOT NULL, 
    recipient_id UUID NOT NULL, 
    book_id UUID, 
    content TEXT NOT NULL, 
    read_at TIMESTAMP WITH TIME ZONE, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    deleted_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(book_id) REFERENCES books (id) ON DELETE SET NULL, 
    FOREIGN KEY(recipient_id) REFERENCES users (id) ON DELETE CASCADE, 
    FOREIGN KEY(sender_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_messages_book_created ON messages (book_id, created_at);

CREATE INDEX ix_messages_book_id ON messages (book_id);

CREATE INDEX ix_messages_conversation ON messages (sender_id, recipient_id);

CREATE INDEX ix_messages_recipient_id ON messages (recipient_id);

CREATE INDEX ix_messages_recipient_unread ON messages (recipient_id, read_at);

CREATE INDEX ix_messages_sender_id ON messages (sender_id);

CREATE TABLE order_items (
    order_id UUID NOT NULL, 
    book_id UUID, 
    quantity INTEGER NOT NULL, 
    price_at_purchase DECIMAL(10, 2) NOT NULL, 
    book_title VARCHAR(500) NOT NULL, 
    book_author VARCHAR(255) NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    deleted_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    FOREIGN KEY(book_id) REFERENCES books (id) ON DELETE SET NULL, 
    FOREIGN KEY(order_id) REFERENCES orders (id) ON DELETE CASCADE
);

CREATE INDEX ix_order_items_book_id ON order_items (book_id);

CREATE INDEX ix_order_items_order_book ON order_items (order_id, book_id);

CREATE INDEX ix_order_items_order_id ON order_items (order_id);

CREATE TABLE reviews (
    book_id UUID NOT NULL, 
    user_id UUID NOT NULL, 
    rating INTEGER NOT NULL, 
    comment TEXT, 
    is_verified_purchase BOOLEAN NOT NULL, 
    id UUID NOT NULL, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL, 
    deleted_at TIMESTAMP WITH TIME ZONE, 
    PRIMARY KEY (id), 
    CONSTRAINT ck_review_rating_range CHECK (rating >= 1 AND rating <= 5), 
    FOREIGN KEY(book_id) REFERENCES books (id) ON DELETE CASCADE, 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE, 
    CONSTRAINT uq_review_book_user UNIQUE (book_id, user_id)
);

CREATE INDEX ix_reviews_book_id ON reviews (book_id);

CREATE INDEX ix_reviews_book_rating ON reviews (book_id, rating);

CREATE INDEX ix_reviews_user_id ON reviews (user_id);

INSERT INTO alembic_version (version_num) VALUES ('239688c9b228') RETURNING alembic_version.version_num;

COMMIT;

