# Flutter + Go + Docker プロジェクト

Flutter モバイルアプリと Go バックエンド API を Docker で管理する開発環境です。

## プロジェクト構成

```
asobiba/
├── flutter_app/          # Flutter モバイルアプリ
├── backend/              # Go REST API
│   ├── main.go          # メインのAPIサーバー
│   ├── go.mod           # Go依存関係
│   ├── Dockerfile       # Dockerイメージ定義
│   └── .dockerignore    # Docker除外ファイル
├── docker-compose.yml    # Docker サービス定義
├── .gitignore           # Git除外ファイル
├── .env.example         # 環境変数のサンプル
└── README.md            # このファイル
```

## 技術スタック

- **Frontend**: Flutter (Dart)
- **Backend**: Go 1.21 + Gorilla Mux
- **Database**: PostgreSQL 15
- **管理ツール**: Adminer (データベース管理)
- **Infrastructure**: Docker & Docker Compose

## 必要な環境

以下のツールがインストールされている必要があります：

1. **Docker** (バージョン 20.10 以上)
2. **Docker Compose** (バージョン 2.0 以上)
3. **Flutter SDK** (最新安定版)
   - [Flutter公式サイト](https://flutter.dev/docs/get-started/install)からインストール

### インストール確認

```bash
# Dockerバージョン確認
docker --version

# Docker Composeバージョン確認
docker-compose --version

# Flutterバージョン確認
flutter --version
```

## セットアップ手順

### 1. プロジェクトのクローン（または初期化）

```bash
cd /home/masa/workspace/claudeCode/asobiba
```

### 2. Dockerサービスの起動

バックエンドAPIとデータベースを起動します：

```bash
docker-compose up -d
```

**起動されるサービス：**
- `backend`: Go API (ポート: 8080)
- `postgres`: PostgreSQL データベース (ポート: 5432)
- `adminer`: DB管理ツール (ポート: 8081)

### 3. 動作確認

APIが正常に起動しているか確認します：

```bash
# ヘルスチェック
curl http://localhost:8080/health

# サンプルAPI呼び出し
curl http://localhost:8080/api/hello
```

**期待されるレスポンス：**
```json
{
  "message": "Hello from Go API!",
  "status": "success"
}
```

### 4. Flutterプロジェクトの作成

```bash
# Flutterプロジェクトを作成
flutter create flutter_app

# プロジェクトディレクトリに移動
cd flutter_app

# 依存関係をインストール
flutter pub get

# 動作確認（Webブラウザで起動）
flutter run -d chrome
```

**エミュレータで起動する場合：**

```bash
# 利用可能なデバイスを確認
flutter devices

# Androidエミュレータで起動
flutter run -d <device-id>
```

## 使い方

### Dockerサービスの管理

```bash
# サービスを起動
docker-compose up -d

# ログを確認
docker-compose logs -f backend

# サービスを停止
docker-compose down

# サービスを再起動
docker-compose restart backend

# すべてのコンテナとボリュームを削除
docker-compose down -v
```

### データベース管理

Adminer を使用してデータベースを管理できます：

1. ブラウザで `http://localhost:8081` を開く
2. 以下の情報でログイン：
   - **システム**: PostgreSQL
   - **サーバ**: postgres
   - **ユーザ名**: flutter_user
   - **パスワード**: flutter_pass
   - **データベース**: flutter_db

### GoバックエンドのAPI開発

`backend/main.go` を編集してAPIを追加します：

```go
// 新しいエンドポイントを追加する例
router.HandleFunc("/api/users", getUsersHandler).Methods("GET")
```

変更を反映：

```bash
# コンテナを再ビルドして起動
docker-compose up -d --build backend
```

### Flutter開発

FlutterアプリからAPIを呼び出す例：

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

Future<void> fetchData() async {
  final response = await http.get(
    Uri.parse('http://localhost:8080/api/hello'),
  );

  if (response.statusCode == 200) {
    final data = jsonDecode(response.body);
    print(data['message']);
  }
}
```

**注意**: `pubspec.yaml` に `http` パッケージを追加してください：

```yaml
dependencies:
  flutter:
    sdk: flutter
  http: ^1.1.0
```

## APIエンドポイント

現在利用可能なエンドポイント：

| メソッド | エンドポイント | 説明 |
|---------|--------------|------|
| GET | `/health` | ヘルスチェック |
| GET | `/api/hello` | サンプルAPI |

## トラブルシューティング

### ポートが既に使用されている

```bash
# ポート8080を使用しているプロセスを確認
lsof -i :8080

# プロセスを終了
kill -9 <PID>
```

または、`docker-compose.yml` でポート番号を変更：

```yaml
ports:
  - "8090:8080"  # ホスト側のポートを8090に変更
```

### Dockerコンテナが起動しない

```bash
# ログを確認
docker-compose logs backend

# コンテナを完全に削除して再作成
docker-compose down -v
docker-compose up -d --build
```

### Flutterでホットリロードが効かない

```bash
# Flutterキャッシュをクリア
flutter clean
flutter pub get
```

## 開発のヒント

1. **API開発**: Goコードを変更したら `docker-compose restart backend` で反映
2. **DB変更**: データをリセットしたい場合は `docker-compose down -v` でボリュームも削除
3. **Flutter開発**: ホットリロード（`r`キー）を活用して高速に開発
4. **デバッグ**: `docker-compose logs -f` でリアルタイムログを確認

## 次のステップ

- [ ] Go APIに認証機能を追加
- [ ] PostgreSQLとの接続を実装（GORM等のORM使用）
- [ ] Flutterアプリに状態管理を導入（Provider、Riverpod等）
- [ ] CI/CDパイプラインの構築
- [ ] テストの追加（Go: testing、Flutter: flutter_test）

## 参考リンク

- [Flutter公式ドキュメント](https://flutter.dev/docs)
- [Go公式ドキュメント](https://go.dev/doc/)
- [Docker公式ドキュメント](https://docs.docker.com/)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)

## ライセンス

このプロジェクトはMITライセンスの下で公開されています。
