---
sidebar_position: 4
displayed_sidebar: computerArchitectureSidebar
---

import AffiliateBanner from '@site/src/components/AffiliateBanner';

# 動画コーデックの概要 (Video Codec Overview)

## 動画コーデックとは

動画コーデックとは、

> 時間的冗長性（フレーム間予測）と空間的冗長性（フレーム内変換符号化）を組み合わせて映像を高圧縮する非可逆符号化・復号技術

です。
<br/>

「コーデック」は Coder/Decoder の略で、エンコーダとデコーダの対を指します。
非圧縮 Full HD 映像（1920×1080 @ 30fps）は約 1.5 Gbps のデータレートになりますが、H.264 では数 Mbps に圧縮できます。

## フレーム種別

| フレーム種別 | 略称 | 説明 | 特徴 |
| --- | --- | --- | --- |
| Iフレーム | イントラフレーム | 前後フレームを参照しない完全な1枚 | データ量大・シークポイント |
| Pフレーム | 前方予測フレーム | 直前の I/P フレームとの差分を符号化 | Iより小・デコード依存あり |
| Bフレーム | 双方向予測フレーム | 前後の I/P フレーム両方から予測 | 最小・エンコード遅延が増加 |

## 主要コーデック比較

| コーデック | 正式名 | 圧縮率（H.264比） | 計算コスト | ライセンス | 主な対応環境 |
| --- | --- | --- | --- | --- | --- |
| H.264 | AVC (MPEG-4 Part 10) | 基準 | 低 | 特許ライセンス必要 | ほぼ全デバイス |
| H.265 | HEVC (MPEG-H Part 2) | 約 2x 改善 | 中〜高 | 特許ライセンス必要 | 4K放送・AppleHEVC |
| AV1 | AOMedia Video 1 | 約 2x 改善 | 非常に高 | ロイヤリティフリー | Chrome・Firefox・Netflix |
| VP9 | — | 約 1.5x 改善 | 高 | ロイヤリティフリー | YouTube・Chrome |

## 動き補償

エンコーダはフレームを複数の**マクロブロック**（H.264: 16×16 ピクセル等）に分割し、参照フレームから最も類似するブロックを探索します。

```
現フレームのブロック位置 - 参照フレームの最良マッチ位置 = 動きベクトル (dx, dy)
残差 = 現ブロック - 動きベクトルで参照したブロック
残差を DCT → 量子化 → エントロピー符号化
```

動きベクトルと残差のみを伝送するため大幅なデータ削減が可能です。

## H.264 の主要ツール

| ツール | 説明 |
| --- | --- |
| CABAC | Context-Adaptive Binary Arithmetic Coding。エントロピー符号化として最高効率 |
| CAVLC | Context-Adaptive Variable-Length Coding。CABAC より低演算・Baseline Profile で使用 |
| インループデブロッキングフィルタ | ブロック境界のモスキートノイズを低減しデコードループ内で適用 |
| イントラ予測 | 同一フレーム内の隣接ブロックから予測（9方向の角度予測） |
| サブピクセル動き補償 | 1/4 ピクセル精度の補間により動きベクトルの精度向上 |

## 実装

```c title="libavcodec(FFmpeg) によるデコードサンプル（C）"
#include <stdio.h>
#include <libavcodec/avcodec.h>
#include <libavformat/avformat.h>
#include <libswscale/swscale.h>

int decode_video(const char *filename) {
    AVFormatContext *fmt_ctx = NULL;
    if (avformat_open_input(&fmt_ctx, filename, NULL, NULL) < 0) {
        fprintf(stderr, "ファイルを開けません: %s\n", filename);
        return -1;
    }
    avformat_find_stream_info(fmt_ctx, NULL);

    /* 映像ストリームを探す */
    int video_stream = -1;
    for (unsigned i = 0; i < fmt_ctx->nb_streams; i++) {
        if (fmt_ctx->streams[i]->codecpar->codec_type == AVMEDIA_TYPE_VIDEO) {
            video_stream = (int)i;
            break;
        }
    }
    if (video_stream < 0) { avformat_close_input(&fmt_ctx); return -1; }

    AVCodecParameters *codecpar = fmt_ctx->streams[video_stream]->codecpar;
    const AVCodec *codec = avcodec_find_decoder(codecpar->codec_id);
    AVCodecContext *codec_ctx = avcodec_alloc_context3(codec);
    avcodec_parameters_to_context(codec_ctx, codecpar);
    avcodec_open2(codec_ctx, codec, NULL);

    printf("コーデック : %s\n", codec->long_name);
    printf("解像度     : %dx%d\n", codec_ctx->width, codec_ctx->height);

    AVPacket *pkt   = av_packet_alloc();
    AVFrame  *frame = av_frame_alloc();
    int frame_count = 0;

    while (av_read_frame(fmt_ctx, pkt) >= 0) {
        if (pkt->stream_index == video_stream) {
            avcodec_send_packet(codec_ctx, pkt);
            while (avcodec_receive_frame(codec_ctx, frame) == 0) {
                frame_count++;
                if (frame_count == 1)
                    printf("最初のフレーム PTS: %lld  タイプ: %c\n",
                           (long long)frame->pts,
                           av_get_picture_type_char(frame->pict_type));
            }
        }
        av_packet_unref(pkt);
        if (frame_count >= 30) break;   /* 30 フレームで打ち切り */
    }
    printf("デコードフレーム数: %d\n", frame_count);

    av_frame_free(&frame);
    av_packet_free(&pkt);
    avcodec_free_context(&codec_ctx);
    avformat_close_input(&fmt_ctx);
    return 0;
}

int main(int argc, char *argv[]) {
    if (argc < 2) { fprintf(stderr, "使い方: %s <動画ファイル>\n", argv[0]); return 1; }
    return decode_video(argv[1]);
}
```

```python title="OpenCV / PyAV でフレーム読み取りとコーデック情報取得（Python）"
import cv2
import sys

# --- OpenCV でフレーム読み取り ---
def inspect_video_opencv(path: str, max_frames: int = 10) -> None:
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        print(f"開けません: {path}")
        return

    fourcc_int = int(cap.get(cv2.CAP_PROP_FOURCC))
    fourcc = "".join(chr((fourcc_int >> (8 * i)) & 0xFF) for i in range(4))
    fps    = cap.get(cv2.CAP_PROP_FPS)
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    total  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    print(f"コーデック: {fourcc}")
    print(f"解像度   : {width}x{height}  FPS: {fps:.2f}  総フレーム: {total}")

    for i in range(min(max_frames, total)):
        ret, frame = cap.read()
        if not ret:
            break
        print(f"  フレーム {i:3d}: shape={frame.shape}  dtype={frame.dtype}")

    cap.release()

# --- PyAV でコーデック詳細情報を取得 ---
def inspect_video_pyav(path: str) -> None:
    try:
        import av
        container = av.open(path)
        stream = container.streams.video[0]
        codec_ctx = stream.codec_context

        print(f"\n[PyAV]")
        print(f"コーデック  : {codec_ctx.name} ({codec_ctx.long_name})")
        print(f"解像度      : {codec_ctx.width}x{codec_ctx.height}")
        print(f"ビットレート: {codec_ctx.bit_rate} bps")
        print(f"ピクセルフォーマット: {codec_ctx.pix_fmt}")

        for i, packet in enumerate(container.demux(stream)):
            for frame in packet.decode():
                ptype = frame.pict_type.name  # I / P / B
                print(f"  フレーム {i:3d}: pts={frame.pts}  type={ptype}")
            if i >= 9:
                break
        container.close()
    except ImportError:
        print("PyAV 未インストール: pip install av")

if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "sample.mp4"
    inspect_video_opencv(path)
    inspect_video_pyav(path)
```

## 使用場面

- **ストリーミング（Netflix/YouTube）**: AV1/H.264 で帯域に応じてアダプティブビットレート配信（ABR）
- **ビデオ会議（WebRTC）**: H.264/VP8/VP9 でリアルタイム低遅延エンコード
- **4K 放送**: H.265(HEVC) で HD 比約2倍の圧縮率を実現
- **Blu-ray / 光学メディア**: H.264/H.265 で長時間記録
- **監視カメラ**: H.265 で長期録画ストレージを削減

## 参考文献

<AffiliateBanner site="algorithm_zukan" />
