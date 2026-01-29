# ビルドステージ
FROM golang:1.21-alpine AS builder

WORKDIR /app

# 依存関係をコピーしてダウンロード
COPY go.mod go.sum* ./
RUN go mod download

# ソースコードをコピーしてビルド
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# 実行ステージ
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# ビルドステージから実行ファイルをコピー
COPY --from=builder /app/main .

# uploadsディレクトリを作成
RUN mkdir -p ./uploads

EXPOSE 8080

CMD ["./main"]
