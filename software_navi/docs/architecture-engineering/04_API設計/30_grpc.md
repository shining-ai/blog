import AffiliateBanner from '@site/src/components/AffiliateBanner';

# gRPC と Protocol Buffers

## gRPCとは

> Googleが開発した高性能なRPC（Remote Procedure Call）フレームワーク。HTTP/2を通信基盤とし、Protocol Buffersをシリアライズ形式に使用する。

gRPC（Google Remote Procedure Call）は 2015 年に Google がオープンソース化しました。RESTful API がHTTP/1.1とJSONを使うのに対し、gRPC はHTTP/2とProtocol Buffers（proto）を使います。JSONに比べてprobufはバイナリ形式で通信するため、ペイロードサイズが小さく、シリアライズ・デシリアライズが高速です。

最大の特徴は `.proto` ファイルでサービスとメッセージを定義すると、複数言語のクライアント・サーバーコードを自動生成できる点です。型安全性が高く、マイクロサービス間の内部通信に広く使われます。

HTTP/2の特性を活かしたストリーミング（サーバーストリーミング・クライアントストリーミング・双方向ストリーミング）もサポートしています。一方でブラウザからの直接呼び出しには制限があり（grpc-webが必要）、人間が直接読めないバイナリ形式のデバッグにはBloomRPC等のツールが必要です。

## gRPC vs REST の比較

| 観点 | REST + JSON | gRPC + Protobuf |
|------|------------|----------------|
| 通信プロトコル | HTTP/1.1 / HTTP/2 | HTTP/2 必須 |
| シリアライズ | テキスト（JSON） | バイナリ（protobuf） |
| パフォーマンス | 普通 | 高速（小さいペイロード） |
| ブラウザ対応 | ネイティブ | grpc-web が必要 |
| コード生成 | OpenAPI Generator | protoc（標準） |
| ストリーミング | 限定的 | 双方向ストリーミング対応 |
| 学習コスト | 低い | 中程度 |

```protobuf title="Protocol Buffers 定義ファイル（.proto）"
syntax = "proto3";

package user.v1;

option go_package = "github.com/example/user/v1;userv1";

// ユーザーサービスの定義
service UserService {
  // 単項RPC: リクエスト1件 → レスポンス1件
  rpc GetUser(GetUserRequest) returns (User);
  rpc CreateUser(CreateUserRequest) returns (User);

  // サーバーストリーミング: 1リクエスト → ストリームで複数レスポンス
  rpc ListUsers(ListUsersRequest) returns (stream User);

  // クライアントストリーミング: 複数リクエスト → 1レスポンス
  rpc BatchCreateUsers(stream CreateUserRequest) returns (BatchCreateResponse);

  // 双方向ストリーミング: 互いにストリーミング
  rpc Chat(stream ChatMessage) returns (stream ChatMessage);
}

message User {
  int64  id    = 1;
  string name  = 2;
  string email = 3;
  int64  created_at = 4;  // Unix timestamp
}

message GetUserRequest {
  int64 id = 1;
}

message CreateUserRequest {
  string name  = 1;
  string email = 2;
}

message ListUsersRequest {
  int32  limit  = 1;
  int32  offset = 2;
}

message BatchCreateResponse {
  repeated User users   = 1;
  int32 created_count   = 2;
  repeated string errors = 3;
}

message ChatMessage {
  string user_id = 1;
  string content = 2;
  int64  sent_at = 3;
}
```

```python title="gRPC サーバー実装（Python）"
import grpc
from concurrent import futures
# import user_pb2, user_pb2_grpc  # protoc で自動生成される

# 自動生成されたクラスを継承してサービスを実装
class UserServicer:  # user_pb2_grpc.UserServiceServicer を継承
    def __init__(self):
        self._users = {
            1: {"id": 1, "name": "Alice", "email": "alice@example.com"},
        }

    def GetUser(self, request, context):
        user = self._users.get(request.id)
        if not user:
            context.set_code(grpc.StatusCode.NOT_FOUND)
            context.set_details(f"User {request.id} not found")
            return  # user_pb2.User()

        # return user_pb2.User(**user)
        return user  # 実際には protobuf メッセージを返す

    def ListUsers(self, request, context):
        """サーバーストリーミング: ユーザーを1件ずつ返す"""
        for user in self._users.values():
            yield user  # yield で複数レスポンスをストリーミング


def serve():
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    # user_pb2_grpc.add_UserServiceServicer_to_server(UserServicer(), server)
    server.add_insecure_port("[::]:50051")
    server.start()
    print("gRPC server listening on :50051")
    server.wait_for_termination()


# gRPC クライアント呼び出し例
def call_grpc():
    channel = grpc.insecure_channel("localhost:50051")
    # stub = user_pb2_grpc.UserServiceStub(channel)
    # user = stub.GetUser(user_pb2.GetUserRequest(id=1))
    # for user in stub.ListUsers(user_pb2.ListUsersRequest(limit=10)):
    #     print(user.name)
    pass
```

## 使用場面

- マイクロサービス間の高速な内部通信（レイテンシとスループットが重要なとき）
- 多言語環境でのサービス間通信（Go・Python・Java・Node.js のクライアントを自動生成）
- ストリーミングが必要なリアルタイムデータ転送（センサーデータ・ログ転送）

## 参考文献

- gRPC 公式ドキュメント, https://grpc.io/docs/
- Protocol Buffers 言語ガイド, https://protobuf.dev/programming-guides/proto3/

<AffiliateBanner site="software_navi" />
