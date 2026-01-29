# コレクション管理アプリ - ソースコード解説

## ファイル構成

```
web_sample/
├── collection.html   # 画面構造・スタイル定義
├── collection.js     # ロジック・API通信
└── README.md         # このファイル
```

---

## collection.html

### 1. テーマシステム（CSS変数）

```css
:root { ... }           /* ライトモードの色定義 */
[data-theme="dark"] { ... }  /* ダークモードの色定義 */
```

| 変数 | 用途 |
|------|------|
| `--bg-primary` | 背景色（メイン） |
| `--bg-secondary` | カード背景 |
| `--bg-tertiary` | 入力欄・統計バー背景 |
| `--text-primary` | メインテキスト色 |
| `--text-secondary` | サブテキスト色 |
| `--border-color` | ボーダー色 |
| `--accent-gradient` | アクセントカラー（グラデーション） |
| `--theme-gradient` | ユーザー選択のテーマカラー |
| `--theme-color` | ユーザー選択のテーマカラー（単色） |

### 2. 画面構成

```
┌─────────────────────────────────────┐
│ ヘッダー                             │
│  - タイトル「Collection」            │
│  - 設定ボタン ⚙️                     │
│ コレクションタブ                      │
│  - 新規作成ボタン                    │
│  - 各コレクションタブ（編集ボタン付き）│
├─────────────────────────────────────┤
│ 統計バー                             │
│  - アイテム数                        │
│  - 合計金額                          │
├─────────────────────────────────────┤
│ ツールバー                           │
│  - 検索ボックス                      │
│  - アイテム追加ボタン                 │
├─────────────────────────────────────┤
│ アイテムグリッド（2〜3列）            │
│ ┌────────┐ ┌────────┐ ┌────────┐   │
│ │ 画像    │ │ 画像    │ │ 画像    │   │
│ │ 名前    │ │ 名前    │ │ 名前    │   │
│ │ 価格    │ │ 価格    │ │ 価格    │   │
│ │ [編集]  │ │ [編集]  │ │ [編集]  │   │
│ └────────┘ └────────┘ └────────┘   │
└─────────────────────────────────────┘
```

### 3. モーダル一覧

| ID | 用途 | 主な要素 |
|----|------|----------|
| `collection-modal` | コレクション作成/編集 | 名前、説明、削除ボタン |
| `item-modal` | アイテム作成/編集 | 名前、購入日、画像、価格、メモ、削除ボタン |
| `detail-modal` | アイテム詳細表示 | 全情報の読み取り専用表示 |
| `settings-modal` | 設定 | テーマカラー選択、表示モード切替 |

### 4. CSSクラス

| クラス | 用途 |
|--------|------|
| `.ig-card` | 汎用カード |
| `.ig-header` | ヘッダースタイル |
| `.ig-input` | 入力フィールド |
| `.ig-btn` | プライマリボタン（グラデーション） |
| `.ig-btn-secondary` | セカンダリボタン |
| `.ig-gradient-text` | グラデーションテキスト |
| `.collection-tab` | コレクションタブ |
| `.collection-tab.active` | 選択中のタブ |
| `.item-card` | アイテムカード |
| `.modal-overlay` | モーダル背景 |
| `.modal-card` | モーダル本体 |
| `.stats-card` | 統計表示カード |
| `.theme-toggle` | テーマ切替ボタン |

---

## collection.js

### 1. グローバル変数

```javascript
const API_BASE_URL = 'http://localhost:8080/api';  // バックエンドAPIのベースURL
let currentCollectionId = null;  // 現在選択中のコレクションID
let collections = [];            // コレクション一覧データ
let items = [];                  // 現在のコレクションのアイテム一覧
```

### 2. テーマ管理

#### カラーテーマ定義

```javascript
const colorThemes = {
    pink:   { gradient: '...', color: '#d4878a', name: 'ピンク' },
    blue:   { gradient: '...', color: '#5b8bb8', name: 'ブルー' },
    green:  { gradient: '...', color: '#6ba37d', name: 'グリーン' },
    purple: { gradient: '...', color: '#8b7aa8', name: 'パープル' },
    orange: { gradient: '...', color: '#d4a066', name: 'オレンジ' },
    brown:  { gradient: '...', color: '#8b7355', name: 'ブラウン' },
    gray:   { gradient: '...', color: '#6b7280', name: 'グレー' }
};
```

#### テーマ関連関数

| 関数 | 説明 |
|------|------|
| `initTheme()` | 起動時にローカルストレージから設定を読み込み適用 |
| `setTheme(theme)` | ライト/ダークモード切り替え |
| `applyColorTheme(colorName)` | テーマカラーをCSS変数に適用 |
| `initColorPicker()` | 設定画面のカラーピッカー初期化 |
| `renderSettingsColorPicker(activeColor)` | カラー選択UIを描画 |
| `updateThemeButtons()` | 表示モードボタンの選択状態更新 |

### 3. データ取得（API通信）

| 関数 | HTTPメソッド | エンドポイント | 説明 |
|------|-------------|----------------|------|
| `loadCollections()` | GET | `/collections` | コレクション一覧取得 |
| `loadItems()` | GET | `/collections/{id}/items` | アイテム一覧取得 |
| `loadStats()` | GET | `/collections/{id}/stats` | 統計情報取得 |

### 4. コレクション操作

| 関数 | 説明 |
|------|------|
| `renderCollections()` | コレクションタブを描画（新規作成ボタン + 各タブ + 編集ボタン） |
| `selectCollection(id)` | コレクションを選択し、アイテムと統計を読み込む |
| `openCollectionModal()` | 新規作成モーダルを開く（フォームリセット、削除ボタン非表示） |
| `openCollectionEditModal(id)` | 編集モーダルを開く（既存データセット、削除ボタン表示） |
| `closeCollectionModal()` | モーダルを閉じる |
| `saveCollection(e)` | 保存処理（IDがあればPUT、なければPOST） |
| `deleteCurrentCollection()` | 確認後に削除（DELETE） |

### 5. アイテム操作

| 関数 | 説明 |
|------|------|
| `renderItems(itemsToRender)` | アイテムグリッドを描画 |
| `openItemModal()` | 新規作成モーダルを開く |
| `editItem(id)` | 編集モーダルを開く |
| `closeItemModal()` | モーダルを閉じる |
| `saveItem(e)` | 保存処理（画像アップロード → データ保存） |
| `deleteCurrentItem()` | 確認後に削除 |
| `showItemDetail(id)` | 詳細モーダルを表示 |
| `closeDetailModal()` | 詳細モーダルを閉じる |

### 6. 画像関連

| 関数 | 説明 |
|------|------|
| `previewImage(event)` | ファイル選択時にプレビュー表示、ファイル名更新 |
| `uploadImage(file)` | FormDataでサーバーにアップロード（POST /upload） |

### 7. 設定モーダル

| 関数 | 説明 |
|------|------|
| `openSettingsModal()` | 設定モーダルを開く |
| `closeSettingsModal()` | 設定モーダルを閉じる |

### 8. ユーティリティ

| 関数 | 説明 | 例 |
|------|------|-----|
| `formatDate(dateString)` | 日付をローカライズ | `2024-01-15` → `2024/1/15` |
| `formatPrice(price)` | 価格を3桁区切り | `12345` → `12,345` |

### 9. 検索機能

```javascript
document.getElementById('search-box').addEventListener('input', (e) => {
    // 名前とメモで部分一致検索
    const filtered = items.filter(item =>
        item.name.toLowerCase().includes(query) ||
        (item.memo && item.memo.toLowerCase().includes(query))
    );
    renderItems(filtered);
});
```

---

## データフロー

```
[ページ読み込み]
      ↓
[init()] → initTheme() → loadCollections()
      ↓
[コレクション選択]
      ↓
[selectCollection(id)] → loadItems() + loadStats()
      ↓
[renderItems()] → 画面に表示

[アイテム操作]
      ↓
[saveItem()] → uploadImage() → fetch(POST/PUT)
      ↓
[loadItems() + loadStats()] → 画面更新
```

---

## API エンドポイント一覧

| メソッド | エンドポイント | 説明 |
|----------|----------------|------|
| GET | `/health` | ヘルスチェック |
| GET | `/api/collections` | コレクション一覧 |
| POST | `/api/collections` | コレクション作成 |
| PUT | `/api/collections/{id}` | コレクション更新 |
| DELETE | `/api/collections/{id}` | コレクション削除 |
| GET | `/api/collections/{id}/items` | アイテム一覧 |
| GET | `/api/collections/{id}/stats` | 統計情報 |
| POST | `/api/items` | アイテム作成 |
| PUT | `/api/items/{id}` | アイテム更新 |
| DELETE | `/api/items/{id}` | アイテム削除 |
| POST | `/api/upload` | 画像アップロード |

---

## ローカルストレージ

| キー | 値 | 説明 |
|------|-----|------|
| `theme` | `light` / `dark` | 表示モード |
| `themeColor` | `pink` / `blue` / `green` / `purple` / `orange` / `brown` / `gray` | テーマカラー |

---

## 起動方法

```bash
# バックエンド起動（プロジェクトルートで）
docker-compose up -d

# フロントエンド起動
cd web_sample
python3 -m http.server 3000

# ブラウザでアクセス
http://localhost:3000/collection.html
```
