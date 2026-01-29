package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

var db *sql.DB

// Collection モデル
type Collection struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// Item モデル
type Item struct {
	ID           int       `json:"id"`
	CollectionID int       `json:"collection_id"`
	Name         string    `json:"name"`
	ImageURL     *string   `json:"image_url"`
	PurchaseDate *string   `json:"purchase_date"`
	Price        *float64  `json:"price"`
	Memo         *string   `json:"memo"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// Stats 統計情報
type Stats struct {
	TotalItems int     `json:"total_items"`
	TotalPrice float64 `json:"total_price"`
}

// Response レスポンス
type Response struct {
	Message string `json:"message"`
	Status  string `json:"status"`
}

func main() {
	// データベース接続
	initDB()
	defer db.Close()

	router := mux.NewRouter()

	// ヘルスチェック
	router.HandleFunc("/health", healthHandler).Methods("GET", "OPTIONS")

	// Collection API
	router.HandleFunc("/api/collections", getCollections).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/collections", createCollection).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/collections/{id}", updateCollection).Methods("PUT", "OPTIONS")
	router.HandleFunc("/api/collections/{id}", deleteCollection).Methods("DELETE", "OPTIONS")

	// Item API
	router.HandleFunc("/api/collections/{id}/items", getItems).Methods("GET", "OPTIONS")
	router.HandleFunc("/api/items", createItem).Methods("POST", "OPTIONS")
	router.HandleFunc("/api/items/{id}", updateItem).Methods("PUT", "OPTIONS")
	router.HandleFunc("/api/items/{id}", deleteItem).Methods("DELETE", "OPTIONS")

	// Stats API
	router.HandleFunc("/api/collections/{id}/stats", getStats).Methods("GET", "OPTIONS")

	// Upload API
	router.HandleFunc("/api/upload", uploadImage).Methods("POST", "OPTIONS")

	// 静的ファイル配信
	router.PathPrefix("/uploads/").Handler(http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	// CORS設定
	router.Use(corsMiddleware)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s...", port)
	log.Fatal(http.ListenAndServe(":"+port, router))
}

func initDB() {
	var err error

	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		dbHost := os.Getenv("DB_HOST")
		dbPort := os.Getenv("DB_PORT")
		dbUser := os.Getenv("DB_USER")
		dbPassword := os.Getenv("DB_PASSWORD")
		dbName := os.Getenv("DB_NAME")
		sslMode := os.Getenv("DB_SSLMODE")
		if sslMode == "" {
			sslMode = "disable"
		}

		connStr = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			dbHost, dbPort, dbUser, dbPassword, dbName, sslMode)
	}

	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("データベース接続エラー:", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal("データベースPingエラー:", err)
	}

	log.Println("データベース接続成功")

	runMigrations()
}

func runMigrations() {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS collections (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE TABLE IF NOT EXISTS items (
			id SERIAL PRIMARY KEY,
			collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			image_url TEXT,
			purchase_date DATE,
			price DECIMAL(10, 2),
			memo TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,
		`CREATE INDEX IF NOT EXISTS idx_items_collection_id ON items(collection_id)`,
		`CREATE INDEX IF NOT EXISTS idx_items_name ON items(name)`,
		`CREATE INDEX IF NOT EXISTS idx_items_purchase_date ON items(purchase_date)`,
	}

	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			trimmed := strings.SplitN(migration, "\n", 2)[0]
			log.Printf("マイグレーション警告 (%s...): %v", trimmed, err)
		}
	}

	log.Println("マイグレーション完了")
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{
		Message: "API is running",
		Status:  "healthy",
	})
}

// Collection ハンドラー
func getCollections(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, name, description, created_at, updated_at FROM collections ORDER BY created_at DESC")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	collections := []Collection{}
	for rows.Next() {
		var c Collection
		if err := rows.Scan(&c.ID, &c.Name, &c.Description, &c.CreatedAt, &c.UpdatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		collections = append(collections, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(collections)
}

func createCollection(w http.ResponseWriter, r *http.Request) {
	var c Collection
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err := db.QueryRow(
		"INSERT INTO collections (name, description) VALUES ($1, $2) RETURNING id, created_at, updated_at",
		c.Name, c.Description,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(c)
}

func updateCollection(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var c Collection
	if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := db.Exec(
		"UPDATE collections SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3",
		c.Name, c.Description, id,
	)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{Message: "Collection updated", Status: "success"})
}

func deleteCollection(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_, err := db.Exec("DELETE FROM collections WHERE id = $1", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{Message: "Collection deleted", Status: "success"})
}

// Item ハンドラー
func getItems(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	collectionID := vars["id"]

	query := "SELECT id, collection_id, name, image_url, purchase_date, price, memo, created_at, updated_at FROM items WHERE collection_id = $1 ORDER BY created_at DESC"
	rows, err := db.Query(query, collectionID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := []Item{}
	for rows.Next() {
		var i Item
		if err := rows.Scan(&i.ID, &i.CollectionID, &i.Name, &i.ImageURL, &i.PurchaseDate, &i.Price, &i.Memo, &i.CreatedAt, &i.UpdatedAt); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		items = append(items, i)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(items)
}

func createItem(w http.ResponseWriter, r *http.Request) {
	var i Item
	if err := json.NewDecoder(r.Body).Decode(&i); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	err := db.QueryRow(
		"INSERT INTO items (collection_id, name, image_url, purchase_date, price, memo) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at, updated_at",
		i.CollectionID, i.Name, i.ImageURL, i.PurchaseDate, i.Price, i.Memo,
	).Scan(&i.ID, &i.CreatedAt, &i.UpdatedAt)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(i)
}

func updateItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var i Item
	if err := json.NewDecoder(r.Body).Decode(&i); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := db.Exec(
		"UPDATE items SET name = $1, image_url = $2, purchase_date = $3, price = $4, memo = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6",
		i.Name, i.ImageURL, i.PurchaseDate, i.Price, i.Memo, id,
	)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{Message: "Item updated", Status: "success"})
}

func deleteItem(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	_, err := db.Exec("DELETE FROM items WHERE id = $1", id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(Response{Message: "Item deleted", Status: "success"})
}

// Stats ハンドラー
func getStats(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	collectionID := vars["id"]

	var stats Stats
	err := db.QueryRow(
		"SELECT COUNT(*), COALESCE(SUM(price), 0) FROM items WHERE collection_id = $1",
		collectionID,
	).Scan(&stats.TotalItems, &stats.TotalPrice)

	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

// Upload ハンドラー
func uploadImage(w http.ResponseWriter, r *http.Request) {
	// ファイルサイズ制限: 10MB
	r.ParseMultipartForm(10 << 20)

	file, handler, err := r.FormFile("image")
	if err != nil {
		http.Error(w, "画像の取得に失敗しました", http.StatusBadRequest)
		return
	}
	defer file.Close()

	// ファイル拡張子チェック
	ext := filepath.Ext(handler.Filename)
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".gif" && ext != ".webp" {
		http.Error(w, "対応していない画像形式です", http.StatusBadRequest)
		return
	}

	// ユニークなファイル名を生成
	filename := fmt.Sprintf("%d%s", time.Now().UnixNano(), ext)
	filepath := filepath.Join("./uploads", filename)

	// ファイルを保存
	dst, err := os.Create(filepath)
	if err != nil {
		http.Error(w, "ファイルの保存に失敗しました", http.StatusInternalServerError)
		return
	}
	defer dst.Close()

	if _, err := io.Copy(dst, file); err != nil {
		http.Error(w, "ファイルの書き込みに失敗しました", http.StatusInternalServerError)
		return
	}

	// 画像URLを返す
	imageURL := fmt.Sprintf("/uploads/%s", filename)
	response := map[string]string{"image_url": imageURL}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
