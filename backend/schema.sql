-- コレクショングループテーブル
CREATE TABLE IF NOT EXISTS collections (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- コレクションアイテムテーブル
CREATE TABLE IF NOT EXISTS items (
    id SERIAL PRIMARY KEY,
    collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    image_url TEXT,
    purchase_date DATE,
    price DECIMAL(10, 2),
    memo TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_items_collection_id ON items(collection_id);
CREATE INDEX IF NOT EXISTS idx_items_name ON items(name);
CREATE INDEX IF NOT EXISTS idx_items_purchase_date ON items(purchase_date);

-- サンプルデータ
INSERT INTO collections (name, description) VALUES
    ('フィギュア', 'アニメ・ゲームのフィギュアコレクション'),
    ('本', '読んだ本の記録');

INSERT INTO items (collection_id, name, image_url, purchase_date, price, memo) VALUES
    (1, 'ねんどろいど サンプル', NULL, '2026-01-15', 4500.00, '限定版'),
    (1, 'figma サンプル', NULL, '2026-01-20', 6800.00, 'Amazon購入'),
    (2, 'プログラミング入門', NULL, '2026-01-10', 2800.00, '技術書');
